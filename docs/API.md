# API Contract — thehappypets.in

All APIs are available under `/api/*`.
Standard response format:
```json
{
  "data": { ... } | [ ... ] | null,
  "error": null | {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... } // e.g., Zod validation errors
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  } // Only present on list endpoints
}
```

## Auth (`/api/auth/*`)

### `POST /register`
- **Body:** `{ email, password, full_name, phone }`
- **Response:** `201 Created`
- **Access:** Public

### `POST /login`
- **Body:** `{ email, password }`
- **Response:** `200 OK` (Sets HttpOnly cookie)
- **Access:** Public

### `POST /logout`
- **Response:** `200 OK` (Clears cookie)
- **Access:** Public

---

## Products (`/api/products/*`)

### `GET /`
- **Query:** `cat`, `brand`, `shop`, `min_price`, `max_price`, `sort`, `page`, `limit`
- **Response:** `200 OK` Array of products
- **Access:** Public (Only `is_visible=true` products)

### `GET /:id` (or `:slug`)
- **Response:** `200 OK` Product detail
- **Access:** Public

### `POST /`
- **Body:** `{ name, category_id, price_paise, stock_quantity, images... }`
- **Response:** `201 Created`
- **Access:** Admin (Auto-assigns to Admin's shop)

### `PATCH /:id`
- **Body:** Partial product object
- **Response:** `200 OK`
- **Access:** Admin (Must own shop)

### `DELETE /:id`
- **Response:** `200 OK` (Soft delete)
- **Access:** Admin (Must own shop)

---

## Checkout & Orders (`/api/checkout/*`, `/api/orders/*`)

### `POST /checkout`
- **Body:** `{ items: [{ variant_id, quantity }], shipping_address: { ... } }`
- **Response:** `200 OK` -> `{ order_id, razorpay_order_id, amount_paise, key }`
- **Access:** Authenticated (Customer)

### `GET /orders`
- **Response:** `200 OK` Array of orders
- **Access:**
  - Customer: Only own orders
  - Admin: Only orders containing their shop's products
  - SuperAdmin: All orders

### `GET /orders/:id`
- **Response:** `200 OK` Order detail with items
- **Access:** Same as above

---

## Payments (`/api/payments/*`)

### `POST /verify`
- **Body:** `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`
- **Response:** `200 OK` (Updates order status to 'confirmed')
- **Access:** Authenticated (Customer)

### `POST /webhook`
- **Headers:** `X-Razorpay-Signature`
- **Body:** Razorpay webhook payload
- **Response:** `200 OK`
- **Access:** Public (Verified via signature)

---

## Cart (`/api/cart/*`)

### `GET /`
- **Response:** `200 OK` Array of cart items (expanded with product data)
- **Access:** Authenticated (Customer)

### `POST /`
- **Body:** `{ product_id, variant_id, quantity }`
- **Response:** `200 OK` (Merged if exists)
- **Access:** Authenticated (Customer)

### `PATCH /:id`
- **Body:** `{ quantity }`
- **Response:** `200 OK`
- **Access:** Authenticated (Customer)

### `DELETE /:id`
- **Response:** `200 OK`
- **Access:** Authenticated (Customer)

---

## Admin & SuperAdmin (`/api/admin/*`, `/api/superadmin/*`)

### `POST /superadmin/shops`
- **Body:** `{ name, slug, description }`
- **Response:** `201 Created`
- **Access:** SuperAdmin

### `POST /superadmin/admins`
- **Body:** `{ email, password, full_name, shop_id }`
- **Response:** `201 Created`
- **Access:** SuperAdmin

### `POST /admin/suspend`
- **Body:** `{ user_id, reason }`
- **Response:** `200 OK`
- **Access:** SuperAdmin
- **Action:** Sets `is_suspended=true`, invalidates session, hides shop products.
