import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CHAIN_RPC_URL',
  'CHAIN_ID',
  'PRIVATE_KEY',
  'RECEIPT_NFT_ADDRESS',
  'LEASE_NFT_MINTER_PK'
];

function validateEnv() {
  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Validate formats
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    console.warn(`⚠️  JWT_SECRET is weak (< 32 chars). Use a longer, randomly generated secret for production.`);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl?.includes('://')) {
    console.error(`❌ Invalid DATABASE_URL format`);
    process.exit(1);
  }

  console.log('✓ Environment variables validated');
}

export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (!value && !defaultValue) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value!;
}

export { validateEnv };
