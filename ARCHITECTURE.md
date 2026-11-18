# SettleSync - Architecture & Design Documentation

## System Overview

SettleSync is a mobile-first web application for managing group expenses and travel sharing with automatic UPI settlement integration.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │  Dashboard   │  Expenses    │  Settlement  │  Chat        │  │
│  │              │              │              │              │  │
│  │  Analytics   │  Room Mgmt   │  UPI QR      │  Bottom Nav  │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
│                                                                   │
│          React Components + Tailwind CSS + Mobile UI              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │ Next.js Server        │
                    │ (API Routes)          │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        v                       v                       v
┌──────────────┐        ┌──────────────┐      ┌──────────────┐
│ Supabase     │        │ Supabase     │      │ QR Code      │
│ PostgreSQL   │        │ Realtime     │      │ Generation   │
│ Database     │        │ Subscriptions│      │ (Client)     │
│              │        │              │      │              │
│ • Profiles   │        │ • Messages   │      │ • qrcode.    │
│ • Rooms      │        │ • Live Chat  │      │   react      │
│ • Expenses   │        │ • Sync       │      │ • UPI Intent │
│ • Members    │        │   Updates    │      │              │
└──────────────┘        └──────────────┘      └──────────────┘
        │
        └─→ Row Level Security (RLS) enforced at DB level
            All queries scoped to authenticated user
```

---

## Technology Stack

### Frontend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14 | React meta-framework, SSR, routing |
| **UI Library** | React 18 | Component-based UI, hooks |
| **Styling** | Tailwind CSS 3 | Utility-first CSS, dark mode |
| **State** | Zustand | Global app state (user, rooms, loading) |
| **Icons** | Lucide React | High-quality SVG icons |
| **QR Codes** | qrcode.react | Client-side QR generation |
| **Date Utils** | date-fns | Date formatting and manipulation |
| **Language** | TypeScript | Type safety, better DX |

### Backend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Database** | PostgreSQL 14+ | Relational data, ACID transactions |
| **Auth** | Supabase Auth | User authentication, JWT |
| **Real-time** | Supabase Realtime | WebSocket subscriptions |
| **API** | Supabase REST API | SQL queries via HTTP |
| **Security** | Row Level Security | Data isolation per user |

---

## Data Architecture

### Database Schema

```sql
┌─────────────────────────────────────────────────────────────┐
│ profiles (User Accounts)                                    │
├─────────────────────────────────────────────────────────────┤
│ id (UUID, PK)          | Foreign key to auth.users          │
│ display_name (VARCHAR) | User's preferred name              │
│ upi_id (VARCHAR)       | UPI VPA (e.g., user@oksbi)        │
│ avatar_url (TEXT)      | Profile picture URL                │
│ created_at (TIMESTAMP) | Account creation time              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ rooms (Trip/Group Rooms)                                    │
├─────────────────────────────────────────────────────────────┤
│ id (UUID, PK)           | Unique room identifier             │
│ created_by (UUID, FK)   | Creator's profile ID              │
│ name (VARCHAR)          | Trip name (e.g., "Bali Trip")    │
│ description (TEXT)      | Optional trip description         │
│ invite_code (VARCHAR)   | 6-char unique code               │
│ invite_link (VARCHAR)   | Shareable link                    │
│ total_spent (DECIMAL)   | Sum of all expenses              │
│ created_at (TIMESTAMP)  | Room creation time               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ room_members (Membership)                                   │
├─────────────────────────────────────────────────────────────┤
│ id (UUID, PK)          | Unique record ID                  │
│ room_id (UUID, FK)     | Reference to rooms table          │
│ user_id (UUID, FK)     | Reference to profiles table       │
│ joined_at (TIMESTAMP)  | When user joined room             │
│ UNIQUE(room_id, user_id) | Prevent duplicate memberships   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ expenses (Expense Transactions)                             │
├─────────────────────────────────────────────────────────────┤
│ id (UUID, PK)           | Unique expense ID                │
│ room_id (UUID, FK)      | Which room this expense is for   │
│ paid_by (UUID, FK)      | Who paid (profile ID)            │
│ title (VARCHAR)         | Expense name                     │
│ description (TEXT)      | Optional details                 │
│ amount (DECIMAL)        | Total amount in rupees           │
│ category (VARCHAR)      | Food/Travel/Hotel/Shopping/Other│
│ expense_date (DATE)     | When expense occurred            │
│ created_at (TIMESTAMP)  | Record creation time             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ expense_splits (How Expense is Split)                       │
├─────────────────────────────────────────────────────────────┤
│ id (UUID, PK)          | Unique split record ID             │
│ expense_id (UUID, FK)  | Reference to expenses table       │
│ user_id (UUID, FK)     | Who owes (profile ID)             │
│ amount (DECIMAL)       | Amount this person owes           │
│ created_at (TIMESTAMP) | Record creation time              │
│ UNIQUE(expense_id, user_id) | One split per user per exp   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ room_messages (Chat Messages)                               │
├─────────────────────────────────────────────────────────────┤
│ id (UUID, PK)           | Unique message ID                │
│ room_id (UUID, FK)      | Which room (Realtime enabled)    │
│ user_id (UUID, FK)      | Who sent (profile ID)            │
│ message (TEXT)          | Message content                  │
│ created_at (TIMESTAMP)  | Timestamp (indexed DESC)         │
└─────────────────────────────────────────────────────────────┘
```

### Relationships Diagram

```
profiles (1) ──→ (many) rooms (via created_by)
             ──→ (many) expenses (via paid_by)
             ──→ (many) expense_splits (via user_id)
             ──→ (many) room_messages (via user_id)
             ──→ (many) room_members (via user_id)

