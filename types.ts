
export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  city: string;
  slug: string;
  created_at: string;
  theme_color?: string;
  secondary_color?: string;
  font?: string;
  hero_image_url?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_opacity?: number;
  about_us?: string;
  address?: string;
  phone_number?: string;
  whatsapp_number?: string;
  instagram_url?: string;
  opening_hours?: string;
  google_maps_url?: string;
  upi_id?: string;
  is_accepting_orders?: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  category?: string;
  is_veg: boolean;
  image_url?: string;
  is_available: boolean;
}

export interface CartItem extends MenuItem {
    quantity: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'COD' | 'UPI';

export interface Order {
  id: string;
  restaurant_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  latitude?: number;
  longitude?: number;
  order_details?: CartItem[] | string;
  items?: CartItem[] | string;
  subtotal: number;
  total_amount: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  created_at: string;
  order_type: string;
}

export interface Review {
    id: string;
    restaurant_id: string;
    customer_name: string;
    rating: number;
    comment?: string;
    is_visible: boolean;
    created_at: string;
}
