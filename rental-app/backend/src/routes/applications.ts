import { Router } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma, { ensureProfileSeed } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { createLeaseOnChain } from '../lib/eth';
import { buildInvoicePayload } from '../lib/invoiceService';

const router = Router();
router.use(requireAuth);

const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

const occupantSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().optional(),
  age: z.number().int().positive().optional()
});

const documentSchema = z
  .object({
    name: z.string().min(1),
    type: z.string().optional(),
    size: z.number().int().nonnegative().optional(),
    data: z.string().min(1)
  })
  .refine((doc) => {
    if (!doc.data) return false;
    try {
      const buffer = Buffer.from(doc.data, 'base64');
      return buffer.length <= MAX_DOCUMENT_SIZE;
    } catch (err) {
      return false;
    }
  }, 'Document must be valid base64 under 5MB');

const detailsSchema = z.object({
  legalName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(4),
  birthDate: z.string().optional(),
  preferredMoveIn: z.string().optional(),
  employmentStatus: z.string().min(1),
  employerName: z.string().optional(),
  annualIncome: z.number().nonnegative(),
  monthlyIncome: z.number().nonnegative().optional(),
  creditScore: z.number().int().min(300).max(850).optional(),
  occupants: z.array(occupantSchema).default([]),
  notes: z.string().optional()
});

const createSchema = z.object({
  listingId: z.string(),
  message: z.string().optional(),
  details: detailsSchema,
  documents: z.array(documentSchema).max(5).optional()
});

function serialize(app: any) {
  return {
    id: app.id,
    leaseId: app.leaseId ?? null,
    listing: app.listing
      ? {
          id: app.listing.id,
          title: app.listing.title,
          city: app.listing.city,
          state: app.listing.state,
          rentEth: app.listing.rentEth
        }
      : null,
    applicantEmail: app.applicantEmail,
    applicantName: app.applicantName,
    wallet: app.wallet,
    message: app.message,
    status: app.status,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    details: app.detailsJson ?? null,
    documents: app.documentsJson ?? []
  };
}

router.post('/', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'tenant') {
    return res.status(403).json({ message: 'Only tenants can apply' });
  }
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }

  const listing = await prisma.listing.findUnique({
    where: { id: parsed.data.listingId }
  });
  if (!listing || !listing.available) {
    return res.status(404).json({ message: 'Listing unavailable' });
  }
  const applicant = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!applicant?.ethAddr) {
    return res.status(400).json({ message: 'Wallet required to apply' });
  }

  const documents = parsed.data.documents ?? [];
  const details = parsed.data.details;
  const applicantName = details.legalName?.trim() || applicant.email.split('@')[0] || 'Tenant';
  const applicantEmail = details.email || applicant.email;
  const application = await prisma.application.create({
    data: {
      listingId: listing.id,
      applicantId: auth.userId,
      applicantEmail,
      applicantName,
      applicantPhone: details.phone,
      wallet: applicant.ethAddr,
      message: parsed.data.message ?? details.notes,
      status: 'submitted',
      detailsJson: details,
      documentsJson: documents
    },
    include: { listing: true }
  });

  res.status(201).json(serialize(application));
});

router.get('/', async (req, res) => {
  const auth = req.auth!;
  const where =
    auth.role === 'tenant'
      ? { applicantId: auth.userId }
      : { listing: { ownerId: auth.userId } };
  const applications = await prisma.application.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { listing: true }
  });
  res.json(applications.map(serialize));
});

router.patch('/:id/approve', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner') {
    return res.status(403).json({ message: 'Only owners can approve' });
  }
  const application = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: { listing: true, applicant: true }
  });
  if (!application || !application.listing) {
    return res.status(404).json({ message: 'Application not found' });
  }
  if (application.listing.ownerId !== auth.userId) {
    return res.status(403).json({ message: 'Listing owner mismatch' });
  }
  if (!application.wallet) {
    return res.status(400).json({ message: 'Applicant wallet missing' });
  }

  const monthlyRent = new Decimal(application.listing.rentEth ?? 0);
  if (monthlyRent.lte(0)) {
    return res.status(400).json({ message: 'Listing rent missing' });
  }
  const depositEth = monthlyRent;
  const annualRent = monthlyRent.mul(12);
  const startUnix = Math.floor(Date.now() / 1000);
  const endUnix = startUnix + 365 * 24 * 60 * 60;

  const chain = await createLeaseOnChain({
    tenantWallet: application.wallet,
    annualRentEth: Number(annualRent.toString()),
    depositEth: Number(depositEth.toString()),
    startUnix,
    endUnix
  });

  let propertyId = application.listing.propertyId;
  if (!propertyId) {
    const property = await prisma.property.create({
      data: {
        ownerId: auth.userId,
        name: application.listing.title,
        address: `${application.listing.address1}, ${application.listing.city}, ${application.listing.state}`
      }
    });
    propertyId = property.id;
  }

  const tenant =
    application.applicant ??
    (await prisma.user.upsert({
      where: { email: application.applicantEmail },
      update: { role: 'tenant', ethAddr: application.wallet },
      create: { email: application.applicantEmail, role: 'tenant', ethAddr: application.wallet }
    }));

  const lease = await prisma.lease.create({
    data: {
      id: String(chain.chainLeaseId),
      chainLeaseId: chain.chainLeaseId,
      listingId: application.listing.id,
      propertyId: propertyId!,
      tenantId: tenant.id,
      ownerId: auth.userId,
      tenantEth: application.wallet,
      chainId: chain.chainId,
      txHash: chain.txHash,
      startISO: new Date(startUnix * 1000).toISOString(),
      endISO: new Date(endUnix * 1000).toISOString(),
      annualRentEth: annualRent,
      monthlyRentEth: monthlyRent,
      securityDepositEth: depositEth,
      depositBalanceEth: new Decimal(0),
      notes: application.message,
      status: 'pending',
      dueDay: 1
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

  await prisma.listing.update({
    where: { id: application.listing.id },
    data: { propertyId, available: false }
  });

  const updatedApplication = await prisma.application.update({
    where: { id: application.id },
    data: { status: 'approved', leaseId: lease.id },
    include: { listing: true }
  });

  console.info('Lease approved', {
    applicationId: application.id,
    leaseId: lease.id,
    listingId: application.listing.id,
    ownerId: auth.userId,
    tenantId: tenant.id
  });

  res.json({
    application: serialize(updatedApplication),
    lease
  });
});

router.patch('/:id/reject', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner') {
    return res.status(403).json({ message: 'Only owners can reject' });
  }
  const application = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: { listing: true }
  });
  if (!application || application.listing?.ownerId !== auth.userId) {
    return res.status(404).json({ message: 'Application not found' });
  }

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: { status: 'rejected' },
    include: { listing: true }
  });

  res.json(serialize(updated));
});

export default router;