rooms (1) ──→ (many) room_members
          ──→ (many) expenses
          ──→ (many) room_messages

expenses (1) ──→ (many) expense_splits

room_members (many) ──→ (1) profiles
               ──→ (1) rooms
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Sign-Up Flow                              │
└─────────────────────────────────────────────────────────────┘

1. User visits /auth
   ↓
2. User enters email, password, display name
   ↓
3. Client sends to Supabase Auth
   ↓
4. Supabase creates auth.users record
   ↓
5. Trigger: create_profile_on_signup() fires
   ↓
6. New record created in profiles table
   ↓
7. User receives confirmation email (optional)
   ↓
8. User signs in with email/password
   ↓
9. Supabase returns JWT token
   ↓
10. Token stored in secure HTTP-only cookie
    ↓
11. User redirected to dashboard (/)
    ↓
12. Dashboard checks auth status, fetches user profile
    ↓
13. Authenticated requests include JWT in Authorization header


┌─────────────────────────────────────────────────────────────┐
│                   Sign-In Flow                               │
└─────────────────────────────────────────────────────────────┘

1. User visits /auth, selects Sign In
   ↓
2. User enters email and password
   ↓
3. Client calls supabase.auth.signInWithPassword()
   ↓
4. Supabase validates credentials
   ↓
5. If valid, returns JWT token and user data
   ↓
6. Client stores token in HTTP-only cookie
   ↓
7. Client redirected to protected pages
   ↓
8. All API requests include JWT in header


┌─────────────────────────────────────────────────────────────┐
│              Authenticated Request Flow                      │
└─────────────────────────────────────────────────────────────┘

Browser Request with JWT:
┌─────────────────────────────────┐
│ GET /api/rooms                  │
│ Authorization: Bearer eyJhb... │
└─────────────────────────────────┘
        ↓
Supabase verifies JWT signature
        ↓
Extracts user ID from JWT
        ↓
auth.uid() = extracted_user_id in RLS policies
        ↓
RLS policies filter data by user:
  "SELECT * FROM rooms WHERE id IN (
     SELECT room_id FROM room_members 
     WHERE user_id = auth.uid()
  )"
        ↓
Only rooms user is member of returned
        ↓
Response with filtered data
```

---

## State Management

### Zustand Store Architecture

```typescript
// lib/store.ts
useAppStore = {
  // User state
  user: Profile | null,
  setUser: (user) => void,
  
  // Current room context
  currentRoom: Room | null,
  setCurrentRoom: (room) => void,
  
  // User's rooms list
  rooms: Room[],
  setRooms: (rooms) => void,
  
  // Loading indicator
  loading: boolean,
  setLoading: (loading) => void,
}
```

### Data Flow

```
Component renders
        ↓
