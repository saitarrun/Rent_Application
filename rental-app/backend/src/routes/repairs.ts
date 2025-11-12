import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const router = Router();

const updateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  scheduledAt: z.string().optional(),
  assignedTo: z.string().optional()
});

router.patch('/:id', async (req, res) => {
  const repair = await prisma.repair.findUnique({
    where: { id: req.params.id },
    include: { lease: { select: { ownerId: true } } }
  });
  if (!repair) return res.status(404).json({ message: 'Repair not found' });
  if (req.auth?.userId !== repair.lease.ownerId) return res.status(403).json({ message: 'Only owner can update repair' });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const updated = await prisma.repair.update({
    where: { id: repair.id },
    data: {
      status: parsed.data.status ?? repair.status,
      scheduledAt: parsed.data.scheduledAt ?? repair.scheduledAt,
      assignedTo: parsed.data.assignedTo ?? repair.assignedTo
    }
  });
  res.json(updated);
});

export default router;
