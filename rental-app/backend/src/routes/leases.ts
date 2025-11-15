import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma, { ensureProfileSeed } from '../lib/prisma';
import { buildInvoicePayload } from '../lib/invoiceService';
import { persistPdf } from '../lib/pdf';
import { sendMail } from '../lib/mailer';
import { signLeaseOnChain } from '../lib/eth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const leaseSchema = z.object({
  propertyId: z.string().optional(),
  property: z
    .object({
      name: z.string().min(1),
      address: z.string().min(1)
    })
    .optional(),
  tenantEmail: z.string().email(),
  tenantEth: z.string().min(42),
  startISO: z.string(),
  endISO: z.string(),
  dueDay: z.number().min(1).max(31),
  monthlyRentEth: z.string(),
  securityDepositEth: z.string(),
  notes: z.string().optional()
});

const paymentSchema = z.object({
  txHash: z.string().min(1),
  amountEth: z.coerce.number().positive()
});

function getChainId() {
  return process.env.CHAIN_ID || '1337';
}

async function recordSimpleReceipt(options: {
  lease: any;
  invoiceId: string;
  amount: Decimal | number | string;
  txHash: string;
}) {
  const { lease, invoiceId, amount, txHash } = options;
  const amountDecimal = amount instanceof Decimal ? amount : new Decimal(amount);
  const chainId = getChainId();
  const nowISO = new Date().toISOString();

  await prisma.invoice.upsert({
    where: { id: invoiceId },
    update: {
      status: 'paid',
      chainId,
      txHash,
      amountEth: amountDecimal
    },
    create: {
      id: invoiceId,
      leaseId: lease.id,
      periodStartISO: lease.startISO,
      periodEndISO: lease.endISO,
      dueISO: lease.startISO,
      amountEth: amountDecimal,
      lateFeeEth: new Decimal(0),
      status: 'paid',
      chainId,
      txHash
    }
  });

  await prisma.receipt.upsert({
    where: { invoiceId },
    update: {
      paidEth: amountDecimal,
      paidAtISO: nowISO,
      chainId,
      txHash
    },
    create: {
      leaseId: lease.id,
      invoiceId,
      paidEth: amountDecimal,
      paidAtISO: nowISO,
      chainId,
      txHash
    }
  });
}

function leaseInclude() {
  return {
    property: true,
    listing: true,
    invoices: true,
    repairs: true,
    receipts: true,
    tenant: true,
    owner: true
  };
}

router.get('/', async (req, res) => {
  const auth = req.auth!;
  const where = auth.role === 'owner' || auth.role === 'admin' ? { ownerId: auth.userId } : { tenantId: auth.userId };
  let leases = await prisma.lease.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: leaseInclude()
  });
  const missingInvoices = leases.filter((lease) => lease.invoices.length === 0);
  if (missingInvoices.length) {
    await ensureProfileSeed();
    const profile = (await prisma.profile.findFirst())!;
    for (const lease of missingInvoices) {
      const payload = buildInvoicePayload(
        {
          id: lease.id,
          startISO: lease.startISO,
          endISO: lease.endISO,
          dueDay: lease.dueDay,
          monthlyRentEth: lease.monthlyRentEth
        },
        profile
      );
      await prisma.invoice.create({
        data: {
          leaseId: lease.id,
          periodStartISO: payload.periodStartISO,
          periodEndISO: payload.periodEndISO,
          dueISO: payload.dueISO,
          amountEth: payload.amountEth,
          lateFeeEth: payload.lateFeeEth
        }
      });
    }
    leases = await prisma.lease.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: leaseInclude()
    });
  }

  let mutated = false;
  for (const lease of leases) {
    const depositBalance = lease.depositBalanceEth ? new Decimal(lease.depositBalanceEth) : new Decimal(0);
    const hasDepositReceipt = lease.receipts.some((receipt: any) => receipt.invoiceId?.startsWith(`deposit-${lease.id}`));
    if (depositBalance.gt(0) && !hasDepositReceipt) {
      await recordSimpleReceipt({
        lease,
        invoiceId: `deposit-${lease.id}`,
        amount: lease.securityDepositEth,
        txHash: 'manual-sync'
      });
      mutated = true;
    }
  }

  if (mutated) {
    leases = await prisma.lease.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: leaseInclude()
    });
  }
  res.json(leases);
});

router.get('/:id', async (req, res) => {
  const auth = req.auth!;
  const lease = await prisma.lease.findUnique({
    where: { id: req.params.id },
    include: leaseInclude()
  });
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  if (auth.userId !== lease.ownerId && auth.userId !== lease.tenantId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  res.json(lease);
});

router.post('/', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return res.status(403).json({ message: 'Only owners can create leases' });
  }
  const parsed = leaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const payload = parsed.data;

  let propertyId = payload.propertyId;
  if (!propertyId && payload.property) {
    const property = await prisma.property.create({
      data: {
        name: payload.property.name,
        address: payload.property.address,
        ownerId: auth.userId
      }
    });
    propertyId = property.id;
  }
  if (!propertyId) return res.status(400).json({ message: 'propertyId required' });

  const tenant = await prisma.user.upsert({
    where: { email: payload.tenantEmail },
    update: { role: 'tenant', ethAddr: payload.tenantEth },
    create: { email: payload.tenantEmail, role: 'tenant', ethAddr: payload.tenantEth }
  });

  const monthlyRent = new Decimal(payload.monthlyRentEth);
  const deposit = new Decimal(payload.securityDepositEth);
  const annualRent = monthlyRent.mul(12);

  const lease = await prisma.lease.create({
    data: {
      propertyId,
      ownerId: auth.userId,
      tenantId: tenant.id,
      tenantEth: payload.tenantEth,
      ownerSignedAt: new Date(),
      startISO: payload.startISO,
      endISO: payload.endISO,
      dueDay: payload.dueDay,
      monthlyRentEth: monthlyRent,
      annualRentEth: annualRent,
      securityDepositEth: deposit,
      depositBalanceEth: new Decimal(0),
      notes: payload.notes,
      status: 'pending'
    }
  });

  await ensureProfileSeed();
  const profile = (await prisma.profile.findFirst())!;
  const invoicePayload = buildInvoicePayload(
    {
      id: lease.id,
      startISO: lease.startISO,
      endISO: lease.endISO,
      dueDay: lease.dueDay,
      monthlyRentEth: lease.monthlyRentEth
    },
    profile
  );

  await prisma.invoice.create({
    data: {
      leaseId: lease.id,
      periodStartISO: invoicePayload.periodStartISO,
      periodEndISO: invoicePayload.periodEndISO,
      dueISO: invoicePayload.dueISO,
      amountEth: invoicePayload.amountEth,
      lateFeeEth: invoicePayload.lateFeeEth
    }
  });

  await sendMail({
    to: tenant.email,
    subject: 'New lease awaiting signature',
    body: `You have a new lease ready for review. Lease ID: ${lease.id}`
  });

  res.status(201).json({ id: lease.id });
});

