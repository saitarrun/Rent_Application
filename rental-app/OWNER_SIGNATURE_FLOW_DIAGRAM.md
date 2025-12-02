# Owner Signature Flow - Visual Diagram

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LEASE AGREEMENT PAGE                           │
│                   (AgreementDetail.tsx)                             │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Fetch Lease Data    │
                    │  useQuery            │
                    └──────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
        ┌─────────────────┐        ┌──────────────────┐
        │  OWNER VIEWING  │        │  TENANT VIEWING  │
        │                 │        │                  │
        │ role='owner'    │        │ role='tenant'    │
        └─────────────────┘        └──────────────────┘
                │                             │
                ▼                             ▼
      ┌──────────────────────┐      ┌─────────────────────┐
      │ Check canOwnerSign   │      │ Check canTenantSign │
      │                      │      │                     │
      │ = role === 'owner'   │      │ = role === 'tenant' │
      │   && !ownerSignedAt  │      │   && !tenantSignedAt│
      └──────────────────────┘      └─────────────────────┘
                │                             │
         YES    │    NO            YES    │    NO
                ▼                   ▼          ▼
        ┌──────────────────┐  ┌──────────┐  ┌─────────┐
        │ Show "Sign lease"│  │ Hide     │  │ Show    │  │ Hide
        │    Button        │  │ Button   │  │ Button  │  │ Button
        └──────────────────┘  └──────────┘  └─────────┘  └──────
                │                             │
                ▼ (Click)                      ▼ (Click)
        ┌──────────────────┐        ┌─────────────────────┐
        │ signMutation.    │        │ signMutation.       │
        │   mutate()       │        │   mutate()          │
        └──────────────────┘        └─────────────────────┘
                │                             │
                ▼                             ▼
        ┌──────────────────┐        ┌─────────────────────┐
        │ Check if role    │        │ Check if wallet     │
        │ === 'tenant'     │        │ connected           │
        └──────────────────┘        └─────────────────────┘
                │                             │
          NO   │    YES                NO   │    YES
              ▼                            ▼
        ┌──────────────────┐        ┌─────────────────────┐
        │ signLease(id)    │        │ ensureNetwork()     │
        │  (no signature)  │        │ MetaMask.personal   │
        │                  │        │ _sign()             │
        │ = Owner signs    │        │                     │
        │   OFF-CHAIN      │        │ = Tenant signs      │
        │                  │        │   WITH SIGNATURE    │
        └──────────────────┘        └─────────────────────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
                    ┌─────────────────────────┐
                    │ POST /leases/:id/sign   │
                    │ (Backend Endpoint)      │
                    └─────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────┐
                    │ Backend Validation      │
                    │                         │
                    │ • Check auth (JWT)      │
                    │ • Verify ownership/     │
                    │   tenancy               │
                    │ • Check signature       │
                    └─────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
          ┌──────────┐              ┌──────────────────┐
          │ OWNER    │              │ TENANT           │
          │ SIGNING  │              │ SIGNING          │
          └──────────┘              └──────────────────┘
                │                             │
                ▼                             ▼
        ┌──────────────────┐        ┌─────────────────────┐
        │ UPDATE Lease:    │        │ UPDATE Lease:       │
        │                  │        │                     │
        │ ownerSignedAt    │        │ tenantSignedAt      │
        │  = NOW           │        │  = NOW              │
        │                  │        │ status: pending     │
        │                  │        │  → signed           │
        │                  │        │ if chainLeaseId:    │
        │                  │        │  signLeaseOnChain() │
        └──────────────────┘        └─────────────────────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
                    ┌─────────────────────────┐
                    │ Return Updated Lease    │
                    │ (with timestamps)       │
                    └─────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────┐
                    │ onSuccess Callback:     │
                    │                         │
                    │ • Show toast:           │
                    │   "Lease signed"        │
                    │ • Invalidate queries    │
                    │ • Refresh lease data    │
                    └─────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────┐
                    │ UI Updates:             │
                    │                         │
                    │ • ownerSignedAt field   │
                    │   shows timestamp       │
                    │ • "Sign lease" button   │
                    │   disappears            │
                    │ • Status badge updates  │
                    │   (pending → signed)    │
                    └─────────────────────────┘
