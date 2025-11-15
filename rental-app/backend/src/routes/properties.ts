import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { mustBePropertyOwner } from '../middleware/acl';
import { Decimal } from '@prisma/client/runtime/library';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const propertySchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1)
});

router.get('/', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return res.status(403).json({ message: 'Only owners can view properties' });
  }
  const properties = await prisma.property.findMany({
    where: { ownerId: auth.userId },
    orderBy: { createdAt: 'desc' }
  });
  res.json(properties);
});

router.post('/', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return res.status(403).json({ message: 'Only owners can create properties' });
  }
  const parsed = propertySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  const property = await prisma.property.create({
    data: {
      ownerId: auth.userId,
      name: parsed.data.name,
      address: parsed.data.address
    }
  });
  res.status(201).json(property);
});

router.patch('/:id', mustBePropertyOwner, async (req, res) => {
  const parsed = propertySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  const property = await prisma.property.update({
    where: { id: req.params.id },
    data: parsed.data
  });
  res.json(property);
});

router.get('/:id/ledger', mustBePropertyOwner, async (req, res) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: {
      leases: {
        include: {
          invoices: true,
          receipts: true
        }
      }
    }
  });
  if (!property) return res.status(404).json({ message: 'Property not found' });

  const ledger = property.leases.map((lease) => {
    const outstanding = lease.invoices
      .filter((invoice) => invoice.status !== 'paid')
      .reduce((acc, invoice) => acc.add(new Decimal(invoice.amountEth)), new Decimal(0));
    const collected = lease.receipts.reduce((acc, receipt) => acc.add(new Decimal(receipt.paidEth)), new Decimal(0));
    return {
      leaseId: lease.id,
      tenantId: lease.tenantId,
      outstandingEth: outstanding.toFixed(6),
      collectedEth: collected.toFixed(6),
      depositBalanceEth: lease.depositBalanceEth ? new Decimal(lease.depositBalanceEth).toFixed(6) : '0'
    };
  });

  return res.json({ property: { id: property.id, name: property.name, address: property.address }, ledger });
});

export default router;
