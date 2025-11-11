import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';
import prisma from '../lib/prisma';
import { issueToken } from '../middleware/auth';

const router = Router();

const nonceSchema = z.object({
  address: z.string().min(42),
  role: z.enum(['owner', 'tenant']).default('tenant'),
  email: z.string().email().optional()
});

function buildLoginMessage(role: string, nonce: string) {
  return `Rental Portal login\nRole: ${role}\nNonce: ${nonce}`;
}

router.post('/nonce', async (req, res) => {
  const parsed = nonceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  const { address, role, email } = parsed.data;
  const wallet = address.toLowerCase();
  const selectedRole = role === 'owner' ? 'owner' : 'tenant';

  let user = await prisma.user.findFirst({ where: { ethAddr: wallet } });

  if (!user && !email) {
    return res.status(400).json({ message: 'Email is required for first-time login' });
  }

  if (!user && email) {
    user = await prisma.user.findUnique({ where: { email } });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email!,
        role: selectedRole,
        ethAddr: wallet
      }
    });
  } else {
    const updates: Record<string, any> = {};
    if (!user.ethAddr || user.ethAddr !== wallet) {
      updates.ethAddr = wallet;
    }
    if (email && user.email !== email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing || existing.id === user.id) {
        updates.email = email;
      } else {
        updates.role = existing.role;
        user = existing;
      }
    }
    if (user.role !== selectedRole) {
      updates.role = selectedRole;
    }
    if (Object.keys(updates).length) {
      user = await prisma.user.update({ where: { id: user.id }, data: updates });
    }
  }

  const nonce = randomBytes(16).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginNonce: nonce
    }
  });

  res.json({ nonce, role: selectedRole, email: user.email });
});

const verifySchema = z.object({
  address: z.string().min(42),
  signature: z.string().min(10)
});

router.post('/verify', async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.flatten());
  }
  const { address, signature } = parsed.data;
  const wallet = address.toLowerCase();

  const user = await prisma.user.findFirst({ where: { ethAddr: wallet } });
  if (!user || !user.loginNonce) {
    return res.status(400).json({ message: 'Wallet not registered or nonce expired' });
  }

  const message = buildLoginMessage(user.role, user.loginNonce);
  let signer: string;
  try {
    signer = ethers.verifyMessage(message, signature).toLowerCase();
  } catch (error) {
    return res.status(400).json({ message: 'Invalid signature' });
  }
  if (signer !== wallet) {
    return res.status(400).json({ message: 'Signature wallet mismatch' });
  }

  await prisma.user.update({ where: { id: user.id }, data: { loginNonce: null, ethAddr: wallet } });

  const token = issueToken({ userId: user.id, role: user.role, ethAddr: user.ethAddr });
  return res.json({ token, user });
});

export default router;
