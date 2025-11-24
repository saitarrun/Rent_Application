const USD_TO_ETH = 3200;
const toEth = (usd: number) => Number((usd / USD_TO_ETH).toFixed(3));

export type Property = {
  id: number;
  title: string;
  address: string;
  city: string;
  state: string;
  price: number; // ETH
  beds: number;
  baths: number;
  area: number;
  type: 'house' | 'apartment' | 'villa' | 'studio';
  rating: number;
  available: boolean;
  latitude: number;
  longitude: number;
  imageUrl: string;
};

const rawProperties = [
  {
    id: 1,
    title: 'Palm View Estate',
    address: '123 Seaside Dr',
    city: 'Miami',
    state: 'FL',
    price: 4200,
    beds: 4,
    baths: 3,
    area: 2800,
    type: 'villa',
    rating: 4.8,
    available: true,
    latitude: 25.7617,
    longitude: -80.1918,
    imageUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 2,
    title: 'Downtown Loft',
    address: '88 Market St',
    city: 'San Francisco',
    state: 'CA',
    price: 5300,
    beds: 2,
    baths: 2,
    area: 1500,
    type: 'apartment',
    rating: 4.6,
    available: true,
    latitude: 37.7749,
    longitude: -122.4194,
    imageUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 3,
    title: 'Suburban Retreat',
    address: '457 Oakwood Ave',
    city: 'Austin',
    state: 'TX',
    price: 3200,
    beds: 3,
    baths: 2,
    area: 2100,
    type: 'house',
    rating: 4.5,
    available: false,
    latitude: 30.2672,
    longitude: -97.7431,
    imageUrl: 'https://images.unsplash.com/photo-1560180474-e8563fd75bab?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 4,
    title: 'Midtown Studio',
    address: '12 5th Ave',
    city: 'New York',
    state: 'NY',
    price: 2800,
    beds: 1,
    baths: 1,
    area: 700,
    type: 'studio',
    rating: 4.3,
    available: true,
    latitude: 40.7128,
    longitude: -74.006,
    imageUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 5,
    title: 'Canyon Ridge Home',
    address: '901 Canyon Rd',
    city: 'Denver',
    state: 'CO',
    price: 3600,
    beds: 4,
    baths: 3,
    area: 2600,
    type: 'house',
    rating: 4.7,
    available: true,
    latitude: 39.7392,
    longitude: -104.9903,
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 6,
    title: 'Harborfront Condo',
    address: '18 Harbor Ln',
    city: 'Seattle',
    state: 'WA',
    price: 4150,
    beds: 3,
    baths: 2,
    area: 1800,
    type: 'apartment',
    rating: 4.4,
    available: false,
    latitude: 47.6062,
    longitude: -122.3321,
    imageUrl: 'https://images.unsplash.com/photo-1429032021766-c6a53949594f?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 7,
    title: 'Garden Terrace',
    address: '75 Elm St',
    city: 'Chicago',
    state: 'IL',
    price: 3700,
    beds: 3,
    baths: 2,
    area: 1900,
    type: 'house',
    rating: 4.4,
    available: true,
    latitude: 41.8781,
    longitude: -87.6298,
    imageUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 8,
    title: 'Sunset Villas',
    address: '600 Sunset Blvd',
    city: 'Los Angeles',
    state: 'CA',
    price: 6500,
    beds: 5,
    baths: 4,
    area: 3200,
    type: 'villa',
    rating: 4.9,
    available: true,
    latitude: 34.0522,
    longitude: -118.2437,
    imageUrl: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 9,
    title: 'Lakeview Cottage',
    address: '44 Lakeview Dr',
    city: 'Minneapolis',
    state: 'MN',
    price: 2900,
    beds: 3,
    baths: 2,
    area: 1700,
    type: 'house',
    rating: 4.1,
    available: true,
    latitude: 44.9778,
    longitude: -93.265,
    imageUrl: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 10,
    title: 'Riverside Flats',
    address: '210 River Rd',
    city: 'Portland',
    state: 'OR',
    price: 3050,
    beds: 2,
    baths: 2,
    area: 1300,
    type: 'apartment',
    rating: 4.0,
    available: true,
    latitude: 45.5152,
    longitude: -122.6784,
    imageUrl: 'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 11,
    title: 'Desert Oasis',
    address: '58 Palm Canyon',
    city: 'Phoenix',
    state: 'AZ',
    price: 3400,
    beds: 4,
    baths: 3,
    area: 2300,
    type: 'house',
    rating: 4.5,
    available: false,
    latitude: 33.4484,
    longitude: -112.074,
    imageUrl: 'https://images.unsplash.com/photo-1430285561322-7808604715df?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 12,
    title: 'Historic Brownstone',
    address: '333 Beacon St',
    city: 'Boston',
    state: 'MA',
    price: 4800,
    beds: 3,
    baths: 3,
    area: 2100,
    type: 'house',
    rating: 4.7,
    available: true,
    latitude: 42.3601,
    longitude: -71.0589,
    imageUrl: 'https://images.unsplash.com/photo-1498661367879-c388fdf7c7c1?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 13,
    title: 'City View Studio',
    address: '10 Skyline Rd',
    city: 'Atlanta',
    state: 'GA',
    price: 2450,
    beds: 1,
    baths: 1,
    area: 650,
    type: 'studio',
    rating: 3.9,
    available: true,
    latitude: 33.749,
    longitude: -84.388,
    imageUrl: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 14,
    title: 'Seaside Bungalow',
    address: '72 Shoreline Way',
    city: 'San Diego',
    state: 'CA',
    price: 3900,
    beds: 3,
    baths: 2,
    area: 1800,
    type: 'house',
    rating: 4.6,
    available: true,
    latitude: 32.7157,
    longitude: -117.1611,
    imageUrl: 'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 15,
    title: 'Urban Sky Villa',
    address: '501 Skyline Ave',
    city: 'Houston',
    state: 'TX',
    price: 5200,
    beds: 5,
    baths: 4,
    area: 3000,
    type: 'villa',
    rating: 4.8,
    available: false,
    latitude: 29.7604,
    longitude: -95.3698,
    imageUrl: 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?auto=format&fit=crop&w=1200&q=80'
  }
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
// satisfy literal typing for `type`
] satisfies ReadonlyArray<Omit<Property, 'price'> & { price: number }>;

export const properties: Property[] = rawProperties.map((property) => ({
  ...property,
  price: toEth(property.price)
}));

export const PRICE_MIN = Math.min(...properties.map((p) => p.price));
export const PRICE_MAX = Math.max(...properties.map((p) => p.price));
