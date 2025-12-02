import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';
import prisma from '../lib/prisma';
import { issueToken } from '../middleware/auth';

const router = Router();

const ALLOWED_OWNER_EMAILS = ['owner@rentalsuite.com'];

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
  const normalizedEmail = email?.trim().toLowerCase();
  const fallbackTenantEmail = `${wallet}@tenant.rentalsuite`;

  let user = await prisma.user.findFirst({ where: { ethAddr: wallet } });

  if (selectedRole === 'owner') {
    if (!email) {
      return res.status(400).json({ message: 'Owner email is required' });
    }
    const isAllowlistedOwner = ALLOWED_OWNER_EMAILS.includes(normalizedEmail);
    const ownerByEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!ownerByEmail) {
      if (!isAllowlistedOwner) {
        return res.status(403).json({ message: 'Email not registered as an owner' });
      }
      // Seed the owner user if it's an allowed owner email and does not exist yet.
      user = await prisma.user.create({
        data: {
          email: normalizedEmail!,
          role: 'owner',
          ethAddr: wallet
        }
      });
    } else {
      if (ownerByEmail.role !== 'owner' && !isAllowlistedOwner) {
        return res.status(403).json({ message: 'Email not registered as an owner' });
      }
      // Ensure the wallet is linked to this owner, while preventing conflicts.
      if (ownerByEmail.ethAddr && ownerByEmail.ethAddr !== wallet) {
        const walletHolder = await prisma.user.findFirst({
          where: { ethAddr: wallet, NOT: { id: ownerByEmail.id } }
        });
        if (walletHolder) {
          return res.status(409).json({ message: 'This wallet is already linked to another account' });
        }
      }
      user = await prisma.user.update({
        where: { id: ownerByEmail.id },
        data: {
          role: 'owner',
          ethAddr: wallet
        }
      });
    }
  } else if (!user && email) {
    user = await prisma.user.findUnique({ where: { email } });
  }

  if (!user) {
    if (selectedRole !== 'tenant' && !normalizedEmail) {
      return res.status(400).json({ message: 'Email is required for first-time login' });
    }
    const emailToUse = selectedRole === 'tenant' ? normalizedEmail ?? fallbackTenantEmail : normalizedEmail!;
    user = await prisma.user.create({
      data: {
        email: emailToUse,
        role: selectedRole,
        ethAddr: wallet
      }
    });
  } else {
    const updates: Record<string, any> = {};
    if (!user.ethAddr || user.ethAddr !== wallet) {
      updates.ethAddr = wallet;
    }
    if (selectedRole === 'tenant' && normalizedEmail && user.email !== normalizedEmail) {
      const existingEmailOwner = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!existingEmailOwner || existingEmailOwner.id === user.id) {
        updates.email = normalizedEmail;
      }
    }
    if (user.role !== selectedRole && selectedRole === 'tenant') {
      updates.role = selectedRole;
    }
    if (Object.keys(updates).length) {
      if (updates.ethAddr) {
        const walletHolder = await prisma.user.findFirst({
          where: { ethAddr: updates.ethAddr, NOT: { id: user.id } }
        });
        if (walletHolder) {
          return res.status(409).json({ message: 'This wallet is already linked to another account' });
        }
      }
      user = await prisma.user.update({ where: { id: user.id }, data: updates });
    }
    if (selectedRole === 'owner' && user.role !== 'owner') {
      return res.status(403).json({ message: 'Wallet is not authorized for owner access' });
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
