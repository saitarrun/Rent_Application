import { Router } from 'express';
import { z } from 'zod';
import dayjs from 'dayjs';
import prisma, { ensureProfileSeed } from '../lib/prisma';
import { buildInvoicePayload, nextPeriodStart } from '../lib/invoiceService';

const router = Router();

router.get('/:id', async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { lease: { select: { ownerId: true, tenantId: true, propertyId: true } } }
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  if (req.auth?.userId !== invoice.lease.ownerId && req.auth?.userId !== invoice.lease.tenantId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  res.json(invoice);
});

router.post('/generate-due', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return res.status(403).json({ message: 'Only owners or admins can generate invoices' });
  }
  const leaseFilter =
    req.body?.leaseId && auth.role !== 'admin'
      ? { id: req.body.leaseId, ownerId: auth.userId }
      : req.body?.leaseId && auth.role === 'admin'
      ? { id: req.body.leaseId }
      : auth.role === 'admin'
      ? {}
      : { ownerId: auth.userId };
  const leases = await prisma.lease.findMany({ where: leaseFilter as any, include: { invoices: true } });
  await ensureProfileSeed();
  const profile = (await prisma.profile.findFirst())!;
  const createdInvoices = [] as string[];

  for (const lease of leases) {
    const lastInvoice = lease.invoices.sort((a, b) => (a.periodStartISO > b.periodStartISO ? -1 : 1))[0];
    const startISO = lastInvoice ? nextPeriodStart(lastInvoice.periodStartISO).toISOString() : lease.startISO;
    if (dayjs(startISO).isAfter(dayjs(lease.endISO))) continue;
    const payload = buildInvoicePayload(
      {
        id: lease.id,
        startISO: startISO,
        endISO: lease.endISO,
        dueDay: lease.dueDay,
        monthlyRentEth: lease.monthlyRentEth
      },
      profile,
      startISO
    );
    const invoice = await prisma.invoice.create({
      data: {
        leaseId: lease.id,
        periodStartISO: payload.periodStartISO,
        periodEndISO: payload.periodEndISO,
        dueISO: payload.dueISO,
        amountEth: payload.amountEth,
        lateFeeEth: payload.lateFeeEth
      }
    });
    createdInvoices.push(invoice.id);
  }

  res.json({ created: createdInvoices });
});

router.post('/:id/pay-init', async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { lease: true }
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  if (invoice.lease.tenantId !== req.auth?.userId) return res.status(403).json({ message: 'Forbidden' });
  res.json({
    leaseId: invoice.leaseId,
    amountEth: invoice.amountEth,
    periodStartISO: invoice.periodStartISO,
    periodEndISO: invoice.periodEndISO,
    dueISO: invoice.dueISO,
    chainId: invoice.chainId || invoice.lease.chainId || '1337'
  });
});

const reconcileSchema = z.object({
  txHash: z.string().min(10),
  chainId: z.string(),
  paidEth: z.string()
});

router.patch('/:id/reconcile', async (req, res) => {
  const parse = reconcileSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.flatten());
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  const lease = await prisma.lease.findUnique({ where: { id: invoice.leaseId } });
  if (!lease) return res.status(404).json({ message: 'Lease missing' });
  if (lease.tenantId !== req.auth?.userId) return res.status(403).json({ message: 'Forbidden' });

  if (invoice.status === 'paid') return res.status(200).json(invoice);

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: 'paid', chainId: parse.data.chainId, txHash: parse.data.txHash }
  });
  const receipt = await prisma.receipt.create({
    data: {
      leaseId: invoice.leaseId,
      invoiceId: invoice.id,
      paidEth: parse.data.paidEth,
      paidAtISO: new Date().toISOString(),
      chainId: parse.data.chainId,
      txHash: parse.data.txHash
    }
  });
  res.json({ invoice: updated, receipt });
});

export default router;
