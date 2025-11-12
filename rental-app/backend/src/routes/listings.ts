import { Router } from 'express';
import prisma from '../lib/prisma';
import { importListingsForOwner } from '../lib/listings';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router();

router.get('/', async (req, res) => {
  const { city, available } = req.query;
  const filters: any = {};
  if (city && typeof city === 'string') filters.city = { contains: city };
  if (available === 'true') filters.available = true;
  if (available === 'false') filters.available = false;
  const listings = await prisma.listing.findMany({ where: filters, orderBy: { createdAt: 'desc' } });
  res.json(listings);
});

router.post('/refresh', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return res.status(403).json({ message: 'Only owners can refresh listings' });
  }
  const imported = await importListingsForOwner(auth.userId);
  res.json({ imported });
});

router.patch('/:id', async (req, res) => {
  const auth = req.auth!;
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  if (auth.role !== 'owner' || listing.ownerId !== auth.userId) {
    return res.status(403).json({ message: 'Not listing owner' });
  }
  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      available: typeof req.body.available === 'boolean' ? req.body.available : listing.available,
      rentEth: req.body.rentEth ? new Decimal(req.body.rentEth) : listing.rentEth
    }
  });
  res.json(updated);
});

export default router;
