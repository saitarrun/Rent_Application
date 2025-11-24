import request from 'supertest';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('../src/lib/eth', () => ({
  createLeaseOnChain: vi.fn().mockResolvedValue({ chainLeaseId: 101, chainId: '1337', txHash: '0xchain' }),
  requestRepairOnChain: vi.fn(),
  setRepairStatusOnChain: vi.fn(),
  signLeaseOnChain: vi.fn()
}));

import app from '../src/index';
import prisma from '../src/lib/prisma';
import { issueToken } from '../src/middleware/auth';

const ownerWallet = '0x1111111111111111111111111111111111111111';
const tenantWallet = '0x2222222222222222222222222222222222222222';

describe('Apply → approve → pay flow', () => {
  let ownerToken: string;
  let tenantToken: string;
  let listing: any;

  beforeAll(() => {
    ownerToken = `Bearer ${issueToken({ userId: 'owner', role: 'owner', ethAddr: ownerWallet })}`;
    tenantToken = `Bearer ${issueToken({ userId: 'tenant', role: 'tenant', ethAddr: tenantWallet })}`;
  });

  beforeEach(async () => {
    await prisma.receipt.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.repair.deleteMany();
    await prisma.application.deleteMany();
    await prisma.lease.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();

    const owner = await prisma.user.create({
      data: { email: 'owner@test.com', role: 'owner', ethAddr: ownerWallet }
    });
    const tenant = await prisma.user.create({
      data: { email: 'tenant@test.com', role: 'tenant', ethAddr: tenantWallet }
    });

    const property = await prisma.property.create({
      data: { ownerId: owner.id, name: 'Unit Test Property', address: '1 Test Way', propertyTemplateId: 2 }
    });

    listing = await prisma.listing.create({
      data: {
        ownerId: owner.id,
        propertyId: property.id,
        propertyTemplateId: 2,
        title: 'Unit Test Listing',
        address1: '1 Test Way',
        city: 'Testville',
        state: 'CA',
        postalCode: '90001',
        beds: 2,
        baths: new Decimal(1),
        sqft: 900,
        rentEth: new Decimal(1.11),
        available: true
      }
    });

    ownerToken = `Bearer ${issueToken({ userId: owner.id, role: 'owner', ethAddr: ownerWallet })}`;
    tenantToken = `Bearer ${issueToken({ userId: tenant.id, role: 'tenant', ethAddr: tenantWallet })}`;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lets a tenant apply, owner approve, and tenant log payments', async () => {
    const details = {
      legalName: 'Tester Tenant',
      email: 'tenant@test.com',
      phone: '555-555-5555',
      employmentStatus: 'Employed',
      employerName: 'QA Inc',
      annualIncome: 100000,
      occupants: [],
      notes: 'Looking forward'
    };

    const applyRes = await request(app)
      .post('/api/applications')
      .set('Authorization', tenantToken)
      .send({ listingId: listing.id, details, documents: [] });

    expect(applyRes.status).toBe(201);
    const applicationId = applyRes.body.id;

    const approveRes = await request(app)
      .patch(`/api/applications/${applicationId}/approve`)
      .set('Authorization', ownerToken);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.lease).toBeDefined();
    const leaseId = approveRes.body.lease.id;

    const depositRes = await request(app)
      .post(`/api/leases/${leaseId}/pay/deposit`)
      .set('Authorization', tenantToken)
      .send({ txHash: '0xdeposit', amountEth: Number(listing.rentEth) });
    expect(depositRes.status).toBe(200);

    const annualRes = await request(app)
      .post(`/api/leases/${leaseId}/pay/annual`)
      .set('Authorization', tenantToken)
      .send({ txHash: '0xannual', amountEth: Number(listing.rentEth) * 12 });
    expect(annualRes.status).toBe(200);
    expect(annualRes.body.lease.status).toBe('active');
  });
});
