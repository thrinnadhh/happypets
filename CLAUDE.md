# CLAUDE.md — thehappypets.in

> This file is the persistent context for every AI agent session.
> Read this FIRST before writing any code. Update it at the end of every phase.

---

## 🐾 Project Overview

**thehappypets.in** is a multi-shop pet food ecommerce platform for the Indian
market. It connects multiple pet food shops under a single storefront, allowing
customers to browse, compare, and purchase pet food products from different
shops in one unified experience.

### Business Goals
- Launch with 3 shops (Shop1, Shop2, Shop3) — scalable to N shops
- Serve Indian customers with INR pricing, Razorpay payments (UPI/cards/wallets)
- Mobile-first design (60%+ traffic expected from mobile web + native app)
- Sub-2s page loads on 4G connections typical in Indian metros
- SuperAdmin has full platform control; Admins manage their own shops

### Key Differentiators
- Per-shop inventory isolation with cross-shop browsing for customers
- Admin suspension system with instant session invalidation + product hiding
- Curated homepage sections (Recommended + Trending) managed by admins
- Shared backend for web + React Native mobile app

---

## 🛠 Tech Stack

| Layer            | Technology                        | Why                                                        |
|------------------|-----------------------------------|------------------------------------------------------------|
| Web Framework    | Next.js 14 (App Router)           | RSC for performance, App Router for layouts, Indian CDN    |
| Language         | TypeScript (strict mode)          | Type safety across full stack                              |
| Styling          | Tailwind CSS + shadcn/ui          | Utility-first, accessible components, easy theming         |
| Mobile           | Expo (React Native) + NativeWind  | Code sharing with web styles, OTA updates, EAS build       |
| Database         | Supabase PostgreSQL (ap-south-1)  | Managed Postgres, RLS, Auth, Realtime, Indian region       |
| Auth             | Supabase Auth                     | Email/password + OTP (phone), JWT, session management      |
| Cache            | Upstash Redis (ap-south-1)        | Serverless Redis, low latency in India, per-request pricing|
| Image CDN        | Cloudinary                        | Auto WebP/AVIF, responsive transforms, Indian PoPs        |
| Email            | Resend                            | Transactional email, React Email templates                 |
| Payments         | Razorpay                          | UPI, cards, NetBanking, wallets — Indian standard          |
| Hosting          | Vercel (Mumbai bom1)              | Edge functions, ISR, automatic HTTPS                       |
| DNS/CDN          | Cloudflare                        | DDoS protection, caching, GoDaddy NS delegation            |
| Monorepo         | Turborepo                         | Shared packages, parallel builds, caching                  |

---

## 📁 Folder Structure

