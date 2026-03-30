# Auth & Middleware Implementation Plan

## Overview
Complete authentication and authorization infrastructure for Happypets web and mobile apps.

## Phase 1: Client Setup

### apps/web/lib/supabase/client.ts
- Create singleton `createBrowserClient()` using `@supabase/supabase-js`
- Export as default
- Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### apps/web/lib/supabase/server.ts
Three key exports:

#### `getUser(): Promise<Profile | null>`
- Get session from Supabase
- Return null if no session
- Fetch profile from `profiles` table by `user_id`
- If `is_suspended = true`: signOut and return null
- Check Redis blacklist via `isSessionBlacklisted()`
- If blacklisted: signOut and return null
- Return profile with role and status

#### `requireRole(roles: UserRole[]): Promise<Profile>`
- Call `getUser()`
- If null: redirect to '/login'
- If role not in allowed roles: redirect based on role
  - superadmin → redirect to '/login?message=not_superadmin'
  - admin + suspended → redirect to '/suspended'
  - admin + pending_approval → redirect to '/login?message=pending_approval'
  - admin + rejected → redirect to '/login?message=rejected'
  - customer → redirect to '/login'
- Return profile

#### `getSession(): Promise<Session | null>`
- Return raw Supabase session

### apps/web/lib/supabase/middleware.ts
- Export `updateSession(request: NextRequest): Promise<NextResponse>`
- Refresh Supabase session cookies
- Check Redis blacklist for logged-in users
- If blacklisted: clear cookies, redirect to '/suspended'
- Return modified NextResponse

### apps/web/middleware.ts
Main route protection middleware:

**Matcher**: All routes except `_next/static`, `_next/image`, `favicon.ico`, `public/*`

**Route Logic**:
- `/superadmin/*` → getUser() must have role='superadmin', else redirect to '/login'
- `/admin/*` → Complex logic:
  - role != 'admin' → redirect to '/login'
  - status='pending' → redirect to '/login?message=pending_approval'
  - status='suspended' → redirect to '/suspended'
  - status='rejected' → redirect to '/login?message=rejected'
  - status='active' → allow
- `/checkout`, `/orders`, `/profile`, `/wishlist` → Require auth, else redirect to '/login?redirect={path}'
- `/login`, `/register` → If logged in:
  - superadmin → redirect to '/superadmin'
  - admin (approved) → redirect to '/admin'
  - customer → redirect to '/'
- All other routes → Pass through (public)

## Phase 2: Redis Utilities

### apps/web/lib/redis.ts

**Generic Cache Helpers** (with try-catch error handling):
- `get(key: string): Promise<any | null>`
- `set(key: string, value: any, ttl?: number): Promise<void>`
- `del(key: string): Promise<void>`

**Product Cache Helpers**:
- `getCachedProducts(queryHash: string): Promise<any | null>`
- `setCachedProducts(queryHash: string, data: any, ttl=300): Promise<void>`
- `getCachedProduct(id: string): Promise<any | null>`
- `setCachedProduct(id: string, data: any, ttl=600): Promise<void>`
- `bustProductCache(shopTag: string): Promise<void>` - Scan and delete `products:shop:{shopTag}:*`
- `bustSingleProduct(id: string): Promise<void>` - Delete `product:{id}`

**Cart Helpers** (TTL: 7 days = 604800s):
- `getCart(userId: string): Promise<CartItem[]>`
- `saveCart(userId: string, items: CartItem[]): Promise<void>`
- `clearCart(userId: string): Promise<void>`

**Session Security**:
- `blacklistSession(userId: string): Promise<void>` - Set `suspended:{userId}` = '1' with TTL 86400s
- `isSessionBlacklisted(userId: string): Promise<boolean>`

**Rate Limiting**:
- `rateLimit(ip: string, limit=100, window=60): Promise<{allowed: boolean, remaining: number, reset: number}>`
- Uses Redis INCR + EXPIRE pattern

## Phase 3: Suspended Page

### apps/web/app/suspended/page.tsx
- Server component
- Fetch profile to get `suspended_reason`
- Show suspension notice with reason (if available)
- Display contact email: `support@thehappypets.in`
- "Sign Out" button → call `logoutAction()`
- Centered card design, no navigation links
- Isolated layout (separate from app layout)

## Phase 4: Mobile Auth

### apps/mobile/lib/supabase.ts
- Create Supabase client for React Native
- Use `expo-secure-store` for secure session storage
- Custom storage adapter with async methods
- Export `supabase` client

## Implementation Notes

1. **Error Handling**: All Redis operations wrapped in try-catch, never crash the app
2. **JSDoc Comments**: All exported functions documented
3. **Security**:
   - Session blacklist checked on every request
   - Suspended status checked in `getUser()`
   - Role-based redirects in middleware
4. **Performance**:
   - Cache TTLs optimized for product (300-600s) vs cart (7 days)
   - Redis connection errors handled gracefully
5. **Testing**:
   - Manual tracing of middleware logic for each route scenario
   - Redis connection resilience verification

## Dependencies
- `@supabase/supabase-js` (browser client)
- `@supabase/ssr` (server client)
- `@upstash/redis` (cache)
- `next/headers` (cookies)
- `expo-secure-store` (mobile)
