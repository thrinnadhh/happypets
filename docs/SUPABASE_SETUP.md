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
10. `supabase/migrations/010_banners_storage.sql`
11. `supabase/migrations/011_validation_guards.sql`
12. `supabase/migrations/012_cart_validation_trigger.sql`
13. `supabase/migrations/013_product_life_stage.sql`
14. `supabase/migrations/014_coupons_admin_manage.sql`
15. `supabase/migrations/015_security_hardening.sql`
16. `supabase/migrations/016_delivery_pricing_tomtom.sql`

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

Deploy these Supabase Edge Functions for checkout and delivery pricing:

1. `supabase/functions/create-razorpay-order`
2. `supabase/functions/verify-razorpay-payment`
3. `supabase/functions/quote-delivery`
4. `supabase/functions/search-delivery-addresses`
5. `supabase/functions/auto-cancel-orders`

Make sure the following function secrets are available in Supabase:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` or `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `TOMTOM_API_KEY`

## Browser-side TomTom map pinning

The admin delivery settings page and the customer checkout page now support map pin selection.

To enable that UI in the Vite app, add one of these repo-root variables to `.env.local`:

- `VITE_TOMTOM_API_KEY`
- `NEXT_PUBLIC_TOMTOM_API_KEY`

This browser-visible key is used only for:

- rendering TomTom map tiles
- reverse geocoding a clicked or dragged pin into a readable address

The server-side delivery quote and route pricing still use the Supabase Edge Function secret:

- `TOMTOM_API_KEY`
