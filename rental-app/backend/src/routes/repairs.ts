import { Router } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requestRepairOnChain, setRepairStatusOnChain } from '../lib/eth';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  title: z.string().min(1),
  detail: z.string().optional(),
  costEth: z.number().nonnegative().optional()
});

const updateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  costEth: z.number().nonnegative().optional()
});

async function authorizeLease(leaseId: string) {
  return prisma.lease.findUnique({
    where: { id: leaseId },
    select: { id: true, ownerId: true, tenantId: true, chainLeaseId: true }
  });
}

router.get('/:leaseId', async (req, res) => {
  const auth = req.auth!;
  const lease = await authorizeLease(req.params.leaseId);
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  if (auth.role !== 'owner' && lease.tenantId !== auth.userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const repairs = await prisma.repair.findMany({
    where: { leaseId: lease.id },
    orderBy: { createdAt: 'desc' }
  });
  res.json(repairs);
});

router.post('/:leaseId', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'tenant') {
    return res.status(403).json({ message: 'Only tenants can submit repairs' });
  }
  const lease = await authorizeLease(req.params.leaseId);
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  if (lease.tenantId !== auth.userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  let repair = await prisma.repair.create({
    data: {
      leaseId: lease.id,
      title: parsed.data.title,
      detail: parsed.data.detail,
      costEth: parsed.data.costEth ? new Decimal(parsed.data.costEth) : undefined
    }
  });
  if (lease.chainLeaseId) {
    try {
      const chain = await requestRepairOnChain(lease.chainLeaseId, parsed.data.title, parsed.data.costEth);
      repair = await prisma.repair.update({
        where: { id: repair.id },
        data: {
          chainRequestId: chain.reqId,
          chainTxHash: chain.txHash
        }
      });
    } catch (error) {
      console.warn('requestRepairOnChain failed', error);
    }
  }
  res.status(201).json(repair);
});

async function deductDepositForRepair(repairId: string, cost: Decimal) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.repair.findUnique({
      where: { id: repairId },
      include: { lease: { select: { id: true, depositBalanceEth: true } } }
    });
    if (!current) {
      throw new Error(`Repair ${repairId} missing during deposit deduction`);
    }
    const remaining = current.lease.depositBalanceEth ? new Decimal(current.lease.depositBalanceEth) : new Decimal(0);
    if (remaining.lte(0) || cost.lte(0)) {
      return current;
    }
    const deduction = Decimal.min(remaining, cost);
    if (deduction.lte(0)) return current;
    await tx.lease.update({
      where: { id: current.leaseId },
      data: { depositBalanceEth: remaining.sub(deduction) }
    });
    return tx.repair.update({
      where: { id: current.id },
      data: { deductedEth: deduction, deductedAt: new Date() }
    });
  });
}

router.patch('/:id', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner') {
    return res.status(403).json({ message: 'Only owners can update repairs' });
  }
  const repair = await prisma.repair.findUnique({
    where: { id: req.params.id },
    include: { lease: { select: { ownerId: true, chainLeaseId: true } } }
  });
  if (!repair) return res.status(404).json({ message: 'Repair not found' });
  if (repair.lease.ownerId !== auth.userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const data: Record<string, any> = { status: parsed.data.status };
  if (parsed.data.costEth !== undefined) {
    data.costEth = new Decimal(parsed.data.costEth);
  }
  let updated = await prisma.repair.update({
    where: { id: repair.id },
    data
  });
  if (
    (parsed.data.status === 'resolved' || parsed.data.status === 'closed') &&
    !updated.deductedAt &&
    updated.costEth
  ) {
    await deductDepositForRepair(repair.id, new Decimal(updated.costEth));
    updated = await prisma.repair.findUniqueOrThrow({ where: { id: repair.id } });
  }
  if (repair.chainRequestId && repair.lease.chainLeaseId) {
    try {
      await setRepairStatusOnChain(repair.lease.chainLeaseId, repair.chainRequestId, parsed.data.status);
    } catch (error) {
      console.warn('setRepairStatusOnChain failed', error);
    }
  }
  res.json(updated);
});

export default router;