router.patch('/:id', async (req, res) => {
  const auth = req.auth!;
  const lease = await prisma.lease.findUnique({ where: { id: req.params.id } });
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  if (auth.userId !== lease.ownerId) return res.status(403).json({ message: 'Only owner can update' });

  const update = await prisma.lease.update({
    where: { id: lease.id },
    data: {
      txHash: req.body.txHash ?? lease.txHash,
      chainId: req.body.chainId ?? lease.chainId,
      termsHash: req.body.termsHash ?? lease.termsHash,
      status: req.body.status ?? lease.status
    }
  });
  res.json(update);
});

router.post('/:id/pdf', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'PDF required' });
  const lease = await prisma.lease.findUnique({ where: { id: req.params.id } });
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  if (req.auth?.userId !== lease.ownerId) return res.status(403).json({ message: 'Only owner can upload lease PDF' });
  const pdfPath = await persistPdf(req.file.buffer, 'leases');
  await prisma.lease.update({ where: { id: lease.id }, data: { pdfPath } });
  res.json({ pdfPath });
});

router.get('/:id/invoices', async (req, res) => {
  const lease = await prisma.lease.findUnique({ where: { id: req.params.id }, include: { invoices: true } });
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  if (req.auth?.userId !== lease.ownerId && req.auth?.userId !== lease.tenantId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  res.json(lease.invoices);
});

router.patch('/:id/autopay', async (req, res) => {
  const lease = await prisma.lease.findUnique({ where: { id: req.params.id } });
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  if (req.auth?.userId !== lease.tenantId) return res.status(403).json({ message: 'Only tenant can toggle autopay' });
  const autopay = Boolean(req.body.autopay);
  const updated = await prisma.lease.update({ where: { id: lease.id }, data: { autopayEnabled: autopay } });
  res.json(updated);
});

router.post('/:id/sign', async (req, res) => {
  const lease = await prisma.lease.findUnique({ where: { id: req.params.id } });
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  const userId = req.auth?.userId;
  if (userId !== lease.ownerId && userId !== lease.tenantId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const now = new Date();
  const data: Record<string, any> = {};
  if (userId === lease.ownerId) {
    data.ownerSignedAt = now;
  }
  if (userId === lease.tenantId) {
    data.tenantSignedAt = now;
    data.status = lease.status === 'pending' ? 'signed' : lease.status;
    if (lease.chainLeaseId) {
      await signLeaseOnChain(lease.chainLeaseId, lease.tenantEth);
      data.signedAt = now;
    }
  }

  const updated = await prisma.lease.update({
    where: { id: lease.id },
    data
  });

  res.json(updated);
});

router.post('/:id/pay/deposit', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'tenant') {
    return res.status(403).json({ message: 'Only tenants can report payments' });
  }
  const lease = await prisma.lease.findUnique({ where: { id: req.params.id } });
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  if (lease.tenantId !== auth.userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  console.info('Deposit payment logged', {
    leaseId: lease.id,
    txHash: parsed.data.txHash,
    amountEth: parsed.data.amountEth
  });

  await recordSimpleReceipt({
    lease,
    invoiceId: `deposit-${lease.id}`,
    amount: lease.securityDepositEth,
    txHash: parsed.data.txHash
  });

  const updated = await prisma.lease.update({
    where: { id: lease.id },
    data: {
      status: lease.status === 'signed' ? 'deposit_paid' : lease.status,
      depositBalanceEth: lease.securityDepositEth
    }
  });

  res.json({ message: 'Deposit logged', lease: updated });
});

router.post('/:id/pay/annual', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'tenant') {
    return res.status(403).json({ message: 'Only tenants can report payments' });
  }
  const lease = await prisma.lease.findUnique({ where: { id: req.params.id } });
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  if (lease.tenantId !== auth.userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  console.info('Annual rent payment logged', {
    leaseId: lease.id,
    txHash: parsed.data.txHash,
    amountEth: parsed.data.amountEth
  });

  await recordSimpleReceipt({
    lease,
    invoiceId: `annual-${lease.id}-${Date.now()}`,
    amount: lease.annualRentEth,
    txHash: parsed.data.txHash
  });

  const updated = await prisma.lease.update({
    where: { id: lease.id },
    data: {
      status: 'active'
    }
  });

  res.json({ message: 'Annual payment logged', lease: updated });
});

export default router;
