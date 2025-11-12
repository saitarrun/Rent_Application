import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';

import authRouter from './routes/auth';
import userRouter from './routes/users';
import leasesRouter from './routes/leases';
import propertiesRouter from './routes/properties';
import invoicesRouter from './routes/invoices';
import receiptsRouter from './routes/receipts';
import repairsRouter from './routes/repairs';
import listingsRouter from './routes/listings';
import applicationsRouter from './routes/applications';
import { requireAuth } from './middleware/auth';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.use('/files/leases', express.static(path.join(process.cwd(), 'src', 'storage', 'leases')));
app.use('/files/receipts', express.static(path.join(process.cwd(), 'src', 'storage', 'receipts')));

app.use('/api/auth', authRouter);
app.use('/api', requireAuth, userRouter);
app.use('/api/properties', requireAuth, propertiesRouter);
app.use('/api/leases', requireAuth, leasesRouter);
app.use('/api/invoices', requireAuth, invoicesRouter);
app.use('/api/receipts', requireAuth, receiptsRouter);
app.use('/api/repairs', requireAuth, repairsRouter);
app.use('/api/listings', requireAuth, listingsRouter);
app.use('/api/applications', requireAuth, applicationsRouter);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Rental API is running. Use /api/* endpoints.' });
});

app.get('/contracts.json', (_req, res) => {
  res.sendFile(path.join(process.cwd(), '..', 'contracts.json'));
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
