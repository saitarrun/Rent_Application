import type { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

async function fetchLease(leaseId: string) {
  return prisma.lease.findUnique({ where: { id: leaseId }, select: { id: true, ownerId: true, tenantId: true, propertyId: true } });
}

export async function mustBeLeaseTenant(req: Request, res: Response, next: NextFunction) {
  const leaseId = req.params.id || req.params.leaseId;
  if (!leaseId) return res.status(400).json({ message: 'leaseId missing' });
  const lease = await fetchLease(leaseId);
  if (!lease) return res.status(404).json({ message: 'Lease not found' });
  if (lease.tenantId !== req.auth?.userId) {
    return res.status(403).json({ message: 'Forbidden for this lease' });
  }
  next();
}

export async function mustBeInvoiceTenant(req: Request, res: Response, next: NextFunction) {
  const invoiceId = req.params.id;
  if (!invoiceId) return res.status(400).json({ message: 'invoice id missing' });
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { lease: { select: { tenantId: true, ownerId: true } } } });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  if (invoice.lease.tenantId !== req.auth?.userId) {
    return res.status(403).json({ message: 'Forbidden invoice access' });
  }
  next();
}

export async function mustBePropertyOwner(req: Request, res: Response, next: NextFunction) {
  const propertyId = req.params.id || req.params.propertyId;
  if (!propertyId) return res.status(400).json({ message: 'property id missing' });
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { ownerId: true } });
  if (!property) return res.status(404).json({ message: 'Property not found' });
  if (property.ownerId !== req.auth?.userId) {
    return res.status(403).json({ message: 'Not property owner' });
  }
  next();
}