thehappypets/
├── CLAUDE.md                          # THIS FILE — agent context
├── turbo.json                         # Turborepo pipeline config
├── package.json                       # Root workspace config
├── .env.example                       # Template for all env vars
├── .env.local                         # Local overrides (gitignored)
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── commitlint.config.js
│
├── apps/
│   ├── web/                           # Next.js 14 App Router
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── public/
│   │   │   ├── fonts/
│   │   │   ├── icons/
│   │   │   └── images/
│   │   ├── src/
│   │   │   ├── app/                   # App Router pages
│   │   │   │   ├── (storefront)/      # Customer-facing route group
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── page.tsx                    # Homepage
│   │   │   │   │   ├── products/
│   │   │   │   │   │   ├── page.tsx                # Product listing
│   │   │   │   │   │   └── [slug]/page.tsx         # Product detail
│   │   │   │   │   ├── categories/
│   │   │   │   │   │   └── [slug]/page.tsx         # Category listing
│   │   │   │   │   ├── cart/page.tsx
│   │   │   │   │   ├── checkout/page.tsx
│   │   │   │   │   ├── wishlist/page.tsx
│   │   │   │   │   ├── orders/
│   │   │   │   │   │   ├── page.tsx                # Order history
│   │   │   │   │   │   └── [id]/page.tsx           # Order detail
│   │   │   │   │   ├── account/page.tsx
│   │   │   │   │   └── search/page.tsx
│   │   │   │   ├── (auth)/            # Auth route group
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   ├── register/page.tsx
│   │   │   │   │   ├── forgot-password/page.tsx
│   │   │   │   │   └── verify/page.tsx
│   │   │   │   ├── admin/             # Admin dashboard route group
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── page.tsx                    # Dashboard home
│   │   │   │   │   ├── products/
│   │   │   │   │   │   ├── page.tsx                # Product list
│   │   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   │   └── [id]/edit/page.tsx
│   │   │   │   │   ├── brands/page.tsx
│   │   │   │   │   ├── orders/page.tsx
│   │   │   │   │   ├── inventory/page.tsx
│   │   │   │   │   ├── homepage/page.tsx           # Manage featured sections
│   │   │   │   │   └── settings/page.tsx
│   │   │   │   ├── superadmin/        # SuperAdmin route group
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── page.tsx                    # Platform dashboard
│   │   │   │   │   ├── shops/page.tsx
│   │   │   │   │   ├── admins/page.tsx
│   │   │   │   │   ├── categories/page.tsx
│   │   │   │   │   ├── tags/page.tsx
│   │   │   │   │   └── analytics/page.tsx
│   │   │   │   ├── api/               # API Route Handlers
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── register/route.ts
│   │   │   │   │   │   ├── login/route.ts
│   │   │   │   │   │   ├── logout/route.ts
│   │   │   │   │   │   ├── refresh/route.ts
│   │   │   │   │   │   └── callback/route.ts
│   │   │   │   │   ├── products/
│   │   │   │   │   │   ├── route.ts                # GET list, POST create
│   │   │   │   │   │   ├── [id]/route.ts           # GET, PATCH, DELETE
│   │   │   │   │   │   └── [id]/reviews/route.ts
│   │   │   │   │   ├── categories/route.ts
│   │   │   │   │   ├── brands/route.ts
│   │   │   │   │   ├── shops/
│   │   │   │   │   │   ├── route.ts
│   │   │   │   │   │   └── [id]/route.ts
│   │   │   │   │   ├── cart/route.ts
│   │   │   │   │   ├── wishlist/route.ts
│   │   │   │   │   ├── orders/
│   │   │   │   │   │   ├── route.ts
│   │   │   │   │   │   └── [id]/route.ts
│   │   │   │   │   ├── checkout/route.ts
│   │   │   │   │   ├── payments/
│   │   │   │   │   │   ├── create-order/route.ts
│   │   │   │   │   │   ├── verify/route.ts
│   │   │   │   │   │   └── webhook/route.ts
│   │   │   │   │   ├── upload/route.ts
│   │   │   │   │   ├── search/route.ts
│   │   │   │   │   ├── homepage/route.ts
│   │   │   │   │   └── admin/
│   │   │   │   │       ├── suspend/route.ts
│   │   │   │   │       ├── analytics/route.ts
│   │   │   │   │       └── inventory/route.ts
│   │   │   │   ├── layout.tsx         # Root layout
│   │   │   │   ├── not-found.tsx
│   │   │   │   └── error.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/                # shadcn/ui primitives (auto-generated)
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   ├── MobileNav.tsx
│   │   │   │   │   ├── AdminSidebar.tsx
│   │   │   │   │   └── SuperAdminSidebar.tsx
│   │   │   │   ├── product/
│   │   │   │   │   ├── ProductCard.tsx
│   │   │   │   │   ├── ProductGrid.tsx
│   │   │   │   │   ├── ProductDetail.tsx
│   │   │   │   │   ├── ProductFilters.tsx
│   │   │   │   │   └── ProductReviews.tsx
│   │   │   │   ├── cart/
│   │   │   │   │   ├── CartItem.tsx
│   │   │   │   │   ├── CartSummary.tsx
│   │   │   │   │   └── CartDrawer.tsx
│   │   │   │   ├── checkout/
│   │   │   │   │   ├── AddressForm.tsx
│   │   │   │   │   ├── PaymentStep.tsx
│   │   │   │   │   └── OrderConfirmation.tsx
│   │   │   │   ├── home/
│   │   │   │   │   ├── HeroBanner.tsx
│   │   │   │   │   ├── RecommendedProducts.tsx
│   │   │   │   │   ├── TrendingThisWeek.tsx
│   │   │   │   │   └── CategoryGrid.tsx
│   │   │   │   └── shared/
│   │   │   │       ├── SearchBar.tsx
│   │   │   │       ├── Rating.tsx
│   │   │   │       ├── PriceDisplay.tsx
│   │   │   │       ├── ImageUpload.tsx
│   │   │   │       └── EmptyState.tsx
│   │   │   ├── lib/
│   │   │   │   ├── supabase/
│   │   │   │   │   ├── client.ts       # Browser client
│   │   │   │   │   ├── server.ts       # Server component client
│   │   │   │   │   ├── middleware.ts    # Auth middleware client
│   │   │   │   │   └── admin.ts        # Service role client (API routes only)
│   │   │   │   ├── razorpay.ts
│   │   │   │   ├── cloudinary.ts
│   │   │   │   ├── redis.ts
│   │   │   │   ├── resend.ts
│   │   │   │   └── utils.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useCart.ts
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useWishlist.ts
│   │   │   │   ├── useProducts.ts
│   │   │   │   └── useDebounce.ts
│   │   │   ├── stores/                 # Zustand stores
│   │   │   │   ├── cartStore.ts
│   │   │   │   ├── authStore.ts
│   │   │   │   └── filterStore.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts            # Re-exports from @thehappypets/shared
│   │   │   └── middleware.ts           # Next.js middleware (auth + role gates)
│   │   └── tests/
│   │       ├── unit/
│   │       ├── integration/
│   │       └── e2e/
│   │
│   └── mobile/                        # Expo React Native app
│       ├── app.json
│       ├── eas.json
│       ├── babel.config.js
│       ├── tailwind.config.js         # NativeWind config
│       ├── tsconfig.json
│       ├── App.tsx
│       ├── src/
│       │   ├── navigation/
│       │   │   ├── RootNavigator.tsx
│       │   │   ├── AuthStack.tsx
│       │   │   ├── MainTabs.tsx
│       │   │   └── linking.ts
│       │   ├── screens/
│       │   │   ├── HomeScreen.tsx
│       │   │   ├── ProductListScreen.tsx
│       │   │   ├── ProductDetailScreen.tsx
│       │   │   ├── CartScreen.tsx
│       │   │   ├── CheckoutScreen.tsx
│       │   │   ├── OrdersScreen.tsx
│       │   │   ├── OrderDetailScreen.tsx
│       │   │   ├── WishlistScreen.tsx
│       │   │   ├── AccountScreen.tsx
│       │   │   ├── SearchScreen.tsx
│       │   │   ├── LoginScreen.tsx
│       │   │   └── RegisterScreen.tsx
│       │   ├── components/
│       │   │   ├── ProductCard.tsx
│       │   │   ├── CartItem.tsx
│       │   │   ├── Rating.tsx
│       │   │   ├── PriceDisplay.tsx
│       │   │   └── EmptyState.tsx
│       │   ├── lib/
│       │   │   ├── supabase.ts
│       │   │   └── razorpay.ts
│       │   ├── hooks/                  # Re-exports shared hooks where possible
│       │   │   ├── useCart.ts
│       │   │   └── useAuth.ts
│       │   ├── stores/                 # Re-exports shared stores
│       │   │   └── index.ts
│       │   └── types/
│       │       └── index.ts
│       └── tests/
│
├── packages/
│   ├── shared/                        # Shared between web + mobile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── types/                 # All TypeScript types/interfaces
│   │   │   │   ├── user.ts
│   │   │   │   ├── product.ts
│   │   │   │   ├── order.ts
│   │   │   │   ├── cart.ts
│   │   │   │   ├── shop.ts
│   │   │   │   ├── review.ts
│   │   │   │   ├── category.ts
│   │   │   │   ├── brand.ts
│   │   │   │   ├── payment.ts
│   │   │   │   └── api.ts             # API request/response shapes
│   │   │   ├── validators/            # Zod schemas (shared validation)
│   │   │   │   ├── auth.ts
│   │   │   │   ├── product.ts
│   │   │   │   ├── order.ts
│   │   │   │   ├── review.ts
│   │   │   │   └── address.ts
│   │   │   ├── constants/
│   │   │   │   ├── categories.ts
│   │   │   │   ├── orderStatus.ts
│   │   │   │   ├── roles.ts
│   │   │   │   └── config.ts
│   │   │   └── utils/
│   │   │       ├── price.ts           # INR formatting, tax calc
│   │   │       ├── slug.ts
│   │   │       ├── date.ts
│   │   │       └── pagination.ts
│   │   └── index.ts
│   │
│   ├── db/                            # Database package
│   │   ├── package.json
│   │   ├── migrations/                # Supabase SQL migrations
│   │   │   ├── 00001_initial_schema.sql
│   │   │   ├── 00002_rls_policies.sql
│   │   │   ├── 00003_functions.sql
│   │   │   ├── 00004_triggers.sql
│   │   │   └── 00005_seed.sql
│   │   ├── types/                     # Supabase generated types
│   │   │   └── database.ts
│   │   └── seed/
│   │       ├── categories.ts
│   │       ├── shops.ts
│   │       └── demo-products.ts
│   │
│   └── config/                        # Shared config
│       ├── eslint-preset.js
│       ├── tsconfig.base.json
│       └── tailwind-preset.js
│
├── supabase/                          # Supabase CLI config
│   ├── config.toml
│   └── functions/                     # Edge functions (if needed)
│       └── .gitkeep
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── TEAM.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── adr/                           # Architecture Decision Records
│       ├── 001-supabase-over-prisma.md
│       └── 002-razorpay-integration.md
│
└── scripts/
├── setup.sh                       # Local dev setup
├── generate-types.sh              # Supabase type generation
└── seed.ts                        # Database seeding

