
export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  city: string;
  slug: string;
  created_at: string;
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

export type OrderStatus = 'pending' | 'preparing' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  restaurant_id: string;
  customer_name?: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
}
