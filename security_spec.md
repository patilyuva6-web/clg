# Security Specification — CampusFind Firestore Rules

## 1. Data Invariants
1. **PII Isolation**: Student email, phone, and USN in `/users/{userId}` and `/claims/{claimId}` are readable ONLY by the document owner (`request.auth.uid == userId`) or an administrator (`isAdmin()`). Public `/items/{itemId}` documents store only `reporter_name` and never email/phone/USN.
2. **Moderation Gate**: Newly created `/items/{itemId}` documents MUST start with `status == 'pending'` and `user_id == request.auth.uid`. Non-admin users cannot list or fetch other users' `pending` or `rejected` items, and cannot change item `status`.
3. **Claim Integrity**: A `/claims/{claimId}` document can only be created for an existing `/items/{itemId}` whose `status == 'approved'` and whose `user_id != request.auth.uid`, and MUST start with `claim_status == 'pending'`.
4. **Immutable Audit Fields**: `user_id` and `created_at` are immutable after creation. `created_at` and `updated_at` must equal `request.time`.
5. **Strict Key Allowlists**: Every `create` and `update` enforces `keys().hasOnly(...)` and `affectedKeys().hasOnly(...)` to block shadow fields and role escalation.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Approved Item Create**: Student creates `/items/item1` with `status: 'approved'` -> MUST FAIL (`PERMISSION_DENIED`).
2. **Shadow Field Injection on User**: Student creates `/users/uid1` with extra `isAdmin: true` -> MUST FAIL (`PERMISSION_DENIED`).
3. **Cross-Owner Item Spoof**: Student A creates `/items/item1` with `user_id: 'studentB'` -> MUST FAIL (`PERMISSION_DENIED`).
4. **Backdated Timestamp**: Student creates `/items/item1` with `created_at: '2020-01-01'` instead of `request.time` -> MUST FAIL (`PERMISSION_DENIED`).
5. **Unauthenticated Item Create**: Guest creates `/items/item1` -> MUST FAIL (`PERMISSION_DENIED`).
6. **PII Scrape on Users**: Student A calls `get(/users/studentB)` or `list(/users)` -> MUST FAIL (`PERMISSION_DENIED`).
7. **PII Scrape on Claims**: Student A calls `get(/claims/claimOfStudentB)` or `list(/claims)` without `user_id == uid` -> MUST FAIL (`PERMISSION_DENIED`).
8. **Claiming Own Item**: Student A creates `/claims/c1` referencing their own `/items/itemA` -> MUST FAIL (`PERMISSION_DENIED`).
9. **Claiming Pending/Returned Item**: Student B creates `/claims/c1` referencing `/items/pendingItem` -> MUST FAIL (`PERMISSION_DENIED`).
10. **Non-Admin Approving Claim**: Student B updates `/claims/c1` to `claim_status: 'approved'` -> MUST FAIL (`PERMISSION_DENIED`).
11. **Oversized ID Poisoning**: Attacker creates `/items/` with a 200-char ID or invalid characters -> MUST FAIL (`PERMISSION_DENIED`).
12. **Blanket List of Pending Items**: Non-admin lists `/items` without restricting to `status in ['approved', 'returned']` or `user_id == uid` -> MUST FAIL (`PERMISSION_DENIED`).
