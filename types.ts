
export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  city: string;
  slug: string;
  subdomain: string;
  created_at: string;
  theme_color?: string;
  font?: string;
  hero_image_url?: string;
  hero_title?: string;
  hero_subtitle?: string;
  about_us?: string;
  address?: string;
  phone_number?: string;
  opening_hours?: string;
  google_maps_url?: string;
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

export type OrderStatus = 'pending' | 'preparing' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  restaurant_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_lat?: number;
  customer_lng?: number;
  order_details?: CartItem[];
  total_amount: number;
  status: OrderStatus;
  created_at: string;
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
