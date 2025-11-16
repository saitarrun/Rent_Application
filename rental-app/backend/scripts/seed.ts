import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../src/lib/prisma';

async function main() {
  console.log('Resetting database...');
  await prisma.receipt.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.repair.deleteMany();
  await prisma.application.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  const owner = await prisma.user.create({
    data: {
      email: 'owner@rentalsuite.com',
      role: 'owner',
      ethAddr: '0xowner000000000000000000000000000000000000'
    }
  });

  await prisma.user.create({
    data: {
      email: 'tenant@rentalsuite.com',
      role: 'tenant',
      ethAddr: '0xtenant0000000000000000000000000000000000'
    }
  });

  const property = await prisma.property.create({
    data: {
      ownerId: owner.id,
      name: 'Seeded Loft',
      address: '123 Seed Rd, Metropolis, NY',
      propertyTemplateId: 2
    }
  });

  await prisma.listing.create({
    data: {
      ownerId: owner.id,
      propertyId: property.id,
      propertyTemplateId: 2,
      title: 'Seeded Loft',
      address1: '123 Seed Rd',
      city: 'Metropolis',
      state: 'NY',
      postalCode: '10001',
      beds: 2,
      baths: new Decimal(1),
      sqft: 1200,
      rentEth: new Decimal(1.25),
      available: true,
      amenities: 'Washer/Dryer, Balcony',
      photoUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80'
    }
  });

  console.log('Seed complete. Owner login email: owner@rentalsuite.com. Tenant login email: tenant@rentalsuite.com');
}

main()
  .catch((err) => {
    console.error('Seed failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
