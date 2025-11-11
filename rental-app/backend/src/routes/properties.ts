import { Router } from 'express';
import prisma from '../lib/prisma';
import { mustBePropertyOwner } from '../middleware/acl';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router();

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
      collectedEth: collected.toFixed(6)
    };
  });

  return res.json({ property: { id: property.id, name: property.name, address: property.address }, ledger });
});

export default router;
