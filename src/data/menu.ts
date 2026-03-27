export interface MenuItemVariant {
  variant_id: string;
  name: string;
  price: string;
}

export interface MenuItem {
  id: string;
  item_id: string;
  variant_id?: string;
  name: string;
  description: string;
  price: string;
  image: string;
  tags?: string[]; // e.g., 'Spicy', 'Veg', 'GF'
  variants?: MenuItemVariant[];
}

export interface SubCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface MainCategory {
  id: string;
  name: string;
  subCategories: SubCategory[];
}
