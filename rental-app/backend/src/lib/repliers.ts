import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export type MappedListing = {
  id: string;
  title: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  photoUrl?: string;
  rentEth: number;
  available: boolean;
};

const FALLBACK_PATH = path.join(__dirname, '..', 'data', 'listings.json');
const fetchFn: ((...args: any[]) => Promise<any>) | undefined = (globalThis as any).fetch;

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function mapRecord(record: any): MappedListing | null {
  if (!record) return null;
  const rawId = record.id ?? record.listingId ?? record.ListingID ?? record.propertyId;
  const id = rawId ? String(rawId) : crypto.randomUUID();
  const title = String(record.title ?? record.Title ?? `Listing ${id}`);
  const address1 = String(
    record.address1 ??
      record.address ??
      record.Address1 ??
      record.Address ??
      record.location?.address ??
      'Unknown address'
  );
  const city = String(record.city ?? record.City ?? record.location?.city ?? 'Unknown');
  const state = String(record.state ?? record.State ?? record.location?.state ?? '');
  const postalCode = String(record.postalCode ?? record.PostalCode ?? record.zip ?? record.Zip ?? '');
  const bedrooms = coerceNumber(record.bedrooms ?? record.Bedrooms ?? record.beds ?? record.Beds);
  const bathrooms = coerceNumber(record.bathrooms ?? record.Bathrooms ?? record.baths ?? record.Baths);
  const sqft = coerceNumber(record.sqft ?? record.Sqft ?? record.squareFeet);
  let photoUrl: string | undefined;
  const photos = record.photos ?? record.Photos ?? record.media ?? record.Media;
  if (Array.isArray(photos) && photos.length) {
    const first = photos[0];
    photoUrl = first?.url ?? first?.Url ?? (typeof first === 'string' ? first : undefined);
  } else if (typeof record.photoUrl === 'string') {
    photoUrl = record.photoUrl;
  }
  const rentValue =
    coerceNumber(record.rentEth ?? record.RentEth ?? record.rent ?? record.Rent ?? record.price ?? record.Price) ?? 0;

  return {
    id,
    title,
    address1,
    city,
    state,
    postalCode,
    bedrooms,
    bathrooms,
    sqft,
    photoUrl,
    rentEth: rentValue,
    available: Boolean(record.available ?? record.Available ?? true)
  };
}

async function fetchFromApi(): Promise<MappedListing[]> {
  const url = process.env.REPLIERS_API_URL;
  const key = process.env.REPLIERS_API_KEY;
  if (!url || !key || !fetchFn) return [];
  try {
    const response = await fetchFn(url, {
      headers: {
        Authorization: `Bearer ${key}`
      }
    });
    if (!response || !response.ok) {
      console.warn('Repliers API responded with', response?.status, response?.statusText);
      return [];
    }
    const payload = await response.json();
    const raw = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    return raw.map(mapRecord).filter((record: MappedListing | null): record is MappedListing => Boolean(record));
  } catch (error) {
    console.warn('Failed to fetch Repliers listings', error);
    return [];
  }
}

async function fetchFromDisk(): Promise<MappedListing[]> {
  try {
    const raw = await fs.readFile(FALLBACK_PATH, 'utf-8');
    const payload = JSON.parse(raw);
    if (!Array.isArray(payload)) return [];
    return payload.map(mapRecord).filter((record: MappedListing | null): record is MappedListing => Boolean(record));
  } catch (error) {
    console.warn('Failed to read fallback listings file', error);
    return [];
  }
}

export async function fetchRepliersListings(): Promise<MappedListing[]> {
  const fromApi = await fetchFromApi();
  if (fromApi.length) return fromApi;
  return fetchFromDisk();
}
