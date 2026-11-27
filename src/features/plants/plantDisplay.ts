import type { Colour, Month, Plant, PlantCategory } from '../../domain/types';

export const MONTH_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const CATEGORY_LABEL: Record<PlantCategory, string> = {
  perennial: 'Perennial',
  grass: 'Ornamental grass',
  fern: 'Fern',
  shrub: 'Shrub',
  climber: 'Climber',
  bulb: 'Bulb',
  tree: 'Small tree',
  groundcover: 'Groundcover',
  heather: 'Heather',
  vegetable: 'Vegetable',
  herb: 'Herb',
  fruit: 'Fruit',
};

export const COLOUR_CSS: Record<Colour, string> = {
  white: '#f4f4ef',
  yellow: '#f2d22e',
  orange: '#f0892b',
  red: '#d2302f',
  pink: '#ec8fc0',
  purple: '#8e5bc4',
  blue: '#4f7fe0',
  green: '#7cb35b',
  brown: '#9b6b43',
};

export const ALL_COLOURS = Object.keys(COLOUR_CSS) as Colour[];

/** Representative colour for a plant (first flower colour, else foliage green). */
export function plantColour(p: Plant): string {
  const c = p.ornamental?.flowerColours[0];
  return c ? COLOUR_CSS[c] : p.edible ? '#6aa84f' : '#5d8f4e';
}

export function monthsText(m: Month[] | number[] | undefined): string {
  if (!m || m.length === 0) return '–';
  return m.map((x) => MONTH_NAMES[x - 1]).join(', ');
}

export const SUN_LABEL = { fullSun: 'full sun', partialShade: 'partial shade', shade: 'shade' } as const;