---

## 🤖 Agent Team Roles

See docs/TEAM.md for full responsibilities. Summary:

| Agent               | Owns                                           |
|----------------------|-------------------------------------------------|
| Architect            | System design, schema, ADRs, CLAUDE.md updates  |
| Backend Developer    | API routes, DB migrations, auth, payments        |
| Frontend Developer   | Web pages, components, design system             |
| Mobile Developer     | Expo app, native components, navigation          |
| QA Engineer          | Unit/integration/E2E tests, edge cases           |
| Security Auditor     | RLS policies, input validation, OWASP checks     |
| Performance Engineer | Core Web Vitals, bundle size, caching            |
| Doc Updater          | Codemaps, README, API docs, changelogs           |

---

## 📏 Coding Conventions

### TypeScript
- `strict: true` in all tsconfig files
- No `any` — use `unknown` + type narrowing
- Prefer `interface` for object shapes, `type` for unions/intersections
- All function parameters and return types must be explicitly typed
- Use `satisfies` operator for type-safe object literals

### Naming
- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- Variables/functions: `camelCase`
- Types/interfaces: `PascalCase` (no `I` prefix)
- Database columns: `snake_case`
- API routes: `kebab-case` URL paths
- Constants: `SCREAMING_SNAKE_CASE`
- Zod schemas: `camelCase` + `Schema` suffix (e.g., `createProductSchema`)

