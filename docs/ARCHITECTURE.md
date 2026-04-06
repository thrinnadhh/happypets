# Architecture — thehappypets.in

## System Architecture Diagram

┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                      │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │  Web Browser  │    │  Mobile App  │    │  Admin Dashboard     │  │
│  │  (Next.js)    │    │  (Expo RN)   │    │  (Next.js /admin)    │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘  │
└─────────┼───────────────────┼───────────────────────┼──────────────┘
│                   │                       │
▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE (DNS + CDN + WAF)                    │
│                     thehappypets.in → Vercel bom1                   │
└────────────────────────────────┬────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────┐
│                     VERCEL (Mumbai bom1)                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Next.js 14 App Router                       │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│  │  │ Server       │  │ API Route    │  │ Middleware        │  │   │
│  │  │ Components   │  │ Handlers     │  │ (Auth + Role      │  │   │
│  │  │ (RSC)        │  │ (/api/*)     │  │  Gate + Rate      │  │   │
│  │  │              │  │              │  │  Limit)           │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │   │
│  └─────────┼────────────────┼──────────────────────────────────┘   │
└────────────┼────────────────┼──────────────────────────────────────┘
│                │
▼                ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICES                             │
│                                                                │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  Supabase        │  │  Upstash     │  │  Cloudinary     │  │
│  │  (ap-south-1)    │  │  Redis       │  │  (Image CDN)    │  │
│  │                  │  │  (ap-south-1)│  │                 │  │
│  │  ┌────────────┐  │  │              │  │  - Auto WebP    │  │
│  │  │ PostgreSQL │  │  │  - Sessions  │  │  - Auto AVIF    │  │
│  │  ├────────────┤  │  │  - Cache     │  │  - Responsive   │  │
│  │  │ Auth       │  │  │    Limits    │  │    transforms   │  │
│  │  ├────────────┤  │  │  - Cart      │  │                 │  │
│  │  │ Realtime   │  │  │    (guest)   │  └─────────────────┘  │
│  │  ├────────────┤  │  │              │                       │
│  │  │ Storage    │  │  └──────────────┘  ┌─────────────────┐  │
│  │  └────────────┘  │                    │  Resend         │  │
│  └─────────────────┘                    │  (Transactional  │  │
│                                          │   Email)          │  │
│                                          └─────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Razorpay (Payments)                                     │  │
│  │  - UPI  - Cards  - NetBanking  - Wallets                │  │
│  │  - Webhook → /api/payments/webhook                       │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘

---

## Data Flow Diagrams

### 1. Authentication Flow


Customer                    Next.js Middleware       Supabase Auth        PostgreSQL
│                              │                       │                    │
├──POST /api/auth/register────►│                       │                    │
│  {email, password, name}     │                       │                    │
│                              ├──signUp()────────────►│                    │
│                              │                       ├──INSERT users──────►│
│                              │                       │◄──user record──────┤
│                              │                       │                    │
│                              │                       ├──INSERT profiles───►│
│                              │                       │  (via trigger)      │
│                              │◄──{session, user}─────┤                    │
│                              │                       │                    │
│                              ├──Set HttpOnly cookie  │                    │
│◄──201 {user}────────────────┤                       │                    │
│                              │                       │                    │
├──GET /admin/products────────►│                       │                    │
│                              ├──Verify JWT cookie    │                    │
│                              ├──Check role in DB─────┼───────────────────►│
│                              │◄──role: "admin"───────┼───────────────────┤
│                              ├──Check suspended flag │                    │
│                              │  (if suspended → 403) │                    │
│◄──200 Page HTML─────────────┤                       │                    │
Admin Suspension Flow:
SuperAdmin                  API Route                Redis                PostgreSQL
│                              │                    │                    │
├──POST /api/admin/suspend────►│                    │                    │
│  {admin_id, reason}          │                    │                    │
│                              ├──UPDATE profiles───┼───────────────────►│
│                              │  SET suspended=true │                    │
│                              │                    │                    │
│                              ├──UPDATE products───┼───────────────────►│
│                              │  SET visible=false  │                    │
│                              │  WHERE shop=admin's │                    │
│                              │                    │                    │
│                              ├──Invalidate session►│                    │
│                              │  DEL session:{id}   │                    │
│                              │                    │                    │
│                              ├──Send email (Resend)│                    │
│◄──200 {success}─────────────┤                    │                    │

### 2. Product Browsing Flow


Customer                    Next.js (RSC)            Redis Cache          PostgreSQL
│                              │                    │                    │
├──GET /products?cat=dog-food──►│                    │                    │
│                              │                    │                    │
│                              ├──GET cache:products:│                    │
│                              │  dog-food:page1────►│                    │
│                              │                    │                    │
│                   ┌──────────┼── CACHE HIT? ──────┤                    │
│                   │ YES      │                    │                    │
│                   │          │◄──cached JSON───────┤                    │
│                   │          │                    │                    │
│                   │ NO       │                    │                    │
│                   │          ├──SELECT products────┼───────────────────►│
│                   │          │  WHERE category=    │                    │
│                   │          │  'dog-food'         │                    │
│                   │          │  AND visible=true   │◄──rows────────────┤
│                   │          │  AND deleted_at     │                    │
│                   │          │  IS NULL            │                    │
│                   │          │                    │                    │
│                   │          ├──SET cache (TTL 60s)►│                    │
│                   └──────────┤                    │                    │
│                              │                    │                    │
│                              ├──Render RSC HTML   │                    │
│◄──200 Streamed HTML────────┤                    │                    │

### 3. Checkout + Payment Flow


Customer                    Next.js API              Razorpay             PostgreSQL
│                              │                    │                    │
├──POST /api/checkout─────────►│                    │                    │
│  {items, address}            │                    │                    │
│                              ├──Validate cart items┼───────────────────►│
│                              │  (check stock,      │◄──stock data──────┤
│                              │   verify prices)    │                    │
│                              │                    │                    │
│                              ├──INSERT order───────┼───────────────────►│
│                              │  (status: pending)  │                    │
│                              │                    │                    │
│                              ├──Create Razorpay ──►│                    │
│                              │  Order              │                    │
│                              │◄──{order_id,────────┤                    │
│                              │   amount, key}      │                    │
│◄──200 {razorpay_order}──────┤                    │                    │
│                              │                    │                    │
│──Open Razorpay Checkout ────┼────────────────────►│                    │
│  (client-side SDK)          │                    │                    │
│◄──Payment complete──────────┼────────────────────┤                    │
│                              │                    │                    │
├──POST /api/payments/verify──►│                    │                    │
│  {razorpay_order_id,        │                    │                    │
│   razorpay_payment_id,      ├──Verify signature──►│                    │
│   razorpay_signature}       │◄──valid/invalid─────┤                    │
│                              │                    │                    │
│                              ├──UPDATE order───────┼───────────────────►│
│                              │  status: confirmed  │                    │
│                              ├──Decrement stock────┼───────────────────►│
│                              ├──Send confirmation  │                    │
│                              │  email (Resend)     │                    │
│◄──200 {order_confirmed}─────┤                    │                    │
│                              │                    │                    │
│         ┌────────────────────│                    │                    │
│         │ ASYNC WEBHOOK      │                    │                    │
│         │                    │◄──Webhook: payment  │                    │
│         │                    │   captured/failed───┤                    │
│         │                    ├──Verify webhook sig  │                    │
│         │                    ├──UPDATE payment──────┼───────────────────►│
│         │                    │  record              │                    │
│         └────────────────────│                    │                    │

### 4. Admin Operations Flow


Admin                       Next.js API              Redis                PostgreSQL
│                              │                    │                    │
├──POST /api/products─────────►│                    │                    │
│  {name, price, images,      │                    │                    │
│   category, brand, stock}   │                    │                    │
│                              │                    │                    │
│                              ├──Verify role=admin  │                    │
│                              ├──Validate with Zod  │                    │
│                              │                    │                    │
│                              ├──Upload images──────┼──(Cloudinary)     │
│                              │◄──image URLs────────┤                    │
│                              │                    │                    │
│                              ├──INSERT product─────┼───────────────────►│
│                              │  (shop_id = admin's │                    │
│                              │   shop, auto-set)   │                    │
│                              │                    │                    │
│                              ├──Invalidate cache──►│                    │
│                              │  DEL cache:products:*│                   │
│                              │  DEL cache:homepage  │                   │
│                              │                    │                    │
│◄──201 {product}────────────┤                    │                    │
│                              │                    │                    │
├──GET /api/shops/other-id ───►│                    │                    │
│  (read-only cross-shop)     │                    │                    │
│                              ├──Verify role=admin  │                    │
│                              ├──SELECT products────┼───────────────────►│
│                              │  WHERE shop_id=     │◄──rows────────────┤
│                              │  other-id           │                    │
│                              │  (READ ONLY, no     │                    │
│                              │   mutations allowed)│                    │
│◄──200 {products}───────────┤                    │                    │

---

## Database Entity Relationships


┌─────────────────────────────────────────────────────────────────┐
│                     ENTITY RELATIONSHIP DIAGRAM                  │
└─────────────────────────────────────────────────────────────────┘
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│   profiles   │       │      shops       │       │  categories  │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id (uuid) PK │       │ id (uuid) PK     │       │ id (uuid) PK │
│ user_id FK ──┼──►    │ name             │       │ name         │
│   auth.users │       │ slug             │       │ slug         │
│ role (enum)  │       │ description      │       │ parent_id FK─┼──► self
│ full_name    │       │ logo_url         │       │ image_url    │
│ phone        │       │ is_active        │       │ sort_order   │
│ avatar_url   │       │ created_at       │       │ created_at   │
│ shop_id FK ──┼──────►│ updated_at       │       │ updated_at   │
│ is_suspended │       └────────┬─────────┘       └──────┬───────┘
│ suspended_at │                │                         │
│ suspended_by │                │ 1:N                     │ 1:N
│ created_at   │                │                         │
│ updated_at   │                ▼                         │
└──────┬───────┘       ┌──────────────────┐              │
│               │    products      │              │
│               ├──────────────────┤              │
│               │ id (uuid) PK     │◄─────────────┘
│               │ shop_id FK ──────┼──► shops
│               │ category_id FK ──┼──► categories
│               │ brand_id FK ─────┼──► brands
│               │ name             │
│               │ slug             │
│               │ description      │
│               │ price_paise (int)│    ┌──────────────┐
│               │ compare_price    │    │    brands    │
│               │ sku              │    ├──────────────┤
│               │ stock_quantity   │    │ id (uuid) PK │
│               │ weight_grams     │    │ name         │
│               │ images (jsonb)   │    │ slug         │
│               │ is_visible       │    │ logo_url     │
│               │ is_featured      │    │ shop_id FK   │
│               │ is_trending      │    │ created_at   │
│               │ tags (text[])    │    │ updated_at   │
│               │ metadata (jsonb) │    └──────────────┘
│               │ deleted_at       │
│               │ created_at       │
│               │ updated_at       │
│               └──┬──────┬────────┘
│                  │      │
│          1:N     │      │  1:N
│                  ▼      │
│         ┌─────────────┐ │     ┌─────────────────────┐
│         │   reviews   │ │     │  product_variants   │
│         ├─────────────┤ │     ├─────────────────────┤
│         │ id (uuid) PK│ │     │ id (uuid) PK        │
│         │ product_id  │ │     │ product_id FK       │
│         │ user_id FK ─┼─┘     │ name (e.g., "3kg")  │
├────────►│ rating (1-5)│       │ price_paise         │
│         │ comment     │       │ stock_quantity      │
│         │ is_approved │       │ sku                 │
│         │ created_at  │       │ created_at          │
│         └─────────────┘       └─────────────────────┘
│
│          ┌──────────────────┐        ┌───────────────────┐
│          │      orders      │        │    order_items    │
│          ├──────────────────┤        ├───────────────────┤
├─────────►│ id (uuid) PK     │◄───────│ id (uuid) PK     │
│          │ user_id FK       │   1:N  │ order_id FK       │
│          │ order_number     │        │ product_id FK     │
│          │ status (enum)    │        │ variant_id FK     │
│          │ subtotal_paise   │        │ shop_id FK        │
│          │ tax_paise        │        │ shipping_paise   │
│          │ total_paise      │        │ quantity          │
│          │ shipping_address │        │ unit_price_paise  │
│          │  (jsonb)         │        │ total_paise       │
│          │ razorpay_order_id│        │ product_snapshot  │
│          │ payment_status   │        │  (jsonb)          │
│          │ paid_at          │        │ created_at        │
│          │ notes            │        └───────────────────┘
│          │ created_at       │
│          │ updated_at       │
│          └──────────────────┘
│
│          ┌──────────────────┐        ┌───────────────────┐
│          │    cart_items    │        │    wishlists      │
│          ├──────────────────┤        ├───────────────────┤
├─────────►│ id (uuid) PK     │        │ id (uuid) PK     │
├─────────►│ user_id FK       │        │ user_id FK ◄─────┤
│          │ product_id FK    │        │ product_id FK     │
│          │ variant_id FK    │        │ created_at        │
│          │ quantity         │        └───────────────────┘
│          │ created_at       │
│          │ updated_at       │
│          └──────────────────┘
│
│          ┌──────────────────┐        ┌───────────────────┐
│          │    addresses     │        │  homepage_sections│
│          ├──────────────────┤        ├───────────────────┤
└─────────►│ id (uuid) PK     │        │ id (uuid) PK     │
│ user_id FK       │        │ type (enum)       │
│ label            │        │  recommended |    │
│ full_name        │        │  trending         │
│ phone            │        │ product_id FK     │
│ address_line1    │        │ sort_order        │
│ address_line2    │        │ added_by FK       │
│ city             │        │ created_at        │
│ state            │        └───────────────────┘
│ pincode          │
│ is_default       │        ┌───────────────────┐
│ created_at       │        │    payments       │
└──────────────────┘        ├───────────────────┤
│ id (uuid) PK     │
┌──────────────────┐        │ order_id FK       │
│   shop_tags     │        │ razorpay_payment_id│
├──────────────────┤        │ razorpay_order_id │
│ id (uuid) PK     │        │ method            │
│ name             │        │ amount_paise      │
│ slug             │        │ currency (INR)    │
│ created_at       │        │ status            │
└──────────────────┘        │ webhook_payload   │
│  (jsonb)          │
┌──────────────────┐        │ created_at        │
│ product_shop_tags│        └───────────────────┘
├──────────────────┤
│ product_id FK    │
│ shop_tag_id FK   │
│ PK (composite)   │
└──────────────────┘
ENUMS:

* user_role: 'superadmin' | 'admin' | 'customer'
* order_status: 'pending' | 'confirmed' | 'processing' | 'shipped' |
'delivered' | 'cancelled' | 'refunded'
* payment_status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded'
* homepage_section_type: 'recommended' | 'trending'


---

## Caching Strategy


┌────────────────────────┬──────────┬────────────┬──────────────────────────┐
│ Key Pattern            │ TTL      │ Invalidated│ Source                   │
├────────────────────────┼──────────┼────────────┼──────────────────────────┤
│ hp:categories          │ 24hr     │ On category│ GET /api/categories      │
│                        │          │ CRUD       │                          │
├────────────────────────┼──────────┼────────────┼──────────────────────────┤
│ hp:products:{cat}:     │ 60s      │ On product │ GET /api/products        │
│  {page}:{sort}         │          │ CRUD       │                          │
├────────────────────────┼──────────┼────────────┼──────────────────────────┤
│ hp:product:{slug}      │ 60s      │ On product │ GET /api/products/:slug  │
│                        │          │ update     │                          │
├────────────────────────┼──────────┼────────────┼──────────────────────────┤
│ hp:homepage:recommended│ 5min     │ On section │ GET /api/homepage        │
│                        │          │ update     │                          │
├────────────────────────┼──────────┼────────────┼──────────────────────────┤
│ hp:homepage:trending   │ 5min     │ On section │ GET /api/homepage        │
│                        │          │ update     │                          │
├────────────────────────┼──────────┼────────────┼──────────────────────────┤
│ hp:shops               │ 1hr      │ On shop    │ GET /api/shops           │
│                        │          │ CRUD       │                          │
├────────────────────────┼──────────┼────────────┼──────────────────────────┤
│ hp:brands:{shop_id}    │ 1hr      │ On brand   │ GET /api/brands          │
│                        │          │ CRUD       │                          │
├────────────────────────┼──────────┼────────────┼──────────────────────────┤
│ hp:cart:{user_id}      │ 7d       │ On cart    │ Cart operations          │
│ (guest: session-based) │          │ mutation   │ (also persisted in DB)   │
├────────────────────────┼──────────┼────────────┼──────────────────────────┤
│ hp:session:{user_id}   │ 1hr      │ On logout/ │ Auth middleware          │
│                        │          │ suspend    │                          │
├────────────────────────┼──────────┼────────────┼──────────────────────────┤
│ hp:ratelimit:{ip}:     │ 1min     │ Auto-expire│ Rate limit middleware    │
│  {route}               │          │            │                          │
├────────────────────────┼──────────┼────────────┼──────────────────────────┤
│ hp:search:{query_hash} │ 30s      │ On product │ GET /api/search          │
│                        │          │ CRUD       │                          │
└────────────────────────┴──────────┴────────────┴──────────────────────────┘
Cache Invalidation Strategy:

* Use cache tags (key prefixes) for bulk invalidation
* Product CRUD → invalidate: hp:products:, hp:product:{slug},
hp:homepage:, hp:search:*
* Admin suspension → invalidate: hp:products:* (for that shop),
hp:session:{admin_user_id}
* Stale-while-revalidate pattern: serve stale, refresh async


---

## Mobile vs Web — Shared Logic Strategy


┌─────────────────────────────────────────────────────────┐
│                  packages/shared/                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    types/     │  │  validators/ │  │  constants/  │  │
│  │              │  │              │  │              │  │
│  │ Product      │  │ Zod schemas  │  │ Categories   │  │
│  │ Order        │  │ shared       │  │ Roles        │  │
│  │ User         │  │ between web  │  │ Order status │  │
│  │ Cart         │  │ + mobile +   │  │ Config       │  │
│  │ API shapes   │  │ API routes   │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                    utils/                          │   │
│  │  price.ts  — formatINR(paise), calcTax()          │   │
│  │  slug.ts   — generateSlug(), parseSlug()          │   │
│  │  date.ts   — formatDate(), relativeTime()         │   │
│  │  pagination — buildPaginationMeta()               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
│                │
imported by         imported by
│                │
▼                ▼
┌──────────────┐  ┌──────────────┐
│   apps/web   │  │  apps/mobile │
│              │  │              │
│ Web-specific:│  │ Mobile-only: │
│ - RSC pages  │  │ - Navigation │
│ - shadcn/ui  │  │ - NativeWind │
│ - Next.js    │  │ - Native     │
│   middleware │  │   components │
│ - API routes │  │ - Expo APIs  │
│              │  │   (camera,   │
│              │  │    push etc) │
└──────────────┘  └──────────────┘
What IS shared (via packages/shared):
✓ TypeScript types and interfaces
✓ Zod validation schemas
✓ Business logic constants
✓ Utility functions (price formatting, date formatting)
✓ API response type contracts
What is NOT shared (platform-specific):
✗ UI components (shadcn vs RN components)
✗ Navigation (App Router vs React Navigation)
✗ State hooks (different React Query setups)
✗ Auth client setup (SSR vs native storage)
✗ Image handling (<Image> vs RN Image)
Mobile API Access:
The mobile app calls the SAME API routes hosted on Vercel.
No separate mobile backend needed. Supabase client is used
directly for auth (supabase-js works in React Native).
All other data flows through /api/* routes.

---
