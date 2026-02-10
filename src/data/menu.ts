export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  tags?: string[]; // e.g., 'Spicy', 'Veg', 'GF'
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

export const menuData: MainCategory[] = [
  {
    id: 'food',
    name: 'Food',
    subCategories: [
      {
        id: 'starters',
        name: 'Starters',
        items: [
          {
            id: 'shabhaley',
            name: 'Shabhaley',
            description: 'Deep-fried bread stuffed with seasoned beef and herbs. Crispy on the outside, juicy on the inside.',
            price: '$8.00',
            image: 'https://placehold.co/400x300?text=Shabhaley',
            tags: ['Popular']
          },
          {
            id: 'tingmo',
            name: 'Tingmo',
            description: 'Hand-twisted steamed bun, perfect for soaking up curries and soups.',
            price: '$4.00',
            image: 'https://placehold.co/400x300?text=Tingmo',
            tags: ['Veg']
          }
        ]
      },
      {
        id: 'momos',
        name: 'Momos (Dumplings)',
        items: [
          {
            id: 'beef-momo-steamed',
            name: 'Beef Momo (Steamed)',
            description: 'Classic Tibetan steamed dumplings filled with juicy minced beef and onions.',
            price: '$12.00',
            image: 'https://placehold.co/400x300?text=Beef+Momo',
            tags: ['Popular']
          },
          {
            id: 'veg-momo-fried',
            name: 'Veg Momo (Fried)',
            description: 'Crispy fried dumplings filled with mixed vegetables and cheese.',
            price: '$11.00',
            image: 'https://placehold.co/400x300?text=Veg+AFried+Momo',
            tags: ['Veg']
          },
          {
             id: 'jhol-momo',
             name: 'Jhol Momo',
             description: 'Steamed dumplings served in a spicy, tangy sesame and tomato soup.',
             price: '$13.00',
             image: 'https://placehold.co/400x300?text=Jhol+Momo',
              tags: ['Spicy']
          }
        ]
      },
      {
        id: 'noodle-soups',
        name: 'Noodle Soups',
        items: [
          {
            id: 'thenthuk',
            name: 'Thenthuk',
            description: 'Hand-pulled flat noodle soup with radishes, spinach, and beef slices.',
            price: '$14.00',
            image: 'https://placehold.co/400x300?text=Thenthuk',
             tags: ['Chef\'s Special']
          },
          {
            id: 'thukpa',
            name: 'Thukpa',
            description: 'Hearty noodle soup with seasonal vegetables and choice of meat.',
            price: '$13.00',
            image: 'https://placehold.co/400x300?text=Thukpa'
          }
        ]
      }
    ]
  },
  {
    id: 'beverages',
    name: 'Beverages',
    subCategories: [
      {
        id: 'tea',
        name: 'Tea',
        items: [
          {
            id: 'butter-tea',
            name: 'Po Cha (Butter Tea)',
            description: 'Traditional Tibetan salt butter tea. A rich, savory warming drink.',
            price: '$3.50',
            image: 'https://placehold.co/400x300?text=Butter+Tea',
             tags: ['Traditional']
          },
          {
            id: 'sweet-tea',
            name: 'Sweet Milk Tea',
            description: 'Rich and creamy milk tea infused with aromatic spices.',
            price: '$3.50',
            image: 'https://placehold.co/400x300?text=Sweet+Tea'
          }
        ]
      },
      {
        id: 'cold-drinks',
        name: 'Cold Drinks',
        items: [
          {
            id: 'mango-lassi',
            name: 'Mango Lassi',
            description: 'Refreshing yogurt-based mango smoothie.',
            price: '$5.00',
            image: 'https://placehold.co/400x300?text=Mango+Lassi'
          }
        ]
      }
    ]
  }
];
