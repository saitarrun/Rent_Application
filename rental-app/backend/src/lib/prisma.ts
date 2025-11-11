import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function ensureProfileSeed() {
  const profile = await prisma.profile.findFirst();
  if (!profile) {
    await prisma.profile.create({
      data: {
        name: 'Default Rentals',
        contact: 'owner@example.com'
      }
    });
  }
}

export default prisma;