### Components
- Functional components only (no class components)
- Props interface defined above component, named `{ComponentName}Props`
- Co-locate component-specific hooks and utils
- Use `forwardRef` for all interactive primitives
- Server Components by default; add `"use client"` only when needed

### Database
- All tables have: `id` (uuid), `created_at`, `updated_at`
- Soft delete via `deleted_at` timestamp (nullable)
- All foreign keys have explicit `ON DELETE` behavior
- All monetary values stored as integers (paise, not rupees)
- Indexes on all foreign keys and commonly filtered columns

### API Routes
- All routes validate input with Zod before processing
- Consistent response shape: `{ data, error, meta }`
- HTTP status codes: 200 (success), 201 (created), 400 (validation),
  401 (unauth), 403 (forbidden), 404 (not found), 500 (server error)
- All list endpoints support: `page`, `limit`, `sort`, `order` params
- Rate limiting on auth routes (10/min) and write routes (30/min)

### State Management
- Server state: React Query (TanStack Query) for web, same for mobile
- Client state: Zustand (minimal — cart, UI state only)
- No Redux — keep it simple

### Testing
- Unit tests: Vitest
- Component tests: React Testing Library
- E2E: Playwright (web), Detox (mobile)
- Minimum 80% coverage on business logic (validators, utils, API routes)
- Every API route has at least: happy path, auth failure, validation failure

### Error Handling
- Custom `AppError` class with: `code`, `message`, `statusCode`, `details`
- API routes wrapped in `withErrorHandler` HOF
- Client: error boundaries at route segment level
- Never expose stack traces or internal errors to client

---

## 🔀 Git Workflow

### Branch Strategy
- `main` — production, deployed automatically
- `develop` — integration branch, staging deploy
- `feature/*` — feature branches off `develop`
- `fix/*` — bug fix branches
- `hotfix/*` — emergency fixes off `main`

### Conventional Commits

feat(scope): description     # New feature
fix(scope): description      # Bug fix
docs(scope): description     # Documentation
style(scope): description    # Formatting (no logic change)
refactor(scope): description # Code restructure (no behavior change)
test(scope): description     # Adding/fixing tests
chore(scope): description    # Build, deps, config
perf(scope): description     # Performance improvement

Scopes: `web`, `mobile`, `api`, `db`, `shared`, `config`, `ci`

