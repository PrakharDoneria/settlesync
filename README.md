# SettleSync ⚡

Zero-friction group expense and travel sharing web app with dynamic UPI settlement QR codes.

## Features
- **Trip Management**: Create and join trip rooms with 6-digit invite codes.
- **Persistent Trip Selection**: Selected trip is synced globally across Expenses, Settle Up, Chat, and Analytics.
- **Batch & Dynamic Expense Logging**: Add single or multiple expenses in a batch, with dynamic "ALL" split or custom splits.
- **UPI QR Settlement**: Automatically calculate balances and generate standard UPI intent links and QR codes.
- **Realtime Chat & Analytics**: Room coordination chat and expense breakdowns by category.
- **Neobrutalism Design**: Bold mobile-first UI with responsive bottom sheet navigation.

## Quick Start

### 1. Install & Configure
```bash
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### 2. Database Setup
Run `supabase/Query.sql` in your Supabase SQL Editor. It configures all tables, functions, triggers, and Row Level Security policies.

### 3. Run Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

## License
MIT
