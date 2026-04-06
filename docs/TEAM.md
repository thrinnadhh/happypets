# Agent Team — thehappypets.in

Each agent has a defined role, responsibilities, and quality gates.
Agents should read CLAUDE.md before every session and update it after
completing their phase.

---

## 🏗 Architect

**Active in:** Phase 0, consulted in all phases

**Responsibilities:**
- Design system architecture and make technology decisions
- Define database schema and entity relationships
- Write Architecture Decision Records (ADRs) for significant choices
- Review schema changes proposed by other agents
- Define API contracts before implementation begins
- Update CLAUDE.md with structural decisions
- Resolve cross-cutting design conflicts

**Quality Gates:**
- Every table has RLS consideration documented
- Every API endpoint has a defined contract before coding starts
- All third-party integrations have fallback/error strategies
- No circular dependencies in module design

---

## ⚙️ Backend Developer

**Active in:** Phase 1 (primary), Phase 5 (integration support)

**Responsibilities:**
- Write all database migrations (SQL) in order
- Implement all API route handlers in `apps/web/src/app/api/`
- Set up Supabase Auth with role-based access
- Implement Razorpay payment flow (create order, verify, webhooks)
- Build Cloudinary upload pipeline
- Configure Upstash Redis caching layer
- Set up Resend email templates
- Write Zod validation schemas in `packages/shared/src/validators/`

**Prompt Sequence (Phase 1):**
1. Database schema — all migrations, enums, indexes, triggers
2. Auth system — register, login, logout, session management, role checks
3. Product CRUD — create, read, update, soft delete, image upload
4. Category, Brand, Shop management — CRUD + relationships
5. Cart + Wishlist — add, remove, update quantity, merge guest cart
6. Orders + Checkout — create order, status transitions, order history
7. Payments (Razorpay) — create order, verify signature, webhook handler,
   Homepage sections — recommended/trending CRUD, admin management

**Quality Gates:**
- Every route has Zod input validation
- Every route has auth/role middleware
- Every mutation invalidates relevant Redis cache
- All prices are in paise (integer), never floating point
- All queries use parameterized inputs (Supabase client)
- Webhook endpoints verify signatures before processing

---

## 🎨 Frontend Developer

**Active in:** Phase 3 (primary), Phase 5 (integration support)

**Responsibilities:**
- Build the design system: tokens, theme, shadcn/ui configuration
- Implement all page layouts and route groups
- Build all customer-facing pages (storefront)
- Build admin dashboard pages
- Build SuperAdmin dashboard pages
- Implement responsive design (mobile-first)
- Set up client-side state (Zustand stores, React Query)
- Implement search with debounced input

**Prompt Sequence (Phase 3):**
1. Design system — Tailwind config, color tokens, typography, shadcn/ui setup
2. Layout shell — Header, Footer, MobileNav, admin/superadmin sidebars
3. Auth pages — login, register, forgot-password, verify
4. Homepage — hero, recommended products, trending this week, category grid
5. Product pages — listing with filters, product detail, reviews
6. Cart + Checkout — cart drawer/page, multi-step checkout, order confirmation
7. Account pages — profile, orders, order detail, wishlist, addresses
8. Admin + SuperAdmin dashboards — all management pages, analytics

**Quality Gates:**
- Server Components by default; `"use client"` only when state/interactivity needed
- All images use `next/image` with Cloudinary loader
- All forms have client-side validation (Zod + react-hook-form)
- All interactive elements are keyboard accessible
- No layout shift on page load (CLS < 0.1)
- Mobile-first: design for 375px, then scale up

---

## 📱 Mobile Developer

**Active in:** Phase 3 (parallel with frontend), Phase 5

**Responsibilities:**
- Set up Expo project with TypeScript and NativeWind
- Configure React Navigation (tabs + stacks)
- Build all customer-facing screens
- Implement Supabase Auth for React Native
- Integrate Razorpay React Native SDK
- Set up push notifications (Expo Notifications)
- Configure EAS Build for iOS + Android

**Screen Priority:**
1. Home, Product List, Product Detail
2. Cart, Checkout
3. Auth (Login, Register)
4. Orders, Order Detail
5. Wishlist, Account, Search

**Quality Gates:**
- Cold start under 2 seconds
- Shared types from `packages/shared` — no type duplication
- All API calls go through the same Vercel endpoints as web
- Offline-friendly: cached product data, queue cart mutations
- Haptic feedback on key interactions (add to cart, order placed)

---

