import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(__dirname, 'test.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const templateDb = path.join(__dirname, 'prisma', 'dev.db');
if (fs.existsSync(dbPath)) {
  fs.rmSync(dbPath);
}
try {
  fs.copyFileSync(templateDb, dbPath);
} catch (error) {
  console.warn('Failed to prepare test database', error);
}
