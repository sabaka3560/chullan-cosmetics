import stickImg from '../assets/stick.png';
import tubeImg from '../assets/tube.png';

export type Product = {
  id: string;
  name: string;
  category: string;
  size: string;
  price: number;
  rating: number;
  reviews: number;
  image?: string;
  /** Rendered live in WebGL instead of shipped as a photograph. */
  live?: boolean;
};

/**
 * The live card sits in slot 2 deliberately. Slot 1 gets scanned as the header
 * of the row, so anything unusual there reads as a hero treatment — buried
 * mid-row it reads as a peer that happens to be alive.
 */
export const products: Product[] = [
  {
    id: 'concealer',
    name: 'Precision Concealer',
    category: 'Face',
    size: '6g · 4 shades',
    price: 19,
    rating: 4.7,
    reviews: 148,
    image: stickImg,
  },
  {
    id: 'foundation',
    name: 'Luminous Matte Foundation',
    category: 'Face',
    size: '30ml · 6 shades',
    price: 29,
    rating: 4.9,
    reviews: 212,
    live: true,
  },
  {
    id: 'blur-balm',
    name: 'Blur Balm',
    category: 'Prep',
    size: '50ml · Universal',
    price: 24,
    rating: 4.8,
    reviews: 96,
    image: tubeImg,
  },
];
