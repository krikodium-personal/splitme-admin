
export interface Restaurant {
  id: string;
  name: string;
  logo_url?: string;
  address?: string;
  access_code?: string;
  plan: 'Basic' | 'Premium' | 'Enterprise';
}

export type UserRole = 'super_admin' | 'restaurant_admin';

export interface Profile {
  id: string;
  role: UserRole;
  restaurant_id: string | null;
  full_name?: string;
}

export let CURRENT_RESTAURANT: Restaurant | null = null;

export const setGlobalRestaurant = (r: Restaurant) => {
  CURRENT_RESTAURANT = r;
};

// Added missing PaymentConfig interface for payment gateway settings
export interface PaymentConfig {
  id: string;
  restaurant_id: string;
  token_cbu: string | null; // Para MP: access token, Para Transferencia: CBU
  key_alias: string | null; // Para MP: public key, Para Transferencia: alias
  user_account: string | null; // Para MP: user ID (opcional), Para Transferencia: "Banco|NroCuenta"
  provider: string;
  is_active: boolean;
  created_at: string;
}

export interface NutritionalTable {
  calories: number;
  protein_g: number;
  total_fat_g: number;
  sat_fat_g: number;
  carbs_g: number;
  sugars_g: number;
  fiber_g: number;
  sodium_mg: number;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  name: string;
  description: string;
  price: number;
  image_url: string;
  dietary_tags: string[];
  customer_customization: {
    ingredientsToAdd: string[];
    ingredientsToRemove: string[];
  };
  nutrition: NutritionalTable;
  is_featured: boolean;
  is_available: boolean;
  preparation_time_min: number;
  average_rating?: number;
  created_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  batch_id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  menu_items?: {
    name: string;
  };
}

export interface OrderBatch {
  id: string;
  order_id: string;
  status: 'CREADO' | 'ENVIADO' | 'PREPARANDO' | 'LISTO' | 'SERVIDO';
  created_at: string;
  items: OrderItem[];
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  guest_name: string | null;
  total_amount: number;
  status: 'ABIERTO' | 'PAGADO';
  created_at: string;
  guest_count: number;
  tables: {
    table_number: string;
  } | null;
  batches: OrderBatch[];
}

export type NewMenuItem = Omit<MenuItem, 'id' | 'created_at' | 'customer_customization'> & {
  ingredientsToAdd: string[];
  ingredientsToRemove: string[];
};

export interface Table {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  waiter_id: string | null;
  status: 'Libre' | 'Ocupada';
  created_at?: string;
}