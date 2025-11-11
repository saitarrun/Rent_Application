import { Router } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';
import { persistPdf } from '../lib/pdf';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/:id/pdf', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'PDF required' });
  const receipt = await prisma.receipt.findUnique({
    where: { id: req.params.id },
    include: { lease: { select: { ownerId: true, tenantId: true } } }
  });
  if (!receipt) return res.status(404).json({ message: 'Receipt not found' });
  if (req.auth?.userId !== receipt.lease.ownerId && req.auth?.userId !== receipt.lease.tenantId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const pdfPath = await persistPdf(req.file.buffer, 'receipts');
  await prisma.receipt.update({ where: { id: receipt.id }, data: { pdfPath } });
  res.json({ pdfPath });
});

export default router;
