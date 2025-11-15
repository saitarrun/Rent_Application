import fs from 'fs/promises';
import path from 'path';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from './prisma';
import crypto from 'crypto';

const dataPath = path.join(process.cwd(), 'src', 'data', 'listings.json');
const FEED_URL = process.env.REPLIERS_API_URL;
const FEED_KEY = process.env.REPLIERS_API_KEY;

type ListingPayload = {
  id: string;
  title: string;
  address1: string;
  city: string;
  state: string;
  postalCode?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  photoUrl?: string;
  rentEth?: number;
  amenities?: string;
  available?: boolean;
};

function mapRepliersRecord(record: any): ListingPayload | null {
  const rawId = record?.id ?? record?.listingId ?? record?.ListingID ?? record?.propertyId;
  const id = rawId ? String(rawId) : crypto.randomUUID();
  const address = record?.address || record?.Address || {};
  const address1 = address?.address1 || address?.Address1 || record?.address1 || record?.Address1 || record?.address || '';
  const city = address?.city || address?.City || record?.city || record?.City || 'Unknown';
  const state = address?.state || address?.State || record?.state || record?.State || 'NA';
  const postalCode = address?.postalCode || address?.PostalCode || record?.postalCode;
  const title = record?.title || record?.Title || `${record?.bedrooms ?? record?.Bedrooms ?? ''} BR in ${city}`;
  const bedrooms = record?.bedrooms ?? record?.Bedrooms ?? record?.beds ?? record?.Beds;
  const baths = record?.bathrooms ?? record?.Bathrooms ?? record?.baths ?? record?.Baths;
  const sqft = record?.sqft ?? record?.Sqft ?? record?.squareFeet;
  const photos = record?.photos || record?.Photos || record?.media || record?.Media;
  let photoUrl: string | undefined;
  if (Array.isArray(photos) && photos.length) {
    photoUrl = photos[0]?.url || photos[0]?.Url || photos[0];
  }
  const price = record?.rentEth ?? record?.RentEth ?? record?.rent ?? record?.Rent ?? record?.price ?? record?.Price;
  let rentEth: number | undefined;
  const normalizePrice = (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  };
  const numericPrice = normalizePrice(price);
  if (typeof numericPrice === 'number') {
    rentEth = numericPrice > 100 ? Number((numericPrice / 1800).toFixed(6)) : numericPrice;
  }

  return {
    id,
    title,
    address1,
    city,
    state,
    postalCode,
    beds: bedrooms ? Number(bedrooms) : undefined,
    baths: baths ? Number(baths) : undefined,
    sqft: sqft ? Number(sqft) : undefined,
    photoUrl,
    amenities: record?.amenities ?? record?.Amenities ?? '',
    rentEth,
    available: record?.available ?? record?.Available ?? true
  };
}

async function loadFeed(): Promise<ListingPayload[]> {
  if (FEED_URL && FEED_KEY) {
    try {
      const response = await fetch(FEED_URL, {
        headers: {
          Authorization: `Bearer ${FEED_KEY}`
        }
      });
      if (response.ok) {
        const json = await response.json();
        const rawArray = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        const mapped = rawArray
          .map(mapRepliersRecord)
          .filter((item: ListingPayload | null): item is ListingPayload => Boolean(item));
        if (mapped.length) return mapped;
      } else {
        console.warn('Repliers feed returned', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('Unable to fetch external listing feed, falling back to mock file', error);
    }
  }
  const raw = await fs.readFile(dataPath, 'utf-8');
  const local = JSON.parse(raw) as Array<Record<string, any>>;
  return local
    .map((item) =>
      mapRepliersRecord({
        id: item.id,
        title: item.title,
        address1: item.address,
        city: item.city,
        state: item.state,
        rentEth: item.rentEth,
        beds: item.beds,
        baths: item.baths,
        sqft: item.sqft,
        amenities: item.amenities,
        photos: item.photoUrl ? [{ url: item.photoUrl }] : undefined,
        available: item.available
      })
    )
    .filter((item: ListingPayload | null): item is ListingPayload => Boolean(item));
}

export async function importListingsForOwner(ownerId: string) {
  const payload = await loadFeed();
  let imported = 0;
  for (const item of payload) {
    const rentDecimal: Decimal = new Decimal(item.rentEth ?? 0);
    const bathsDecimal = item.baths !== undefined ? new Decimal(item.baths) : undefined;
    await prisma.listing.upsert({
      where: { id: item.id },
      update: {
        ownerId,
        title: item.title,
        address1: item.address1,
        city: item.city,
        state: item.state,
        postalCode: item.postalCode,
        beds: item.beds ?? 1,
        baths: bathsDecimal,
        sqft: item.sqft ?? undefined,
        amenities: item.amenities,
        photoUrl: item.photoUrl,
        rentEth: rentDecimal,
        available: item.available ?? true
      },
      create: {
        id: item.id,
        ownerId,
        title: item.title,
        address1: item.address1,
        city: item.city,
        state: item.state,
        postalCode: item.postalCode,
        beds: item.beds ?? 1,
        baths: bathsDecimal,
        sqft: item.sqft ?? undefined,
        amenities: item.amenities,
        photoUrl: item.photoUrl,
        rentEth: rentDecimal,
        available: item.available ?? true
      }
    });
    imported += 1;
  }
  return imported;
}
