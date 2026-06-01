# Firestore Security Specification - Zero-Trust TDD Spec

## 1. Data Invariants

1. **User Identity Isolation**: A user's profile acts as their single source of identity. Access to profile reads is restricted to prevent scraping of Personally Identifiable Information (PII) like `email`, `phoneNumber`, and KYC data.
2. **No Self-Assigned Roles (Privilege Escalation Guard)**: Users must not be allowed to set or update their own `role` (especially to `Admin`), `tokens`, `kycStatus`, `isSubscriber`, `rating`, or `profileScore`.
3. **Pipeline Integrity**: No listing request or draft can bypass verification statuses. Creation/update status fields are strictly validated. Users cannot transition their listings directly to `Approved` or override bidding states.
4. **Chat State Anti-Tampering**: General participants can only update metadata logs (`lastMessage`, `lastTimestamp`). Critical transaction flags like `inspectionFeePaid` can only be set according to verified workflow gates.
5. **Dispute Authenticity**: Disputes must originate from signed-in participants of the respective listings, must have initial status `Open`, and are immutable by the client post-creation.
6. **Immutable Ledger Guard**: The `transactions` subcollection acts as an immutable client financial history log. No user can append or write to it directly; writes must flow exclusively through Admin/Cloud Functions.

---

## 2. The "Dirty Dozen" Payloads

Here are the 12 specific JSON payloads designed to violate Identity, Integrity, and State boundaries:

### User Profiles & Privilege Escalation
#### Payload 1: Admin Role Self-Injection (Create User)
- **Path**: `/users/attacker-uid`
- **Operation**: `create` Or `set`
- **Intended Attack**: Escalates privileges to superadmin upon initial registration.
- **Payload**:
```json
{
  "id": "attacker-uid",
  "email": "attacker@evil.corp",
  "name": "Attacker Admin",
  "role": "Admin",
  "tokens": 999999,
  "isAgent": true,
  "kycStatus": "Verified"
}
```

#### Payload 2: Account Balances & Status Spoofing (Update User)
- **Path**: `/users/attacker-uid`
- **Operation**: `update`
- **Intended Attack**: Normal Buyer updates their profile to gain 5,000 free tokens, self-verify KYC, and lock rating.
- **Payload**:
```json
{
  "tokens": 5150,
  "kycStatus": "Verified",
  "rating": 5.0,
  "totalReviews": 1000
}
```

#### Payload 3: PII Database Scraping (Read Profile)
- **Path**: `/users/victim-uid`
- **Operation**: `get` / `read`
- **Intended Attack**: Non-owner, non-admin scrapes full profile containing `email`, `phoneNumber`, `kycDocuments`, `ninNumber`.

---

### Listing Requests & Pipeline
#### Payload 4: Arbitrary Instant Approval (Create Listing Request)
- **Path**: `/listingRequests/req-evil-123`
- **Operation**: `create`
- **Intended Attack**: Circumvents standard validation pipeline by setting status explicitly to `Approved`.
- **Payload**:
```json
{
  "id": "req-evil-123",
  "ownerId": "attacker-uid",
  "title": "Malicious Fake Land",
  "price": 100000,
  "status": "Approved",
  "dealStatus": "Active"
}
```

#### Payload 5: Competitor Agent Bid Laundering (Update Listing Request)
- **Path**: `/listingRequests/req-real-456`
- **Operation**: `update`
- **Intended Attack**: An agent modifies the existing bids array, replacing or altering competing agent entries to zero-commission offers.
- **Payload**:
```json
{
  "agentBids": [
    { "agentId": "competitor-agent", "fee": 50, "status": "Outbid" },
    { "agentId": "attacker-uid", "fee": 3000, "status": "Winning" }
  ]
}
```

---

### Messaging & Financial Gating
#### Payload 6: Notification Spam & Target Manipulation (Create Notification)
- **Path**: `/users/victim-uid/notifications/spam-789`
- **Operation**: `create`
- **Intended Attack**: Injects phishing prompts as critical notifications directly to the victim's inbox.
- **Payload**:
```json
{
  "title": "ACCOUNT SUSPENDED",
  "body": "Please wire 500 NGN to bank XX to prevent total loss of service.",
  "type": "account_suspended",
  "read": false,
  "createdAt": "2026-06-01T12:00:00Z"
}
```

#### Payload 7: Free Inspection Fee Tampering (Update Chat)
- **Path**: `/chats/buyer-agent-chat`
- **Operation**: `update`
- **Intended Attack**: Directly overwrites payment confirmation field without processing real Paystack transaction.
- **Payload**:
```json
{
  "inspectionFeePaid": true
}
```

---

### Disputes & Inspection Bookings
#### Payload 8: Pre-approved Dispute Resolutions (Create Dispute)
- **Path**: `/disputes/disp-999`
- **Operation**: `create`
- **Intended Attack**: Submits a dispute with status set directly to `Resolved` and with arbitrary details.
- **Payload**:
```json
{
  "id": "disp-999",
  "listingId": "listing-123",
  "propertyTitle": "Grand Palace",
  "raisedBy": "attacker-uid",
  "againstUserId": "victim-agent",
  "status": "Resolved",
  "resolutionNote": "Refund all assets to attacker."
}
```

#### Payload 9: Paid Status Injection (Update Inspection Request)
- **Path**: `/inspectionRequests/inspect-555`
- **Operation**: `update`
- **Intended Attack**: Overwrites inspection request status and fee status to mark unconfirmed booking as paid and confirmed.
- **Payload**:
```json
{
  "feeStatus": "Paid",
  "status": "Confirmed"
}
```

---

### Workspace, Ledger & System Channels
#### Payload 10: Vandalize System Announcements (Create Announcement)
- **Path**: `/announcements/ann-attacker`
- **Operation**: `create`
- **Intended Attack**: Non-admin broadcasts a panic notice across the platform.
- **Payload**:
```json
{
  "text": "The platform is closing. Liquidate your property immediately.",
  "category": "Danger",
  "audience": "All",
  "dispatchDate": "2026-06-01T12:00:00Z"
}
```

#### Payload 11: Workspace Draft Sabotage (Create Draft)
- **Path**: `/drafts/draft-victim`
- **Operation**: `create`
- **Intended Attack**: Attacker creates a draft listing with another user's ownerId to associate storage costs.
- **Payload**:
```json
{
  "id": "draft-victim",
  "ownerId": "victim-uid",
  "title": "Spam Draft",
  "price": 100,
  "status": "Draft"
}
```

#### Payload 12: Transaction History Forgery (Create Transaction)
- **Path**: `/users/attacker-uid/transactions/fake-tx-111`
- **Operation**: `create`
- **Intended Attack**: Direct insertion of false token purchase receipts into history ledger.
- **Payload**:
```json
{
  "id": "fake-tx-111",
  "type": "token_purchase",
  "amount": 25000.0,
  "status": "Completed",
  "createdAt": "2026-06-01T12:00:00Z"
}
```

---

## 3. The Test Runner Spec

The testing target verifies that all "Dirty Dozen" payloads fail with local `PERMISSION_DENIED` exceptions in our emulated and production security rules.
Validations are parsed synchronously on the 8 Pillars.
