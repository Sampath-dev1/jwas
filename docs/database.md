# Database Design & Schema Specification

The JWAS platform utilizes a normalized PostgreSQL database managed through Alembic transactional migrations.

## 1. Table Inventory (36 Normalized Tables)
- **Identity & RBAC**: `users`, `customer_profiles`, `staff_profiles`, `roles`, `permissions`, `user_roles`, `role_permissions`
- **Catalogue & Inventory**: `categories`, `products`, `product_images`, `product_variants`, `inventory`, `inventory_movements`
- **Shopping & Logistics**: `carts`, `cart_items`, `addresses`, `orders`, `order_items`, `shipments`
- **Payments & Redemptions**: `payments`, `payment_webhook_events`, `refunds`, `coupons`, `coupon_redemptions`, `returns`, `return_items`
- **Customer Engagement**: `reviews`, `wishlists`, `wishlist_items`, `notifications`
- **Content & Configuration**: `homepage_sections`, `banners`, `website_settings`, `shipping_methods`, `shipping_rules`, `tax_rules`, `audit_logs`

## 2. Integrity & Concurrency Controls
1. **Concurrency Protection**: Inventory rows utilize PostgreSQL row locks (`with_for_update()`) to guarantee that simultaneous checkouts cannot oversell the final unit of any variant.
2. **Monetary Precision**: All currency quantities are stored using `Numeric(12, 2)` to eliminate floating-point arithmetic errors.
3. **Data Immutability**: Historical order records capture item snapshots (`product_name_snapshot`, `sku_snapshot`, `price_snapshot`, `variant_attributes_snapshot`), ensuring historical orders remain intact if a product is subsequently updated or archived.
4. **Referential Safeguards**: Foreign keys utilize `RESTRICT` on critical relationships (e.g. deleting a category with products or deleting a user with existing orders is blocked).
