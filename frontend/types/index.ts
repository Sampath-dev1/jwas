export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
  permissions: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  is_published: boolean;
  is_nav_visible: boolean;
  is_home_visible: boolean;
  display_order: number;
  subcategories?: Category[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  attributes: Record<string, any>;
  selling_price?: number;
  original_price?: number;
  is_active: boolean;
  current_stock: number;
  available_stock: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
  is_main: boolean;
  variant_id?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  specifications: Record<string, any>;
  selling_price: number;
  original_price?: number;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  category_id: string;
  subcategory_id?: string;
  created_at: string;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface CartItem {
  id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  variant_sku: string;
  variant_attributes: Record<string, any>;
  image_url?: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  available_stock: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  item_count: number;
}

export interface Address {
  id?: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

export interface OrderItem {
  id: string;
  variant_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  variant_attributes_snapshot: Record<string, any>;
  price_snapshot: number;
  quantity: number;
  total_item_amount: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  subtotal_amount: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  shipping_address_snapshot: Address;
  tracking_number?: string;
  courier_name?: string;
  created_at: string;
  items: OrderItem[];
}
