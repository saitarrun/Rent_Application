import { Router } from 'express';
import { z } from 'zod';
import prisma, { ensureProfileSeed } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { buildInvoicePayload } from '../lib/invoiceService';

const router = Router();

const applicationSchema = z.object({
  listingId: z.string(),
  message: z.string().optional(),
  phone: z.string().optional()
});

router.get('/', async (req, res) => {
  const auth = req.auth!;
  if (auth.role === 'owner' || auth.role === 'admin') {
    const applications = await prisma.application.findMany({
      where: { listing: { ownerId: auth.userId } },
      include: { listing: true, applicant: true }
    });
    return res.json(applications);
  }
  const applications = await prisma.application.findMany({
    where: { applicantId: auth.userId },
    include: { listing: true }
  });
  res.json(applications);
});

router.post('/', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'tenant' && auth.role !== 'admin') {
    return res.status(403).json({ message: 'Only tenants can submit applications' });
  }
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
  if (!listing || !listing.available) return res.status(404).json({ message: 'Listing unavailable' });

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user?.ethAddr) return res.status(400).json({ message: 'Wallet required' });

  const application = await prisma.application.create({
    data: {
      listingId: listing.id,
      applicantId: auth.userId,
      applicantEmail: user.email,
      applicantName: user.email.split('@')[0],
      applicantPhone: parsed.data.phone,
      wallet: user.ethAddr,
      message: parsed.data.message
    }
  });
  res.status(201).json(application);
});

const updateSchema = z.object({
  status: z.enum(['submitted', 'reviewing', 'approved', 'rejected']).optional()
});

router.patch('/:id', async (req, res) => {
  const auth = req.auth!;
  const application = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: { listing: true }
  });
  if (!application) return res.status(404).json({ message: 'Application not found' });
  if (auth.role !== 'owner' || application.listing.ownerId !== auth.userId) {
    return res.status(403).json({ message: 'Not authorized for this application' });
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  if (parsed.data.status === 'approved' && application.status !== 'approved') {
    await approveApplication(application.id);
  }

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: { status: parsed.data.status }
  });
  res.json(updated);
});

async function approveApplication(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { listing: true, applicant: true }
  });
  if (!application) return;
  const listing = application.listing;
  const ownerId = listing.ownerId;

  let propertyId = listing.propertyId;
  if (!propertyId) {
    const property = await prisma.property.create({
      data: {
        ownerId,
        name: listing.title,
        address: `${listing.address}, ${listing.city}, ${listing.state}`
      }
    });
    propertyId = property.id;
    await prisma.listing.update({ where: { id: listing.id }, data: { propertyId, available: false } });
  }

  let tenantId = application.applicantId;
  if (!tenantId) {
    const tenant = await prisma.user.upsert({
      where: { email: application.applicantEmail },
      update: { role: 'tenant', ethAddr: application.wallet },
      create: { email: application.applicantEmail, role: 'tenant', ethAddr: application.wallet }
    });
    tenantId = tenant.id;
  }

  const lease = await prisma.lease.create({
    data: {
      propertyId: propertyId!,
      ownerId,
      tenantId: tenantId!,
      tenantEth: application.wallet,
      ownerSignedAt: new Date(),
      startISO: new Date().toISOString(),
      endISO: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      dueDay: 1,
      monthlyRentEth: new Decimal(listing.rentEth),
      securityDepositEth: new Decimal(listing.rentEth),
      notes: application.message,
      status: 'pending'
    }
  });

  await ensureProfileSeed();
  const profile = await prisma.profile.findFirst();
  if (profile) {
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
  }
}

export default router;
