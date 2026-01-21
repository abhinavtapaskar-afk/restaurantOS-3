export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  city: string;
  slug: string;
  subdomain: string;
  created_at: string;
  theme_color?: string;
  hero_image_url?: string;
  about_us?: string;
  address?: string;
  phone_number?: string;
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
    created_at: string;
}