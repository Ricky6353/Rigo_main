export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  sizes?: string[];
  details?: string[];
  soldOut?: boolean;
  soldOutSizes?: string[];
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Landscape Embroidery Hoodie - Black',
    price: 120,
    category: 'hoodies',
    image: '/hoodie.png',
    description: 'Heavyweight organic cotton hoodie featuring an intricate landscape embroidery on the chest. Relaxed fit, double-lined hood.',
  },
  {
    id: '2',
    name: 'Vintage Arch Tee - White',
    price: 55,
    category: 'tees',
    image: '/tee.png',
    description: 'Premium heavyweight cotton t-shirt with our signature vintage arch logo embedded in the fibers. Boxy streetwear fit.',
  },
  {
    id: '3',
    name: 'Logo Zip-Up - Forest Green',
    price: 135,
    category: 'hoodies',
    image: '/hero.png', // Using hero as placeholder
    description: 'Thick zip-up hoodie featuring a bold embroidered logo across the chest.',
  },
  {
    id: '4',
    name: 'Logo Beanie - Black',
    price: 35,
    category: 'polos',
    image: '/hoodie.png', // Placeholder
    description: 'Classic ribbed knitted beanie featuring a small Embroyit logo patch.',
  }
];

export const getProductsByCategory = (category: string) => {
  if (category === 'all') return products;
  return products.filter((p) => p.category === category);
};

export const getProductById = (id: string) => {
  return products.find((p) => p.id === id);
};
