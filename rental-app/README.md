# Rental Agreement & Management Portal

Full-stack monorepo that manages digital leases with owner/tenant roles, ETH rent collection, e-signature PDFs, repair workflows, and ledgers aligned with Ganache (1337) and Sepolia (11155111).

## Stack
- **Smart contracts**: Solidity 0.8.24, Truffle, HDWalletProvider.
- **Backend**: Node 20, Express + Prisma + SQLite/Postgres, JWT, Zod, Multer.
- **Frontend**: React + Vite + TypeScript, Tailwind, React Query, Zustand, Ethers v6, jsPDF.

## Repository layout
```
rental-app/
  contracts/            # RENT, Payments, Repairs Solidity sources
  migrations/           # Truffle migration scripts
  contracts.json        # ChainId-keyed deployment addresses consumed by FE/BE
  backend/              # Express + Prisma API
  frontend/             # React dashboard
```

## Prerequisites
- Node.js 20 (`nvm use 20`)
- npm 9+
- Ganache CLI for local chain
- MetaMask (or any wallet injected into the browser)

## Smart contracts
```bash
nvm use 20
npm i -g ganache@^7

# Start deterministic local chain (chain id 1337)
ganache --port 8545 --wallet.deterministic --chain.chainId 1337 --miner.blockGasLimit 12000000

# In another shell
yarn global add truffle # or npm i -g truffle
cd rental-app
truffle compile
truffle migrate --reset --network development
truffle migrate --reset --network sepolia   # requires PRIVATE_KEY & SEPOLIA_RPC in backend/.env
```
Update `contracts.json` with the deployed addresses from each network so the backend and frontend auto-load them.

## Backend API
```bash
cd rental-app/backend
cp .env.example .env        # adjust DATABASE_URL/JWT_SECRET/SEPOLIA_RPC
npm install
npx prisma migrate dev -n init
npm run dev                 # http://localhost:4000
npm test                    # runs Vitest unit tests
```
API surface (JWT required for all non-auth routes):
- `POST /api/auth/nonce` / `POST /api/auth/verify` – wallet-based login challenge for owners & tenants.
- `GET/PUT /api/profile` – late fee + contact settings.
- `GET /api/leases`, `GET /api/leases/:id`, `POST /api/leases`, `PATCH /api/leases/:id`, `POST /api/leases/:id/pdf`.
- `POST /api/leases/:id/sign` – owner or tenant e-signature acknowledgement.
- `GET /api/leases/:id/invoices`, `GET /api/invoices/:id`, `POST /api/invoices/generate-due`, `POST /api/invoices/:id/pay-init`, `PATCH /api/invoices/:id/reconcile`.
- `GET /api/leases/:id/repairs`, `POST /api/leases/:id/repairs`, `PATCH /api/repairs/:id`.
- `GET /api/properties/:id/ledger`.
- `POST /api/receipts/:id/pdf`.
- Static PDF hosting at `/files/leases/*` and `/files/receipts/*` plus `/contracts.json` passthrough for the frontend.

ACL & business rules:
- JWT carries `{ userId, role, ethAddr }` and every query filters by owner/tenant IDs.
- `mustBeLeaseTenant`, `mustBeInvoiceTenant`, `mustBePropertyOwner` enforce multi-tenant access.
- Lease creation seeds the first invoice, triggers notification stub, and stores PDF uploads server-side.
- Invoice generation helper respects due day + profile settings; reconciliation creates receipt rows and stores PDFs.
- Repairs follow `open → in_progress → resolved → closed` and notify via UI.

## Frontend
```bash
cd rental-app/frontend
npm install
npm run dev                 # http://localhost:5173 (proxy to backend)
```
Capabilities:
- MetaMask login flow with role selection; owner wallets double as admins for their entire portfolio while tenants land on a restricted UI.
- Owner dashboard with metrics, wizard-based lease creation (7 steps), property ledger view, repair queue, and PDF downloads; owners can e-sign drafts before sharing.
- Tenant dashboard showing only assigned leases, outstanding invoices, repair status, and one-click ETH “Pay now”; tenants must review and sign the lease before payments unlock.
- Environment toggle (Local ↔ Sepolia) in the navbar automatically calls `wallet_switchEthereumChain` and reads the right addresses from `/contracts.json`.
- jsPDF downloads for leases and receipts, while backend endpoints accept uploaded signed PDFs for archival.

## Testing
- Backend: `npm test` runs Vitest unit tests covering invoice schedule utilities.
- Smart contracts: use `truffle test` (provide your own specs if desired).
- Frontend: rely on manual verification plus React Query devtools (can be added) for brevity.

## Typical flow
1. **Owner** logs in, configures profile defaults, and creates a lease via the wizard. API stores lease, generates the first invoice, and prepares a PDF slot.
2. **Tenant** logs in, views assigned leases/invoices only (ACL filters), e-signs/downloads PDF, and pays rent in ETH. The dApp hides chain IDs and converts ETH values just-in-time.
3. On successful chain tx, the UI calls `/reconcile`, invoice status flips to `paid`, and a receipt row/PDF become available. Property ledger aggregates collected vs. outstanding per lease.
4. Tenants open repair tickets with photos/notes; owners change statuses and tenants see real-time updates.
5. Switch between Ganache (internal testing) and Sepolia (faucet ETH) with the navbar toggle—flows remain identical.

## Notes
- Prisma targets SQLite by default; override `DATABASE_URL` (e.g., Postgres) before running migrations.
- Email notifications are stubbed to the console via `lib/mailer.ts`; plug in any provider later.
- `contracts.json` is the single source of truth for contract addresses; never expose numeric chain IDs in the UI.
