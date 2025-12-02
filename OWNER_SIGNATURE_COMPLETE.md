# Owner Signature Flow — Finalized

Lean summary of what shipped, how it works, and how to verify.

---

## Status
- Implementation finished and tested; owners and tenants can sign from the same UI with proper feedback.
- No wallet required for owners; tenants follow the existing blockchain path.
- Risk: low. Remaining work is optional polish only.

## Key Changes (frontend/src/pages/AgreementDetail.tsx)
- Enable owner signing logic: `const canOwnerSign = role === 'owner' && !lease.ownerSignedAt;`
- Add header action:
  ```tsx
  {canOwnerSign && (
    <AnimatedButton
      onClick={() => signMutation.mutate()}
      disabled={signMutation.isPending}
      className="text-sm"
    >
      {signMutation.isPending ? 'Signing…' : 'Sign lease'}
    </AnimatedButton>
  )}
  ```

## Behavior by Role
- Owner: sees button when unsigned → click → backend sets `ownerSignedAt` → toast → button hides; no wallet prompts.
- Tenant: sees button when unsigned → wallet connect + personal_sign `Lease:{leaseId}` → backend sets `tenantSignedAt` (and on-chain if `chainLeaseId`) → toast → button hides.

## System Path
```
AgreementDetail.tsx
  ↳ POST /leases/:id/sign (role-aware)
      ↳ routes/leases.ts (auth + RBAC)
          ↳ Prisma Lease (ownerSignedAt, tenantSignedAt, status)
```

## Feature Matrix
| Capability | Owner | Tenant |
|------------|-------|--------|
| Button visible when unsigned | Yes | Yes |
| Wallet required | No | Yes |
| Off-chain signing | Yes | No |
| On-chain signing | No | Optional |
| Timestamp stored | ownerSignedAt | tenantSignedAt |
| Status change | Stays pending | pending → signed |

## Testing Done
- Frontend builds cleanly.
- `/leases/:id/sign` works for both roles with JWT auth and RBAC.
- Buttons gate correctly on unsigned state and disappear after success.
- Toasts show for success and error; "Signing…" disables repeat clicks.

## API Calls
- GET lease:
  ```bash
  curl -X GET http://localhost:4000/leases/lease123 \
    -H "Authorization: Bearer $TOKEN"
  ```
- POST sign:
  ```bash
  # Owner (no signature)
  curl -X POST http://localhost:4000/leases/lease123/sign \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}'

  # Tenant (with signature)
  curl -X POST http://localhost:4000/leases/lease123/sign \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{ "signature": "0x..." }'
  ```

## Verify Locally
```bash
cd /Users/csuftitan/RentalApp/rental-app/frontend
npm run build
npm run dev  # frontend :5173
cd ../backend && npm run dev  # backend :4000
open http://localhost:5173
```
Then open a pending lease, confirm the button appears for the right role, click to sign, see toast, and confirm the button hides.

## Troubleshooting
- Button missing for owner: confirm `role === 'owner'` and `!lease.ownerSignedAt`.
- Signing fails: check backend logs (`tail -f /tmp/backend.log`) and Network tab for `POST /leases/:id/sign`.
- Timestamp not updating: clear cookies/cache, reload, and refetch lease.

## Optional Next Steps
- Email notifications on owner/tenant signing.
- Audit log of signature events.
- Optional countersignature or approval chain.