## 🧪 QA Engineer

**Active in:** Phase 2, Phase 4, Phase 8

**Responsibilities:**
- Write unit tests for all validators and utility functions (Vitest)
- Write integration tests for all API routes (Vitest + Supertest)
- Write component tests for critical UI flows (React Testing Library)
- Write E2E tests for critical paths (Playwright)
- Test edge cases: empty states, max quantities, expired sessions,
  concurrent stock depletion, payment failures
- File detailed bug reports with reproduction steps
- Verify fixes in regression testing

**Critical Test Paths:**
1. Customer: browse → add to cart → checkout → pay → order confirmation
2. Customer: register → login → browse → wishlist → order history
3. Admin: login → add product → edit product → manage inventory
4. Admin: view own shop products → read-only view of other shop
5. SuperAdmin: create shop → approve admin → suspend admin →
   verify products hidden → unsuspend
6. Payment: successful UPI, failed card, webhook retry, refund flow
7. Auth: suspended admin cannot access dashboard, session killed instantly

**Quality Gates:**
- 80%+ code coverage on business logic
- All API routes tested: happy path, auth failure, validation failure, 404
- Zero critical/high severity bugs at phase gate
- All E2E tests pass in CI

---

## 🔒 Security Auditor

**Active in:** Phase 6 (primary), consulted in Phase 1 and Phase 2

**Responsibilities:**
- Write and verify all RLS policies for every table
- Test RLS: customer A cannot see customer B's orders, admin cannot
  mutate other shop's products, suspended admin gets 403
- Verify no secrets leak to client bundle
- Audit all input validation for injection vectors
- Verify Razorpay webhook signature checking
- Check CORS configuration
- Verify CSP headers
- Test rate limiting effectiveness
- Check for IDOR vulnerabilities on all endpoints
- Verify file upload restrictions (type, size, content)

**RLS Policy Checklist:**
- [ ] profiles: users see own, admins see own shop, superadmin sees all
- [ ] products: public read (visible only), shop-scoped write for admins
- [ ] orders: customer sees own, admin sees shop orders, superadmin sees all
- [ ] cart_items: user sees/modifies own only
- [ ] wishlists: user sees/modifies own only
- [ ] reviews: public read, user creates own, admin moderates
- [ ] shops: public read, superadmin writes
- [ ] addresses: user sees/modifies own only
- [ ] payments: user sees own, admin sees shop payments, superadmin sees all
- [ ] homepage_sections: public read, admin/superadmin writes

**Quality Gates:**
- Every table has RLS enabled (no exceptions)
- Zero IDOR vulnerabilities
- All auth routes rate-limited
- Webhook endpoints verify signatures
- No `SUPABASE_SERVICE_ROLE_KEY` accessible from client

---

## ⚡ Performance Engineer

**Active in:** Phase 7 (primary), consulted in Phase 3

**Responsibilities:**
- Run Lighthouse CI and achieve target scores
- Analyze and optimize JavaScript bundle size
- Verify Core Web Vitals on key pages (home, product list, product detail)
- Optimize image loading (priority hints, lazy loading, Cloudinary transforms)
- Verify Redis caching is working (cache hit rates)
- Profile API route response times
- Optimize database queries (add missing indexes, fix N+1 queries)
- Configure Vercel ISR where appropriate
- Test on simulated 4G connection (Indian mobile networks)

**Key Pages to Profile:**
1. Homepage — LCP < 1.5s (hero image + recommended products)
2. Product listing — LCP < 1.5s, no CLS from filter sidebar
3. Product detail — LCP < 1.0s (product image)
4. Checkout — INP < 50ms (form interactions)

**Quality Gates:**
- Lighthouse Performance > 95 on all key pages
- Total JS bundle < 150kb gzipped (first load)
- All images served as WebP/AVIF via Cloudinary
- API p95 response time < 300ms
- Cache hit rate > 80% for product listings

---

## 📝 Doc Updater

**Active in:** End of every phase

**Responsibilities:**
- Update CLAUDE.md phase tracker after each phase completion
- Maintain API.md with any endpoint changes
- Update ARCHITECTURE.md if design evolves
- Write/update README.md with setup instructions
- Document any deviations from original architecture (and why)
- Maintain inline code comments for complex logic
- Generate Supabase types after schema changes (`generate-types.sh`)

**Quality Gates:**
- CLAUDE.md is always current
- API.md matches actual implementation
- README has working local setup instructions
- All environment variables are documented in .env.example
