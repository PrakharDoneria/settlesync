# SettleSync - Group Expense & Travel Sharing App

A zero-friction mobile-first web application for managing group expenses and settling payments with dynamic UPI QR codes.

## Features

- 🎯 **User Authentication** - Email/password signup and login via Supabase Auth
- 🏨 **Trip Management** - Create trips with 6-digit invite codes and join existing trips
- 💰 **Expense Tracking** - Manual expense logging with categories (Food, Travel, Hotel, Shopping, Other)
- 📊 **Analytics Dashboard** - Visual breakdown of expenses by category and trends
- 💬 **Real-time Chat** - Coordinate trip details with room members using Supabase Realtime
- 🔗 **Smart Settlements** - Automatic balance calculation and settlement recommendations
- 📱 **UPI Integration** - Generate dynamic QR codes for direct payment via UPI apps (Google Pay, PhonePe, Paytm, BHIM)
- 🎨 **Dark Mode UI** - Vibrant purple and yellow design optimized for mobile

## Tech Stack

- **Frontend**: React 18 + Next.js 14 + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **QR Generation**: `qrcode.react`
- **State Management**: Zustand
- **Icons**: Lucide React
- **Date Utilities**: date-fns

## Project Structure

```
settlesync/
├── app/                          # Next.js app directory
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Global styles
│   ├── page.tsx                 # Dashboard home
│   ├── auth/                    # Authentication pages
│   │   └── page.tsx
│   ├── expenses/                # Expense management
│   │   └── page.tsx
│   ├── settle/                  # Settlement & QR codes
│   │   └── page.tsx
│   ├── chat/                    # Room chat
│   │   └── page.tsx
│   ├── analytics/               # Expense analytics
│   │   └── page.tsx
│   └── rooms/                   # Room pages
│       ├── create/page.tsx
│       ├── join/page.tsx
│       └── [id]/page.tsx
├── components/                   # React components
│   ├── BottomNav.tsx           # Bottom navigation
│   ├── Dashboard.tsx           # Main dashboard
│   ├── ExpenseForm.tsx         # Expense input modal
│   ├── SettlementQR.tsx        # UPI QR code display
│   ├── RoomChat.tsx            # Real-time chat
│   └── Analytics.tsx           # Analytics dashboard
├── lib/
│   ├── supabase.ts             # Supabase client & types
│   └── store.ts                # Zustand store
├── supabase/                    # Database setup
│   ├── 01_schema.sql          # Tables & indexes
│   ├── 02_rls_policies.sql    # Row level security
│   └── 03_functions.sql       # Triggers & functions
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── .env.local                  # Environment variables

```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (https://supabase.com)

### 2. Create Supabase Project

1. Sign up at https://supabase.com
2. Create a new project
3. Note your Project URL and Anon Key

### 3. Initialize Database

1. Go to SQL Editor in Supabase Dashboard
2. Run the SQL files in order:
   - `supabase/01_schema.sql` - Creates tables and indexes
   - `supabase/02_rls_policies.sql` - Sets up Row Level Security
   - `supabase/03_functions.sql` - Creates triggers and functions

### 4. Setup Authentication

1. In Supabase Dashboard, go to Authentication → Providers
2. Enable Email (already enabled by default)
3. Optionally enable Google OAuth for social login

### 5. Install Dependencies

```bash
npm install
```

### 6. Configure Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Replace with your actual Supabase credentials.

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Sign Up / Sign In

- Navigate to `/auth`
- Create account with email and password
- Set your display name

### 2. Create a Trip

- Click "+" button on dashboard or go to `/rooms/create`
- Enter trip name and optional description
- Get a unique 6-digit invite code

### 3. Invite Friends

- Share the 6-digit code or use the shareable link
- Friends can join via `/rooms/join`

### 4. Log Expenses

- Go to Expenses tab
- Click "Add Expense"
- Enter amount, category, who paid, and split members
- Expense is automatically split equally

### 5. Chat

- Go to Chat tab
- Send messages to coordinate trip details
- Realtime updates via Supabase Realtime

### 6. View Analytics

- Go to Analytics tab
- See total spent, category breakdown, and recent transactions
- Visual progress bars for each category

### 7. Settle Payments

- Go to Settle Up tab
- Select a settlement
- View or download QR code
- Click "Pay via UPI App" to open UPI intent
- Or share the QR code for others to scan

## UPI Integration

SettleSync generates **standards-compliant UPI intent URIs**:

```
upi://pay?pa=<VPA>&pn=<NAME>&am=<AMOUNT>&cu=INR
```

### How It Works

1. **QR Code Generation**: Each settlement is encoded as a QR code
2. **Direct Intent**: Clicking "Pay via UPI App" triggers the UPI scheme
3. **App Opening**: Device opens installed UPI apps (Google Pay, PhonePe, Paytm, BHIM)
4. **Auto-fill**: Payee VPA, name, and exact amount are pre-filled
5. **Payment**: User confirms payment in their chosen UPI app

### User Flow

```
Dashboard → Settle Up → Select Settlement → Pay via UPI App
                                    ↓
                        UPI Intent Triggered
                                    ↓
                        UPI App Opens (auto-selected)
                                    ↓
                        Fields Pre-filled
                        (Payee, Amount)
                                    ↓
                        User Confirms Payment
```

## Database Schema

### Tables

- **profiles** - User accounts and UPI IDs
- **rooms** - Trip/group rooms with invite codes
- **room_members** - Membership tracking
- **expenses** - Individual expense transactions
- **expense_splits** - How expenses are split among members
- **room_messages** - Chat messages (Realtime enabled)

### Security

- Row Level Security (RLS) ensures:
  - Users only see rooms they're members of
  - Members only see other members' profiles
  - Message access is limited to room members
  - Expense modifications limited to payer

## API Reference

### Supabase Functions

#### `generate_invite_code()`

Generates unique 6-character alphanumeric invite codes.

```sql
SELECT generate_invite_code();
```

#### `calculate_room_balances(room_id_param UUID)`

Calculates net balance for each member in a room.

```sql
SELECT * FROM calculate_room_balances('room-id');
```

Returns:
```
user_id | display_name | upi_id | balance
```

- Positive balance = member is owed money
- Negative balance = member owes money

## Mobile Optimization

- Bottom navigation for easy thumb access
- Touch-friendly button sizes (48px minimum)
- Responsive grid layouts
- Optimized for 375px-428px screens
- Dark mode reduces eye strain
- Fast page transitions

## Performance

- Client-side QR generation (no API calls)
- Real-time updates via Supabase subscriptions
- Optimized images and assets
- Lazy loading for large lists
- PostgreSQL indexes on frequent queries

## Security Considerations

- Passwords hashed by Supabase Auth
- JWT tokens for session management
- RLS policies enforce data privacy
- No sensitive data stored in browser storage
- HTTPS required for production
- User UPI IDs optional (not required for app)

## Future Enhancements

- [ ] Recurring expense templates
- [ ] Expense receipt photos
- [ ] Split calculator with custom splits
- [ ] Expense history and statistics
- [ ] Multiple currency support
- [ ] Expense tags and filters
- [ ] Settlement payment status tracking
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Expense budget tracking

## Troubleshooting

### "Invalid invite code" error

- Ensure code is exactly 6 characters
- Codes are case-insensitive (automatically converted to uppercase)
- Verify the code hasn't been deleted

### UPI Payment Not Opening

- Ensure you have a UPI app installed (Google Pay, PhonePe, etc.)
- Check if UPI ID is properly set in profile
- Try copying and pasting the link manually

### Messages Not Updating

- Check if Realtime is enabled in Supabase
- Verify room_messages table has real-time configured
- Check browser console for errors

### Database Connection Issues

- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Ensure Supabase project is running
- Check network connectivity

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs

---

**Happy Settling! 💜💛**
