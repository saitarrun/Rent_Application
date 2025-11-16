import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { ensureProfileSeed } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

const profileSchema = z.object({
  name: z.string().min(1),
  contact: z.string().min(1),
  graceDays: z.number().int().min(0).max(30),
  lateFeeType: z.enum(['fixed', 'percent']),
  lateFeeValue: z.string()
});

router.use(requireAuth);

router.get('/profile', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner') {
    return res.status(403).json({ message: 'Only owners can access portfolio profile settings' });
  }
  await ensureProfileSeed();
  const profile = await prisma.profile.findFirst();
  return res.json(profile);
});

router.put('/profile', async (req, res) => {
  const auth = req.auth!;
  if (auth.role !== 'owner') {
    return res.status(403).json({ message: 'Only owners can update portfolio profile settings' });
  }
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  const profile = await prisma.profile.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: parsed.data
  });
  return res.json(profile);
});

export default router;