```

---

## State Machine: Lease Signature Status

```
                    ┌──────────┐
                    │ PENDING  │  (Initial state)
                    │          │  - ownerSignedAt: null
                    │          │  - tenantSignedAt: null
                    └────┬─────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                              ▼
    ┌──────────────┐            ┌──────────────┐
    │ OWNER SIGNED │            │ TENANT SIGNED│
    │              │            │              │
    │ ownerSigned: │            │ tenantSigned │
    │   timestamp  │            │   timestamp  │
    │ tenantSigned │            │ ownerSigned  │
    │   null       │            │   null       │
    └──────┬───────┘            └───────┬──────┘
           │                            │
           └──────────────┬─────────────┘
                          ▼
                    ┌──────────┐
                    │ SIGNED   │  (Final state)
                    │ BOTH     │  - ownerSignedAt: timestamp
                    │          │  - tenantSignedAt: timestamp
                    │          │  - status: "signed"
                    └──────────┘
```

---

## Component Interaction Flow

```
AgreementDetail.tsx
│
├─ useQuery('lease', id)
│  └─ fetchLease(id) [API]
│
├─ useMutation(signMutation)
│  │
│  ├─ If role === 'tenant':
│  │  ├─ ensureNetwork()
│  │  ├─ MetaMask.personal_sign()
│  │  └─ signLease(id, signature)
│  │
│  └─ If role === 'owner':
│     └─ signLease(id)
│
└─ PageHeader
   └─ actions
      ├─ Download PDF button
      ├─ {canTenantSign && "Sign lease" button}
      └─ {canOwnerSign && "Sign lease" button}
```

---

## Data Flow: Before and After Signing

### Before Owner Signs
```json
{
  "id": "lease123",
  "status": "pending",
  "ownerSignedAt": null,
  "tenantSignedAt": null,
  "ownerId": "owner1",
  "tenantId": "tenant1"
}
```

**UI Display:**
- Owner sees: "Sign lease" button ✅
- Tenant sees: Button disabled or showing "Awaiting owner" ⏳

### After Owner Signs
```json
{
  "id": "lease123",
  "status": "pending",
  "ownerSignedAt": "2025-11-25T21:45:00Z",
  "tenantSignedAt": null,
  "ownerId": "owner1",
  "tenantId": "tenant1"
}
```

**UI Display:**
- Owner sees: No button (already signed) ✅
- Tenant sees: "Sign lease" button ✅

### After Both Sign
```json
{
  "id": "lease123",
  "status": "signed",
  "ownerSignedAt": "2025-11-25T21:45:00Z",
  "tenantSignedAt": "2025-11-25T21:46:30Z",
  "signedAt": "2025-11-25T21:46:30Z",
  "ownerId": "owner1",
  "tenantId": "tenant1"
}
```

**UI Display:**
- Owner sees: Signed date displayed ✅
- Tenant sees: Signed date displayed ✅
- Status badge: "signed" ✅

---

## Error Handling Flow

```
signMutation.mutate()
│
├─ Network Error
│  └─ onError callback
│     └─ pushNotice('error', 'Network error')
│
├─ 403 Forbidden (not owner/tenant)
│  └─ Backend returns 403
│     └─ onError: "Unable to sign lease"
│
├─ 404 Not Found (lease doesn't exist)
│  └─ Backend returns 404
│     └─ onError: "Lease not found"
│
└─ Success (200 OK)
   └─ onSuccess callback
      ├─ pushNotice('success', 'Lease signed')
      ├─ Invalidate ['lease', id]
      ├─ Invalidate ['leases']
      └─ UI refreshes automatically
```

---

## Key Implementation Details

### 1. Role-Based Button Visibility
```tsx
const canOwnerSign = role === 'owner' && !lease.ownerSignedAt;
const canTenantSign = role === 'tenant' && !lease.tenantSignedAt;
```

### 2. Shared Mutation Logic
Both owner and tenant use the same `signMutation`, but with different request bodies:
- **Owner:** `POST /leases/:id/sign` with `{}`
- **Tenant:** `POST /leases/:id/sign` with `{ signature: "0x..." }`

### 3. Backend Role Detection
Backend uses `req.auth.userId` to determine who is signing:
```typescript
if (userId === lease.ownerId) {
  data.ownerSignedAt = now;  // Owner branch
}
if (userId === lease.tenantId) {
  data.tenantSignedAt = now;  // Tenant branch
  data.status = lease.status === 'pending' ? 'signed' : lease.status;
}
```

### 4. Toast Notifications
- Success: `pushNotice('success', 'Lease signed')`
- Error: `pushNotice('error', err.message)`

---

## Summary

✅ **Owner signature flow fully implemented**
- Owners see "Sign lease" button when lease not signed
- One-click signing without wallet requirement
- Backend validates ownership and updates database
- UI refreshes with signed timestamp
- Error handling with user-friendly messages
