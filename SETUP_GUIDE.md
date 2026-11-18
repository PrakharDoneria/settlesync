# SettleSync - Complete Setup & Deployment Guide

This guide walks you through setting up SettleSync from scratch, configuring Supabase, and deploying to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Local Development](#local-development)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: 18.17+ or 19+
  - Download: https://nodejs.org/
  - Verify: `node --version` and `npm --version`

- **Git** (optional but recommended)
  - Download: https://git-scm.com/

- **Text Editor/IDE**
  - VS Code (recommended): https://code.visualstudio.com/
  - Cursor: https://cursor.sh/
  - Any modern editor works

### Supabase Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with email or GitHub
4. Create a new organization
5. Create a new project (region: closest to you)
6. Wait for project to initialize (2-3 minutes)

---

## Supabase Setup

### Step 1: Get Your Credentials

1. In Supabase Dashboard, go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key** (public key): `eyJhbGciOiJIUzI1NiIs...`

### Step 2: Create Database Tables

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query** and paste the contents of `supabase/01_schema.sql`
3. Click **Run** and verify success
4. Repeat for `supabase/02_rls_policies.sql`
5. Repeat for `supabase/03_functions.sql`

### Step 3: Enable Real-time

1. Go to **Database** → **Tables**
2. Click `room_messages` table
3. Scroll to **Realtime** section
4. Click **Enable Realtime**

### Step 4: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Email provider is enabled by default
3. (Optional) Enable Google OAuth:
   - Go to Google Cloud Console
   - Create OAuth 2.0 credentials
   - Set redirect URI: `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Secret
   - Paste into Supabase provider settings

### Step 5: Test Database Connection

Run this in SQL Editor to verify setup:

```sql
-- Test tables exist
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM rooms;
SELECT COUNT(*) FROM expenses;

-- Test function
SELECT generate_invite_code();

-- Test RLS is enabled
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'rooms', 'room_members', 'expenses', 'expense_splits', 'room_messages');
```

---

## Local Development

### Step 1: Clone/Download Project

```bash
# If using git
git clone <your-repo-url>
cd settlesync

# Or extract the project folder
cd settlesync
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- `react` & `react-dom` - UI framework
- `next` - React framework
- `tailwindcss` - Styling
- `@supabase/supabase-js` - Database client
- `qrcode.react` - QR code generation
- `lucide-react` - Icons
- `zustand` - State management
- `date-fns` - Date utilities

### Step 3: Configure Environment

Create `.env.local` in project root:

```env
# Get these from Supabase Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Local development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: Keep `.env.local` in `.gitignore` - never commit credentials!

### Step 4: Start Development Server

```bash
npm run dev
```

Output:
```
> settlesync@0.1.0 dev
> next dev

▲ Next.js 14.0.0
- Local: http://localhost:3000
```

### Step 5: Open in Browser

Visit: http://localhost:3000

You should see:
- SettleSync landing page
- Authentication flows
- Dashboard (after login)

---

## Testing

### Manual Testing Checklist

#### Authentication (✓ Required)

- [ ] Sign up with email
- [ ] Receive email (optional email verification)
- [ ] Sign in with created account
- [ ] Logout works
- [ ] Cannot access /expenses, /settle, /chat without login

#### Room Management (✓ Required)

- [ ] Create a trip
- [ ] Verify invite code generates (6 characters)
- [ ] Copy invite code works
- [ ] View room members
- [ ] Join room with valid code
- [ ] Cannot join with invalid code

#### Expenses (✓ Required)

- [ ] Add expense with all fields
- [ ] Expense appears in list
- [ ] Split among multiple members calculates correctly
- [ ] View expenses ordered by date
- [ ] Category properly categorized

#### Settlement (✓ Required)

- [ ] Settlements calculate correctly
- [ ] QR code generates
- [ ] UPI link format is correct: `upi://pay?pa=...`
- [ ] Clicking "Pay via UPI App" attempts to open UPI app
- [ ] Can copy UPI link to clipboard

#### Chat (✓ Required)

- [ ] Send message in room
- [ ] Message appears immediately
- [ ] Other users see new messages (if two browsers)
- [ ] Message history loads on page visit
- [ ] Sender name displays correctly

#### Analytics (✓ Required)

- [ ] Total spent calculates correctly
- [ ] Category breakdown shows all categories
- [ ] Percentages are accurate
- [ ] Progress bars display
- [ ] Recent expenses list shows correct data

### Browser Testing

Test on multiple browsers:

```
Desktop:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Mobile:
- Chrome Mobile
- Safari Mobile
- Samsung Internet
```

### Performance Testing

Check performance metrics:

```bash
# Build for production
npm run build

# Start production server
npm start

# Open in browser and check:
# - First Contentful Paint (FCP): < 1s
# - Largest Contentful Paint (LCP): < 2.5s
# - Cumulative Layout Shift (CLS): < 0.1
```

### API Testing (Supabase RLS)

Verify Row Level Security:

```sql
-- As authenticated user with email user@example.com:

-- Should see only their profile
SELECT * FROM profiles WHERE id = current_user_id;

-- Should see only rooms they're members of
SELECT * FROM rooms WHERE id IN (
  SELECT room_id FROM room_members WHERE user_id = current_user_id
);

-- Should NOT see other users' rooms
-- (Query should return empty if not a member)
```

---

## Deployment

### Option 1: Vercel (Recommended for Next.js)

#### Step 1: Prepare for Deployment