useAppStore.user === null?
    ├─→ Yes: Redirect to /auth
    └─→ No: Fetch data
        ↓
useEffect fetches from Supabase
        ↓
Data received, update store
        ↓
Component re-renders with new data
        ↓
User interaction (add expense, send message)
        ↓
Optimistic update (optional)
        ↓
Send to Supabase
        ↓
Supabase validates RLS policies
        ↓
  ├─→ Valid: Update DB, broadcast realtime
  └─→ Invalid: Return 403 Forbidden
        ↓
Component refetches data
        ↓
Store updated, component re-renders
```

---

## Component Architecture

### Directory Structure

```
components/
├── BottomNav.tsx              # Navigation bar (5 tabs)
│   └── Fixed position, always visible
│
├── Dashboard.tsx              # Home page (/)
│   ├── User greeting
│   ├── Account balance
│   ├── List of trips
│   └── Quick actions
│
├── ExpenseForm.tsx            # Modal for adding expenses
│   ├── Input validation
│   ├── Member selection checkboxes
│   ├── Split calculation
│   └── Error handling
│
├── SettlementQR.tsx           # Settlement display + QR
│   ├── Calculate settlements
│   ├── Generate QR codes
│   ├── UPI link generation
│   ├── Direct intent click
│   └── Copy/download options
│
├── RoomChat.tsx               # Real-time chat
│   ├── Message fetch & subscribe
│   ├── Realtime subscriptions
│   ├── Send new messages
│   └── Auto-scroll to latest
│
└── Analytics.tsx              # Expense analytics
    ├── Total spent calculation
    ├── Category breakdown
    ├── Progress bars
    └── Recent expenses list
```

### Component Data Flow

```
Dashboard.tsx
    ├─ useEffect: fetch user profile
    ├─ useEffect: fetch user's rooms
    ├─ useState: rooms, user, loading
    ├─ render: room cards, quick actions
    └─ onclick: navigate to room or create

ExpenseForm.tsx (Modal)
    ├─ Input: roomId, members, callbacks
    ├─ Local state: formData, selectedMembers
    ├─ onSubmit: validate → create expense → create splits
    ├─ Callbacks: onSuccess (refresh), onCancel (close)
    └─ Error handling: try-catch, user feedback

SettlementQR.tsx
    ├─ Input: balances array, room name
    ├─ Compute: settlements = minimize_transactions(balances)
    ├─ onClick settlement: show QR code
    ├─ Generate UPI link: upi://pay?pa=...&am=...
    ├─ onClick "Pay": window.location.href = upiLink
    └─ Download: qrcode.react ref.download()

RoomChat.tsx
    ├─ useEffect: fetch messages for room
    ├─ useEffect: subscribe to new messages (Realtime)
    ├─ useState: messages, newMessage
    ├─ onSubmit: insert message
    ├─ Listener: auto-append new messages
    └─ Render: bubbles (left/right), auto-scroll
```

---

## Settlement Algorithm

### Balance Calculation

```javascript
// Supabase function: calculate_room_balances(room_id)

1. For each member in room:
   a. Sum all expenses PAID BY them → paid_amount
   b. Sum all expense_splits OWED BY them → owed_amount
   c. balance = paid_amount - owed_amount
   
   If balance > 0: Member is owed money
   If balance < 0: Member owes money
   If balance = 0: Settled

Example:
  Alice paid ₹1000 for food, split 3 ways:
    - Alice pays: ₹1000
    - Alice owes: ₹333.33
    - Alice balance: +₹666.67 (owed money)
  
  Bob ate, owes share:
    - Bob pays: ₹0
    - Bob owes: ₹333.33
    - Bob balance: -₹333.33 (owes money)
  
  Carol ate, owes share:
    - Carol pays: ₹0
    - Carol owes: ₹333.34
    - Carol balance: -₹333.34 (owes money)
```

### Settlement Optimization

```javascript
// Minimize number of transactions

