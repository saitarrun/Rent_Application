import fs from 'fs/promises';
import path from 'path';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { fetchRepliersListings } from '../lib/repliers';

const router = Router();
const DEV_SEED_PATH = path.join(__dirname, '..', 'data', 'listings.json');

router.use(requireAuth);

const listingSchema = z.object({
  title: z.string().min(1),
  address1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().optional(),
  beds: z.number().int().positive(),
  baths: z.number().nonnegative().optional(),
  sqft: z.number().int().nonnegative().optional(),
  amenities: z.string().optional(),
  photoUrl: z.string().optional(),
  externalUrl: z.string().optional(),
  rentEth: z.number().positive(),
  available: z.boolean().optional(),
  propertyId: z.string().optional()
});

router.get('/', async (req, res) => {
  const auth = req.auth!;
  const where: Record<string, any> =
    auth.role === 'owner'
      ? { ownerId: auth.userId }
      : { available: true };
  if (req.query.city && typeof req.query.city === 'string') {
    where.city = { contains: req.query.city };
  }
  const rows = await prisma.listing.findMany({
    where,
    orderBy: { updatedAt: 'desc' }
  });
  res.json(rows);
});

router.post('/', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner') {
    return res.status(403).json({ message: 'Only owners can create listings' });
  }
  const parsed = listingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  const listing = await prisma.listing.create({
    data: {
      ownerId: auth.userId,
      title: parsed.data.title,
      address1: parsed.data.address1,
      city: parsed.data.city,
      state: parsed.data.state,
      postalCode: parsed.data.postalCode,
      beds: parsed.data.beds,
      baths: parsed.data.baths,
      sqft: parsed.data.sqft,
      amenities: parsed.data.amenities,
      photoUrl: parsed.data.photoUrl,
      externalUrl: parsed.data.externalUrl,
      rentEth: new Decimal(parsed.data.rentEth),
      available: parsed.data.available ?? true,
      propertyId: parsed.data.propertyId
    }
  });
  res.status(201).json(listing);
});

router.patch('/:id', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner') {
    return res.status(403).json({ message: 'Only owners can edit listings' });
  }
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
  if (!listing || listing.ownerId !== auth.userId) {
    return res.status(404).json({ message: 'Listing not found' });
  }
  const parsed = listingSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      ...parsed.data,
      rentEth: parsed.data.rentEth !== undefined ? new Decimal(parsed.data.rentEth) : listing.rentEth
    }
  });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner') {
    return res.status(403).json({ message: 'Only owners can delete listings' });
  }
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
  if (!listing || listing.ownerId !== auth.userId) {
    return res.status(404).json({ message: 'Listing not found' });
  }
  await prisma.listing.delete({ where: { id: listing.id } });
  res.status(204).end();
});

async function upsertListings(req: Request, res: Response) {
  const auth = req.auth!;
  if (auth.role !== 'owner') {
    return res.status(403).json({ message: 'Only owners can sync listings' });
  }

  const listings = await fetchRepliersListings();
  let synced = 0;

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { id: listing.id },
      update: {
        ownerId: auth.userId,
        title: listing.title,
        address1: listing.address1,
        city: listing.city,
        state: listing.state,
        postalCode: listing.postalCode,
        beds: listing.bedrooms ?? 1,
        baths: listing.bathrooms ?? undefined,
        sqft: listing.sqft,
        photoUrl: listing.photoUrl,
        rentEth: listing.rentEth ? new Decimal(listing.rentEth) : undefined,
        available: listing.available
      },
      create: {
        id: listing.id,
        ownerId: auth.userId,
        title: listing.title,
        address1: listing.address1,
        city: listing.city,
        state: listing.state,
        postalCode: listing.postalCode,
        beds: listing.bedrooms ?? 1,
        baths: listing.bathrooms ?? undefined,
        sqft: listing.sqft ?? undefined,
        amenities: undefined,
        photoUrl: listing.photoUrl ?? undefined,
        rentEth: listing.rentEth ? new Decimal(listing.rentEth) : new Decimal(0),
        available: listing.available ?? true,
        source: 'feed'
      }
    });
    synced += 1;
  }

  return res.json({ synced });
}

router.post('/sync', upsertListings);
router.post('/refresh', upsertListings);

router.post('/seed-dev', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner') {
    return res.status(403).json({ message: 'Only owners can seed listings' });
  }

  try {
    const payloadRaw = await fs.readFile(DEV_SEED_PATH, 'utf-8');
    const records = JSON.parse(payloadRaw);
    if (!Array.isArray(records)) {
      return res.status(400).json({ message: 'Seed file must contain an array' });
    }

    let seeded = 0;
    for (const record of records) {
      if (!record) continue;
      const listing = {
        id: String(record.id ?? `seed-${seeded + 1}`),
        title: String(record.title ?? 'Untitled listing'),
        address1: String(record.address1 ?? record.address ?? 'Unknown address'),
        city: String(record.city ?? ''),
        state: String(record.state ?? ''),
        postalCode: String(record.postalCode ?? ''),
        beds: Number(record.bedrooms ?? record.beds ?? 1),
        baths: record.bathrooms ?? record.baths ?? undefined,
        sqft: record.sqft ?? undefined,
        photoUrl: record.photoUrl ?? undefined,
        rentEth: Number(record.rentEth ?? 0),
        available: Boolean(record.available ?? true)
      };

      await prisma.listing.upsert({
        where: { id: listing.id },
        update: {
          ownerId: auth.userId,
          title: listing.title,
          address1: listing.address1,
          city: listing.city,
          state: listing.state,
          postalCode: listing.postalCode,
          beds: listing.beds,
          baths: listing.baths,
          sqft: listing.sqft,
          photoUrl: listing.photoUrl,
          rentEth: new Decimal(listing.rentEth),
          available: listing.available
        },
        create: {
          ...listing,
          ownerId: auth.userId,
          rentEth: new Decimal(listing.rentEth)
        }
      });
      seeded += 1;
    }

    return res.json({ seeded });
  } catch (error) {
    console.error('Failed to seed listings', error);
    return res.status(500).json({ message: 'Failed to seed listings' });
  }
});

export default router;
