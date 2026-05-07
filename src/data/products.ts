import productsData from './products.json';

export type Product = {
  id: string;
  name: string;
  category: 'tees' | 'sweatshirt' | 'hoodies' | string;
  price: number;
  image: string;
  description: string;
  sizes?: string[];
  details: string[];
  soldOut?: boolean;
  soldOutSizes?: string[];
  images?: string[];
};

export const products: Product[] = productsData as Product[];
