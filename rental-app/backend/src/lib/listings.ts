import fs from 'fs/promises';
import path from 'path';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from './prisma';

const dataPath = path.join(process.cwd(), 'src', 'data', 'listings.json');
const FEED_URL = process.env.REPLIERS_API_URL;
const FEED_KEY = process.env.REPLIERS_API_KEY;

type ListingPayload = {
  title: string;
  address: string;
  city: string;
  state: string;
  rentEth: string;
  beds: number;
  baths?: number;
  sqft?: number;
  amenities?: string;
  photoUrl?: string;
  externalUrl?: string;
};

async function loadFeed(): Promise<ListingPayload[]> {
  if (FEED_URL && FEED_KEY) {
    try {
      const response = await fetch(FEED_URL, {
        headers: {
          'x-api-key': FEED_KEY
        }
      });
      if (response.ok) {
        const json = await response.json();
        if (Array.isArray(json)) {
          return json as ListingPayload[];
        }
        if (Array.isArray(json.data)) {
          return json.data as ListingPayload[];
        }
      } else {
        console.warn('Repliers feed returned', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('Unable to fetch external listing feed, falling back to mock file', error);
    }
  }
  const raw = await fs.readFile(dataPath, 'utf-8');
  return JSON.parse(raw) as ListingPayload[];
}

export async function importListingsForOwner(ownerId: string) {
  const payload = await loadFeed();
  let imported = 0;
  for (const item of payload) {
    const existing = await prisma.listing.findFirst({
      where: {
        ownerId,
        title: item.title,
        address: item.address
      }
    });

    if (existing) {
      await prisma.listing.update({
        where: { id: existing.id },
        data: {
          city: item.city,
          state: item.state,
          rentEth: new Decimal(item.rentEth),
          beds: item.beds,
          baths: item.baths ? new Decimal(item.baths) : null,
          sqft: item.sqft,
          amenities: item.amenities,
          photoUrl: item.photoUrl,
          externalUrl: item.externalUrl,
          available: true
        }
      });
    } else {
      await prisma.listing.create({
        data: {
          ownerId,
          title: item.title,
          address: item.address,
          city: item.city,
          state: item.state,
          rentEth: new Decimal(item.rentEth),
          beds: item.beds,
          baths: item.baths ? new Decimal(item.baths) : null,
          sqft: item.sqft,
          amenities: item.amenities,
          photoUrl: item.photoUrl,
          externalUrl: item.externalUrl
        }
      });
      imported += 1;
    }
  }
  return imported;
}
