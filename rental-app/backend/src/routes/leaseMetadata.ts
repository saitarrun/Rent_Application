import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/leases/:id/nft-metadata.json', async (req, res) => {
  const lease = await prisma.lease.findUnique({
    where: { id: req.params.id },
    include: { property: true, listing: true, owner: true }
  });
  if (!lease) {
    return res.status(404).json({ message: 'Lease not found' });
  }

  const base = process.env.NFT_METADATA_BASE_URL || `${req.protocol}://${req.get('host')}`;
  const propertyLabel = lease.property?.name || lease.listing?.title || `Lease ${lease.id}`;
  const address = lease.listing?.address1 || lease.property?.address || '';

  const metadata = {
    name: `Lease Receipt #${lease.id}`,
    description: `On-chain receipt for ${propertyLabel}${address ? ` at ${address}` : ''}.`,
    external_url: `${base.replace(/\/$/, '')}/agreements/${lease.id}`,
    image: 'https://via.placeholder.com/600/111827/FFFFFF?text=Lease+Receipt+NFT',
    attributes: [
      { trait_type: 'Lease ID', value: lease.id },
      { trait_type: 'Property', value: propertyLabel },
      { trait_type: 'Owner Wallet', value: lease.owner?.ethAddr || 'unknown' },
      { trait_type: 'Tenant Wallet', value: lease.tenantEth },
      { trait_type: 'Start', value: lease.startISO },
      { trait_type: 'End', value: lease.endISO }
    ]
  };

  res.json(metadata);
});

router.get('/receipts/:id/nft-metadata.json', async (req, res) => {
  const receipt = await prisma.receipt.findUnique({
    where: { id: req.params.id },
    include: { lease: { include: { property: true, listing: true, owner: true } }, invoice: true }
  });
  if (!receipt) return res.status(404).json({ message: 'Receipt not found' });

  const base = process.env.NFT_METADATA_BASE_URL || `${req.protocol}://${req.get('host')}`;
  const { lease } = receipt;
  const propertyLabel = lease.property?.name || lease.listing?.title || `Lease ${lease.id}`;
  const address = lease.listing?.address1 || lease.property?.address || '';
  const isDeposit = receipt.invoiceId?.startsWith(`deposit-${lease.id}`);

  const metadata = {
    name: `Lease Receipt Payment #${receipt.id}`,
    description: `${isDeposit ? 'Security deposit' : 'Rent'} payment receipt for ${propertyLabel}${address ? ` at ${address}` : ''}.`,
    external_url: `${base.replace(/\/$/, '')}/agreements/${lease.id}`,
    image: 'https://via.placeholder.com/600/0F172A/FFFFFF?text=Payment+Receipt+NFT',
    attributes: [
      { trait_type: 'Lease ID', value: lease.id },
      { trait_type: 'Invoice ID', value: receipt.invoiceId },
      { trait_type: 'Payment Type', value: isDeposit ? 'Deposit' : 'Rent' },
      { trait_type: 'Amount ETH', value: receipt.paidEth?.toString() || '0' },
      { trait_type: 'Paid At', value: receipt.paidAtISO },
      { trait_type: 'Owner Wallet', value: lease.owner?.ethAddr || 'unknown' },
      { trait_type: 'Tenant Wallet', value: lease.tenantEth }
    ]
  };

  res.json(metadata);
});

export default router;
