# SettleSync - Quick Start Guide

Get SettleSync up and running in 10 minutes.

## 1. Prerequisites Check (2 min)

```bash
# Check Node.js is installed
node --version  # Should be 18.17+
npm --version   # Should be 9+
```

If not installed, download from https://nodejs.org/

## 2. Get Supabase Credentials (2 min)

1. Go to https://supabase.com and sign up (or log in)
2. Create a new project
3. In **Project Settings** → **API**, copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: `eyJhbGciOi...`

## 3. Setup Database (2 min)

1. In Supabase Dashboard, go to **SQL Editor**
2. Create a new query and paste `supabase/Query.sql`
3. Click **Run**
4. Go to **Database** → **Tables** → **room_messages** → Enable Realtime

## 4. Setup Environment (1 min)

Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 5. Install & Run (1 min)

```bash
npm install
npm run dev
```

Open: http://localhost:3000

## 6. Test it Out (2 min)

### Sign Up
- Go to http://localhost:3000
- Click "Sign Up"
- Enter: email, password, display name
- Click "Create Account"

### Create a Trip
- Click "Create Your First Trip"
- Enter: Trip name (e.g., "Bali 2026")
- Click "Create Trip"
- Copy the 6-digit invite code

### Add an Expense
- Click "Expenses" in bottom nav
- Click "Add Expense"
- Fill: Title, Amount, Category, Paid By, Select Members
- Click "Add Expense"

### View Settlement
- Click "Settle" in bottom nav
- Click on a settlement
- Click "Pay via UPI App" (will work on mobile with UPI app installed)
- Or scan the QR code

### Try Chat
- Click "Chat" in bottom nav
- Type and send a message
- See it appear instantly

### View Analytics
- Click "Analytics" in bottom nav
- See total spent, category breakdown, recent expenses

---

## Common Questions

### How do I join an existing trip?
1. Ask trip creator for 6-digit code
2. Click "Join a Trip" on dashboard
3. Enter code and click "Join Trip"

### How do UPI payments work?
1. View settlement on Settle tab
2. If receiver has set UPI ID, QR code appears
3. On mobile: Click "Pay via UPI App" → app opens with amount pre-filled
4. On desktop: Scan QR with phone camera

### How do I add someone's UPI ID?
- Currently: Set in profile (feature coming soon)
- UPI ID format: `username@bankcode` (e.g., `alice@oksbi`)

### What if I don't see real-time chat?
1. Ensure Realtime is enabled on `room_messages` table
2. Refresh browser
3. Try sending message again

### How do I delete an expense?
- Currently: In database only
- Feature coming soon in app UI

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Supabase error 401` | Check credentials in `.env.local` |
| `npm: command not found` | Reinstall Node.js |
| `Port 3000 in use` | Kill: `lsof -ti :3000 \| xargs kill -9` (Mac/Linux) or use different port |
| `Messages not appearing` | Enable Realtime on `room_messages` table |
| `Can't join room` | Verify invite code (6 chars, uppercase) |
| `QR code blank` | Check UPI ID is set for receiver |

---

## Next Steps

1. **Deploy to Vercel** (5 min)
   - Push to GitHub
   - Go to vercel.com
   - Import repository
   - Add environment variables
   - Deploy

2. **Invite Friends**
   - Share trip code
   - Have them join and log expenses
   - Settle payments via UPI

3. **Customize** (optional)
   - Change colors in `tailwind.config.js`
   - Add logo in `components/BottomNav.tsx`
   - Update app name

4. **Add Features** (future)
   - Receipt photos
   - Custom split percentages
   - Budget tracking
   - Expense reminders

---

## Documentation

- **Full Setup**: See `SETUP_GUIDE.md`
- **Architecture**: See `ARCHITECTURE.md`
- **README**: See `README.md`

---

## Support

- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- React: https://react.dev

---

**Ready to settle? Let's go! 💜💛**
