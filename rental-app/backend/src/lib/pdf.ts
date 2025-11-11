import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function persistPdf(buffer: Buffer, kind: 'leases' | 'receipts'): Promise<string> {
  const dir = path.join(process.cwd(), 'src', 'storage', kind);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.pdf`;
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, buffer);
  return fullPath;
}
