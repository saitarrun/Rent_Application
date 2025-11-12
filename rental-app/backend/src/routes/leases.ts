import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import prisma, { ensureProfileSeed } from '../lib/prisma';
import { sendMail } from '../lib/mailer';
import { persistPdf } from '../lib/pdf';
import { buildInvoicePayload } from '../lib/invoiceService';
import { Decimal } from '@prisma/client/runtime/library';

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

router.get('/', async (req, res) => {
  const auth = req.auth!;
  const where = auth.role === 'owner' || auth.role === 'admin' ? { ownerId: auth.userId } : { tenantId: auth.userId };
  const leases = await prisma.lease.findMany({
    where,
    include: {
      property: true,
      invoices: true,
      repairs: true,
      receipts: true,
      tenant: true,
      owner: true
    }
  });
  res.json(leases);
});

router.get('/:id', async (req, res) => {
  const auth = req.auth!;
  const lease = await prisma.lease.findUnique({
    where: { id: req.params.id },
    include: {
      property: true,
      invoices: true,
      repairs: true,
      receipts: true,
      tenant: true,
      owner: true
    }
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
      monthlyRentEth: new Decimal(payload.monthlyRentEth),
      securityDepositEth: new Decimal(payload.securityDepositEth),
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
    body: `You have a new lease for property ${propertyId}.`
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

router.get('/:id/repairs', async (req, res) => {
  const lease = await prisma.lease.findUnique({ where: { id: req.params.id }, include: { repairs: true } });
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  if (req.auth?.userId !== lease.ownerId && req.auth?.userId !== lease.tenantId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  res.json(lease.repairs);
});

router.post('/:id/repairs', async (req, res) => {
  const lease = await prisma.lease.findUnique({ where: { id: req.params.id } });
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  if (req.auth?.userId !== lease.tenantId) return res.status(403).json({ message: 'Only tenant can file repair' });
  const parsed = z
    .object({
      title: z.string().min(1),
      detail: z.string().min(1),
      priority: z.enum(['low', 'normal', 'high']).default('normal'),
      category: z.string().default('general'),
      preferredWindow: z.string().optional()
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const repair = await prisma.repair.create({ data: { leaseId: lease.id, ...parsed.data } });
  res.status(201).json(repair);
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
    data.status = 'active';
  }

  const updated = await prisma.lease.update({
    where: { id: lease.id },
    data,
    include: {
      property: true,
      invoices: true,
      repairs: true,
      receipts: true,
      tenant: true,
      owner: true
    }
  });

  res.json(updated);
});

export default router;