### PR Rules
- All PRs require passing CI (lint + type check + tests)
- Squash merge to `develop`, merge commit to `main`
- PR description must reference the phase and prompt number

---

## 🔐 Environment Variables

```bash
# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...         # Server-only, NEVER in client bundle

# ── Upstash Redis ──
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# ── Razorpay ──
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx  # Public key (safe for client)
RAZORPAY_KEY_SECRET=xxx                    # Server-only
RAZORPAY_WEBHOOK_SECRET=xxx                # Server-only

# ── Cloudinary ──
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx                     # Server-only
CLOUDINARY_API_SECRET=xxx                  # Server-only

# ── Resend ──
RESEND_API_KEY=re_xxx                      # Server-only

# ── App Config ──
NEXT_PUBLIC_APP_URL=https://thehappypets.in
NEXT_PUBLIC_APP_NAME=TheHappyPets
NODE_ENV=production
```

**Rule:** Any variable prefixed `NEXT_PUBLIC_` is exposed to the browser.
All others MUST only be accessed in API routes / server components.

---

## 🎯 Performance Targets

| Metric          | Target     | Measurement Tool       |
|-----------------|------------|------------------------|
| LCP             | < 1.5s     | Lighthouse, Web Vitals |
| FID / INP       | < 50ms     | Lighthouse, Web Vitals |
| CLS             | < 0.1      | Lighthouse, Web Vitals |
| TTFB            | < 200ms    | Vercel Analytics       |
| Bundle (JS)     | < 150kb gz | next/bundle-analyzer   |
| Lighthouse Perf | > 95       | Lighthouse CI          |
| Lighthouse A11y | > 95       | Lighthouse CI          |
| API p95 latency | < 300ms    | Vercel/Supabase logs   |
| Image LCP       | < 1.0s     | Cloudinary + priority  |
| Mobile app cold start | < 2s | Expo profiler          |

### Performance Strategies
- Server Components for all data-fetching pages (zero client JS)
- Dynamic imports for heavy components (checkout, admin charts)
- Image optimization: Cloudinary `f_auto,q_auto,w_auto` + Next.js `<Image>`
- ISR for product listing pages (revalidate: 60s)
- Redis caching for: homepage sections, category trees, shop metadata
- Prefetch links on viewport intersection
- Font: `next/font` with `display: swap`, subset for Latin + Devanagari

---

## 🔒 Security Requirements

### Authentication
- Supabase Auth with email/password + phone OTP
- JWT tokens with 1hr access / 7d refresh
- HttpOnly, Secure, SameSite=Strict cookies
- Session invalidation on suspension (database flag + middleware check)

### Authorization
- Row Level Security (RLS) on ALL tables — no exceptions
- Middleware role checks on every protected route (web + API)
- Admin can only WRITE to own shop; READ other shops
- SuperAdmin bypasses shop scoping

### Data Protection
- All monetary values validated server-side (never trust client price)
- All user input sanitized (XSS prevention via React + DOMPurify for rich text)
- SQL injection prevented by parameterized queries (Supabase client handles this)
- CSRF protection via SameSite cookies + origin checking
- Rate limiting on all auth endpoints (Upstash ratelimit)

### Infrastructure
- Cloudflare WAF rules for bot/abuse protection
- CSP headers configured in Next.js middleware
- No secrets in client bundle (enforced by env var naming convention)
- Razorpay webhook signature verification on every callback
- All file uploads validated: type whitelist, max 5MB, virus scan consideration

### Compliance
- GDPR-style data deletion capability (soft delete + hard purge endpoint)
- Order data retained for GST compliance (Indian tax law)
- Privacy policy and terms of service pages required before launch

---

## 📊 Phase Completion Tracker

| Phase | Name             | Status      | Date       | Notes |
|-------|------------------|-------------|------------|-------|
| 0     | Architect        | ✅ COMPLETE  | 2026-03-30 | System design, CLAUDE.md, docs |
| 1     | Backend Dev      | ✅ COMPLETE  | 2026-03-30 | Auth, middleware, session, Redis, logging |
| 2     | Backend QA       | ⬜ PENDING  |            |       |
| 3     | Frontend Dev     | ⬜ PENDING  |            |       |
| 4     | Frontend QA      | ⬜ PENDING  |            |       |
| 5     | Integration      | ⬜ PENDING  |            |       |
| 6     | Security Audit   | ⬜ PENDING  |            |       |
| 7     | Performance      | ⬜ PENDING  |            |       |
| 8     | Final QA         | ⬜ PENDING  |            |       |