```bash
# Ensure build succeeds
npm run build

# No errors should appear
```

#### Step 2: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: SettleSync MVP"
git branch -M main
git remote add origin https://github.com/prakhardoneria/settlesync.git
git push -u origin main
```

#### Step 3: Deploy on Vercel

1. Go to https://vercel.com
2. Click "Import Project"
3. Select your GitHub repository
4. Vercel auto-detects Next.js
5. Click "Environment Variables"
6. Add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   ```
7. Click "Deploy"
8. Wait for build (2-3 minutes)

#### Step 4: Configure Supabase for Production

In Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Add your Vercel URL to **Site URL**:
   ```
   https://your-domain.vercel.app
   ```
3. Add redirect URL:
   ```
   https://your-domain.vercel.app/auth/callback
   ```

### Option 2: Docker + Any Cloud Provider

#### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### Build and Push

```bash
# Build image
docker build -t settlesync:latest .

# Run locally
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs... \
  settlesync:latest
```

### Option 3: Railway, Render, or Heroku

Each platform has different steps, but generally:

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push

---

## Post-Deployment Checklist

- [ ] Update `NEXT_PUBLIC_APP_URL` to production URL
- [ ] Test auth works (signup/login)
- [ ] Test database queries work
- [ ] Test real-time chat
- [ ] Test QR code generation
- [ ] Verify HTTPS is enabled
- [ ] Enable email verification in Supabase (optional)
- [ ] Setup custom domain (optional)
- [ ] Enable backups in Supabase

---

## Troubleshooting

### Build Errors

#### Error: `Module not found: 'next'`

**Solution:**
```bash
npm install
npm run dev
```

#### Error: `Cannot find module '@supabase/supabase-js'`

**Solution:**
```bash
npm install @supabase/supabase-js
```

### Runtime Errors

#### Error: `Supabase client error: 401`

**Cause**: Invalid credentials in `.env.local`

**Solution**:
1. Go to Supabase Dashboard → Project Settings → API
2. Copy exact values (no spaces)
3. Paste into `.env.local`
4. Restart dev server: `npm run dev`

#### Error: `UPI app not opening`

**Cause**: No UPI app installed on device, or UPI ID not set

**Solution**:
1. Install Google Pay, PhonePe, or Paytm
2. Have receiver set UPI ID in profile
3. Test on actual mobile device or Android emulator

#### Error: `Messages not appearing in chat`

**Cause**: Real-time not enabled on `room_messages` table

**Solution**:
1. Go to Supabase → Database → Tables
2. Click `room_messages`
3. Scroll to Realtime
4. Click **Enable Realtime**

### Performance Issues

#### Page loading slowly

**Solution**:
1. Check Network tab in DevTools
2. Look for slow API calls
3. Verify Supabase project is in same region as user
4. Check if indexes exist in database

#### QR code not generating

**Solution**:
1. Check browser console for errors
2. Verify `qrcode.react` is installed
3. Verify settlement data is valid
4. Check if QR library is loaded: DevTools → Network → look for qrcode

### Authentication Issues

#### Email verification not working

**Solution**:
1. Check spam folder
2. Verify sender email in Supabase auth settings
3. Enable SMTP if needed

#### Google OAuth redirect fails

**Solution**:
1. Verify redirect URI matches in Google Cloud & Supabase
2. Check if app is authorized on Google Cloud
3. Ensure OAuth consent screen is configured

---

## Development Tips

### Hot Reload

Changes automatically reload in browser while dev server runs.

### Database Changes

After modifying schema:

1. Update SQL in `supabase/*.sql`
2. Run in Supabase SQL Editor
3. Refresh browser

### Performance Profiling

```bash
# Create optimized build
npm run build

# Analyze bundle size
npm install --save-dev @next/bundle-analyzer

# In next.config.js, add:
# const withBundleAnalyzer = require('@next/bundle-analyzer')({
#   enabled: process.env.ANALYZE === 'true',
# })
# module.exports = withBundleAnalyzer(nextConfig)

# Run analysis
ANALYZE=true npm run build
```

### Debugging

```bash
# Add to any .tsx file
console.log('Variable:', variable);

# Check browser DevTools Console (F12)
# Set breakpoints and step through code
```

---

## Production Optimization

### Enable Caching

In `next.config.js`:
```javascript
module.exports = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=3600',
        },
      ],
    },
  ],
}
```

### Database Optimization

```sql
-- Verify indexes exist
SELECT * FROM pg_indexes WHERE tablename IN ('expenses', 'rooms', 'room_members');

-- Add missing indexes if needed
CREATE INDEX idx_room_messages_room_id_created_at 
ON room_messages(room_id, created_at DESC);
```

### Monitor Performance

1. **Vercel Analytics**: Automatic for Vercel deployments
2. **Supabase Metrics**: Check in Dashboard → Monitoring
3. **Error Tracking**: Use Sentry or similar

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React**: https://react.dev
- **PostgreSQL**: https://www.postgresql.org/docs/

---

## Next Steps

After successful deployment:

1. **Collect User Feedback**
   - Create feedback form
   - Monitor error logs
   - Track feature requests

2. **Implement Analytics**
   - Track user behavior
   - Monitor performance
   - A/B test features

3. **Add Features**
   - Recurring expenses
   - Receipt photos
   - Custom split percentages
   - Budget tracking

4. **Scale Infrastructure**
   - Add CDN for static assets
   - Implement caching strategies
   - Monitor database performance

---

**Your SettleSync app is now ready for production! 🚀**
