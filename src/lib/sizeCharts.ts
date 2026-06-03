/** Category IDs that use each size chart (admin products use category slug from command center). */
export const TSHIRT_CATEGORY_IDS = ['tees', 'tee', 'tshirt', 't-shirts', 'tshirts'] as const;
export const HOODIE_CATEGORY_IDS = ['hoodies', 'hoodie', 'hoody', 'hoodys'] as const;
export const POLO_CATEGORY_IDS = ['polos', 'polo', 'poloshirt', 'polo-shirt'] as const;

export type SizeChartRow = {
  label: string;
  values: Record<string, string | number>;
};

export type SizeChart = {
  id: string;
  title: string;
  subtitle: string;
  sizes: string[];
  rows: SizeChartRow[];
  unit: string;
  imageUrl?: string;
};

export const TEES_OVERSIZE_240GSM_CHART: SizeChart = {
  id: 'tees-oversize-240gsm',
  title: 'Size Chart',
  subtitle: 'Oversize 240gsm — Size Chart',
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  rows: [
    { label: 'Chest', values: { S: 42, M: 44, L: 46, XL: 48, XXL: 50 } },
    { label: 'Length', values: { S: 27.5, M: 28, L: 28.5, XL: 29, XXL: 29.5 } },
    { label: 'Shoulder', values: { S: 20, M: 21, L: 22, XL: 23, XXL: 24 } },
    { label: 'Sleeve Length', values: { S: 8.5, M: 9, L: 9.5, XL: 10, XXL: 10.5 } },
  ],
  unit: 'Measurements in inches',
  imageUrl: '/size-charts/tees-oversize-240gsm.png',
};

export const HOODIES_DROPSHO_430GSM_CHART: SizeChart = {
  id: 'hoodies-dropsho-430gsm',
  title: 'Size Chart',
  subtitle: 'Dropsho Hoodie 430gsm — Size Chart',
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  rows: [
    { label: 'Chest', values: { S: 42, M: 44, L: 46, XL: 48, XXL: 50 } },
    { label: 'Height', values: { S: 25, M: 26, L: 27, XL: 28, XXL: 29 } },
  ],
  unit: 'Measurements in inches',
  imageUrl: '/size-charts/hoodies-dropsho-430gsm.png',
};

export const POLOS_PREMIUM_CHART: SizeChart = {
  id: 'polos-premium',
  title: 'Size Chart',
  subtitle: 'Premium Polo — Size Chart',
  sizes: ['36', '38', '40', '42', '44', '46'],
  rows: [
    { label: 'Chest', values: { '36': 36, '38': 38, '40': 40, '42': 42, '44': 44, '46': 46 } },
    { label: 'Length', values: { '36': 26, '38': 27, '40': 28, '42': 29, '44': 30, '46': 31 } },
    { label: 'Shoulder', values: { '36': 16, '38': 17, '40': 17.5, '42': 18, '44': 18.5, '46': 19 } },
    {
      label: 'Sleeve Length',
      values: { '36': 8, '38': 8.5, '40': 9, '42': 9.5, '44': 10, '46': 10.5 },
    },
  ],
  unit: 'Measurements in inches',
  imageUrl: '/size-charts/polos-premium.png',
};

const CHARTS_BY_CATEGORY: Record<string, SizeChart> = {};
for (const catId of TSHIRT_CATEGORY_IDS) {
  CHARTS_BY_CATEGORY[catId] = TEES_OVERSIZE_240GSM_CHART;
}
for (const catId of HOODIE_CATEGORY_IDS) {
  CHARTS_BY_CATEGORY[catId] = HOODIES_DROPSHO_430GSM_CHART;
}
for (const catId of POLO_CATEGORY_IDS) {
  CHARTS_BY_CATEGORY[catId] = POLOS_PREMIUM_CHART;
}

export function normalizeCategoryId(category: string) {
  return category.trim().toLowerCase().replace(/\s+/g, '-');
}

export function getSizeChartForCategory(category: string): SizeChart | null {
  const id = normalizeCategoryId(category);
  return CHARTS_BY_CATEGORY[id] ?? null;
}

export function productHasSizeChart(category: string) {
  return getSizeChartForCategory(category) !== null;
}