Input: balances = [
  { user: Alice, balance: +₹666.67 },
  { user: Bob, balance: -₹333.33 },
  { user: Carol, balance: -₹333.34 },
]

Algorithm (Greedy):
1. Sort by balance descending
2. creditors = [Alice(+₹666.67)]
   debtors = [Carol(-₹333.34), Bob(-₹333.33)]

3. Loop:
   - Settlement 1: Bob → Alice: ₹333.33
     - Alice balance: +₹333.34
     - Bob balance: 0 (remove from debtors)
   
   - Settlement 2: Carol → Alice: ₹333.34
     - Alice balance: 0 (remove from creditors)
     - Carol balance: 0 (remove from debtors)

Result: 2 payments instead of 6 possible
```

---

## UPI Integration

### UPI URI Scheme

```
UPI Standard Format:
upi://pay?pa=<VPA>&pn=<NAME>&am=<AMOUNT>&cu=INR&tn=<NOTE>

Example:
upi://pay?pa=alice@okhdfcbank&pn=Alice%20Gupta&am=500.00&cu=INR&tn=Settlement

Parameters:
- pa: Virtual Payment Address (UPI ID)
- pn: Payee Name (URL encoded)
- am: Amount (with 2 decimals)
- cu: Currency (always INR for India)
- tn: Transaction Note (optional, URL encoded)
```

### Payment Flow

```
SettlementQR Component
        ↓
User clicks "Pay via UPI App"
        ↓
Generate UPI URI:
upi://pay?pa=alice@okhdfcbank&pn=Alice&am=500.00&cu=INR
        ↓
window.location.href = uriString
        ↓
Operating System intercepts upi:// scheme
        ↓
Android/iOS looks for registered UPI app handlers:
  - Google Pay
  - PhonePe
  - Paytm
  - BHIM
  - Others
        ↓
System shows app picker (if multiple apps)
Or opens default UPI app
        ↓
UPI app parses parameters:
  - Payee: alice@okhdfcbank
  - Amount: ₹500
  - Name: Alice
        ↓
App displays confirmation screen
User reviews and confirms
        ↓
Payment processed
User returned to app (or stays in UPI app)
```

### QR Code Generation

```javascript
// SettlementQR.tsx

import QRCode from 'qrcode.react';

<QRCode
  value={upiLink}        // "upi://pay?pa=..."
  size={200}             // 200x200 pixels
  level="H"              // High error correction
  includeMargin={true}   // Padding around code
/>

// User scans with phone camera
// Phone recognizes upi:// scheme
// Opens UPI app with pre-filled data
```

---

## Real-Time Chat Architecture

### Supabase Realtime Subscriptions

```typescript
// RoomChat.tsx

