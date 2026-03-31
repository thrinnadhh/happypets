# Supabase Setup

## Environment

The Vite app now supports both of these variable styles:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Because `apps/web` is nested, Vite is configured to read `.env.local` from the repo root.

## Run the repo-side migrations

Apply these Supabase SQL files in order:

1. `supabase/migrations/001_core_tables.sql`
2. `supabase/migrations/002_orders_cart.sql`
3. `supabase/migrations/003_engagement.sql`
4. `supabase/migrations/004_stock_rpcs.sql`
5. `supabase/migrations/005_product_placement.sql`
6. `supabase/migrations/006_supabase_auth_roles_alignment.sql`
7. `supabase/migrations/007_supabase_rls_policies.sql`
8. `supabase/migrations/008_storefront_commerce_extensions.sql`
9. `supabase/migrations/009_expand_banner_slots.sql`

## Promote the first superadmin

1. Sign up through the app as a normal customer account.
2. In Supabase SQL editor, run:

```sql
update public.profiles
set role = 'superadmin',
    approved = true
where email = 'your-email@example.com';
```

3. Sign out and sign back in.
4. You should then land on `/superadmin/dashboard`.

## Deploy Edge Functions

Deploy these Supabase Edge Functions for Razorpay checkout:

1. `supabase/functions/create-razorpay-order`
2. `supabase/functions/verify-razorpay-payment`
3. `supabase/functions/auto-cancel-orders`

Make sure the following function secrets are available in Supabase:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` or `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
