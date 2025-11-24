import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PRICE_MAX, PRICE_MIN } from '../data/properties';
import type { SortKey } from '../lib/filterAndSort';

export type BedroomsFilter = 'any' | '1' | '2' | '3' | '4+';

export type PropertyFilters = {
  search: string;
  city: string;
  type: 'all' | 'house' | 'apartment' | 'villa' | 'studio';
  priceMin: number;
  priceMax: number;
  bedrooms: BedroomsFilter;
  availableOnly: boolean;
  favoritesOnly: boolean;
  sort: SortKey;
  favorites: number[];
};

type FilterActions = {
  setSearch: (value: string) => void;
  setCity: (value: string) => void;
  setType: (value: PropertyFilters['type']) => void;
  setPrice: (range: { min: number; max: number }) => void;
  setBedrooms: (value: BedroomsFilter) => void;
  setAvailableOnly: (value: boolean) => void;
  setFavoritesOnly: (value: boolean) => void;
  setSort: (value: SortKey) => void;
  resetFilters: () => void;
  toggleFavorite: (id: number) => void;
};

const defaultFilters: PropertyFilters = {
  search: '',
  city: 'all',
  type: 'all',
  priceMin: PRICE_MIN,
  priceMax: PRICE_MAX,
  bedrooms: 'any',
  availableOnly: false,
  favoritesOnly: false,
  sort: 'price-asc',
  favorites: []
};

export const usePropertyFilters = create<PropertyFilters & FilterActions>()(
  persist(
    (set, get) => ({
      ...defaultFilters,
      setSearch: (search) => set({ search }),
      setCity: (city) => set({ city }),
      setType: (type) => set({ type }),
      setPrice: ({ min, max }) => set({ priceMin: min, priceMax: max }),
      setBedrooms: (bedrooms) => set({ bedrooms }),
      setAvailableOnly: (availableOnly) => set({ availableOnly }),
      setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),
      setSort: (sort) => set({ sort }),
      resetFilters: () =>
        set((state) => ({
          ...defaultFilters,
          favorites: state.favorites
        })),
      toggleFavorite: (id) =>
        set((state) => {
          const exists = state.favorites.includes(id);
          return {
            favorites: exists ? state.favorites.filter((fav) => fav !== id) : [...state.favorites, id]
          };
        })
    }),
    {
      name: 'property-filters',
      partialize: (state) => ({ favorites: state.favorites })
    }
  )
);

export const useFilterValues = () => usePropertyFilters((state) => state);