const subscription = supabase
  .channel(`room-${roomId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',              // Listen to new inserts
      schema: 'public',
      table: 'room_messages',
      filter: `room_id=eq.${roomId}` // Only this room
    },
    (payload) => {
      // Fetch full message with profile data
      // Append to messages state
      // Component re-renders
    }
  )
  .subscribe();

// Cleanup on unmount
return () => subscription.unsubscribe();
```

### Message Flow

```
User types message in room
        ↓
Clicks Send button
        ↓
insertMessage({
  room_id: roomId,
  user_id: currentUser.id,
  message: messageText
})
        ↓
Supabase inserts into room_messages table
        ↓
RLS policy checks:
  - Is user member of this room? ✓
  - Is message from this user? ✓
        ↓
Database broadcasts INSERT event via Websocket
        ↓
All subscribed clients receive payload:
{
  type: 'INSERT',
  new: {
    id: uuid,
    room_id: roomId,
    user_id: currentUser.id,
    message: messageText,
    created_at: timestamp
  }
}
        ↓
Client A: (sender) shows message immediately
Client B: (receiver) auto-fetches new message
          with profile data and appends
        ↓
Both clients re-render message list
        ↓
Auto-scroll to latest message
```

---

## Security Architecture

### Row Level Security (RLS) Policies

```sql
-- Example: Users can only view rooms they're members of

CREATE POLICY "Users can view rooms they're members of" ON rooms
  FOR SELECT
  USING (
    id IN (
      SELECT room_id FROM room_members 
      WHERE user_id = auth.uid()
    )
  );

-- auth.uid() = current authenticated user's UUID
-- RLS evaluated on DB server, not client
-- Bypass impossible even with API manipulation
```

### Policy Coverage

```
profiles table:
  ├─ SELECT own profile
  ├─ SELECT other members' profiles (in shared rooms)
  └─ UPDATE own profile only

rooms table:
  ├─ SELECT only rooms user is member of
  ├─ INSERT: only creator can create
  └─ UPDATE: only creator can modify

room_members table:
  ├─ SELECT members of user's rooms only
  └─ INSERT: user can add themselves only

expenses table:
  ├─ SELECT only in user's rooms
  ├─ INSERT: only in user's rooms, self as payer
  ├─ UPDATE: only if user is payer
  └─ DELETE: only if user is payer

expense_splits table:
  ├─ SELECT only for expenses in user's rooms
  └─ INSERT: only for expenses in user's rooms

room_messages table:
  ├─ SELECT only in user's rooms
  ├─ INSERT: only in user's rooms, self as sender
  └─ No UPDATE or DELETE (immutable chat)
```

### Client-Side Security

```typescript
// Always verify auth before API calls
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  redirect('/auth');
}

// Never trust client-side data for decisions
// RLS policies enforce on server

// Sensitive data should NOT be stored in localStorage
// Use HTTP-only cookies for auth tokens (Supabase does this)

// Validate inputs before sending to Supabase
// Supabase validates too, but early validation improves UX
```

---

## Performance Optimization

### Database Optimization

```sql
-- Indexes for fast queries
CREATE INDEX idx_rooms_created_by ON rooms(created_by);
CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_expenses_room_id ON expenses(room_id);
CREATE INDEX idx_room_messages_created_at ON room_messages(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_room_messages_room_id_created_at 
ON room_messages(room_id, created_at DESC);
```

### Frontend Optimization

```typescript
// Code splitting
const ExpenseForm = dynamic(() => import('@/components/ExpenseForm'));

// Lazy loading
<Suspense fallback={<Loading />}>
  <ExpensesList />
</Suspense>

// Memoization for expensive computations
const settlements = useMemo(() => calculateSettlements(balances), [balances]);

// Query optimization
- Fetch only needed fields: SELECT title, amount
- Limit results: .limit(50)
- Order by indexed column: .order('created_at')
```

### Caching Strategy

```
Browser Cache:
  - Static assets: 1 year (cache busting via hash)
  - API responses: Realtime updates (cache-first)
  - CSS/JS: Long TTL

Supabase Cache:
  - Enable query result caching in Supabase settings
  - Realtime disables caching (live updates)

Network:
  - Minimize API calls
  - Batch requests where possible
  - Use Realtime for live data (not polling)
```

---

## Error Handling

### Error Categories

```typescript
// 1. Authentication Errors
try {
  await supabase.auth.signInWithPassword(...)
} catch (err) {
  // Invalid credentials, user not found, etc.
  setError('Invalid email or password')
}

// 2. Authorization Errors (403 Forbidden)
// RLS policy violation
// User cannot access this room's data
// Handled automatically by Supabase

// 3. Database Errors (5xx)
try {
  const { data, error } = await supabase
    .from('expenses')
    .insert(...)
  if (error) throw error;
} catch (err) {
  setError('Failed to add expense. Please try again.')
}

// 4. Network Errors
// Offline, connection timeout
// Handled by Supabase client retry logic

// 5. Validation Errors
if (!title || amount <= 0) {
  setError('Please enter valid data')
}
```

### User-Facing Error Messages

```
Authentication:
  ✗ "Invalid email or password"
  ✗ "This email is already registered"

Authorization:
  ✗ "You don't have access to this room"
  (Redirects to home)

Expense:
  ✗ "Failed to add expense. Please try again."
  ✗ "Please select at least one person to split with"

Room:
  ✗ "Invalid invite code"
  ✗ "You are already a member of this trip"

Chat:
  ✗ "Failed to send message"
  (Retries automatically)
```

---

## Scalability Considerations

### Current Architecture Limits

```
Database:
  - Supabase PostgreSQL: millions of records
  - RLS policies evaluated per query (scales linearly)
  - Connection pool: 30-100 connections

Frontend:
  - List virtualization needed for 10k+ items
  - Pagination recommended for large result sets

Real-time:
  - Supabase Realtime: 100+ concurrent clients per room
  - Room model limits broadcast scope
```

### Future Scaling

```
1. Database:
   - Horizontal sharding by room_id
   - Archive old rooms to cold storage
   - Denormalization for hot queries

2. Real-time:
   - Distributed Websocket clusters
   - Message queue (Redis) for ordering

3. Frontend:
   - Virtual scrolling for large lists
   - Pagination / infinite scroll
   - Service workers for offline support

4. API:
   - GraphQL layer for flexible queries
   - caching layer (Redis)
   - Rate limiting per user
```

---

## Testing Strategy

### Unit Tests

```typescript
// Components
test('Dashboard shows user greeting', () => {
  render(<Dashboard />);
  expect(screen.getByText(/Hi, John/)).toBeInTheDocument();
});

// Utilities
test('UPI link generation', () => {
  const link = generateUPILink(settlement);
  expect(link).toMatch(/^upi:\/\/pay\?/);
});
```

### Integration Tests

```typescript
// Auth flow
test('User can sign up and log in', async () => {
  // Fill form, submit
  // Check redirect to dashboard
  // Verify profile created in DB
});

// Expense flow
test('Add expense and verify splits', async () => {
  // Create expense with 3-person split
  // Verify splits created in DB
  // Check balance calculation
});
```

### E2E Tests (Cypress/Playwright)

```javascript
// Settlement flow
test('Generate QR code and open UPI app', () => {
  cy.visit('/settle');
  cy.get('[data-testid=settlement-card]').first().click();
  cy.get('[data-testid=pay-button]').should('have.attr', 'href').and('include', 'upi://');
});
```

---

## Deployment Architecture

### Development

```
Local machine
  ↓
git push to GitHub
  ↓
Vercel receives webhook
  ↓
npm install && npm run build && npm start
  ↓
Deployed to preview URL
```

### Production

```
GitHub main branch
  ↓
Vercel auto-deploy
  ↓
Build (2-3 min)
  ↓
Tests (if configured)
  ↓
Deploy to edge network (300+ locations)
  ↓
DNS updated (instant)
  ↓
HTTPS auto-enabled (Let's Encrypt)
  ↓
Users access via cdn.vercel.net
```

### Database

```
Supabase Hosting:
  - PostgreSQL 14+ managed database
  - Automated backups (daily)
  - Read replicas available
  - Disaster recovery: RPO/RTO specified in SLA
```

---

## Monitoring & Observability

### Metrics to Track

```
User:
  - Daily Active Users (DAU)
  - Monthly Active Users (MAU)
  - User signup rate
  - Churn rate

Usage:
  - Expenses logged per day
  - Settlements completed per day
  - Chat messages per day
  - Rooms created per day

Performance:
  - Page load time (Target: <2s)
  - Time to interactive (Target: <3s)
  - API response time (Target: <200ms)
  - Error rate (Target: <0.1%)

Business:
  - Total value transacted
  - Average expense per room
  - User retention rate
  - Feature adoption rate
```

### Alerting

```
Critical:
  - Database connection errors (immediate)
  - Auth service down (immediate)
  - High error rate >5% (5 min)

Warning:
  - Response time >500ms (10 min)
  - Database CPU >80% (15 min)
  - Unusual traffic spike (realtime)
```

---

## Conclusion

SettleSync's architecture prioritizes:

1. **Security**: RLS enforces data privacy at DB level
2. **Real-time**: Realtime subscriptions for live chat
3. **Scalability**: Efficient queries, caching, pagination
4. **UX**: Mobile-first, instant feedback, error handling
5. **Maintainability**: TypeScript, modular components, clear separation of concerns

The combination of Next.js, React, Supabase, and Tailwind CSS provides a modern, maintainable stack that's easy to extend with new features.

---

**For questions about architecture, refer to individual component files or Supabase documentation.**
