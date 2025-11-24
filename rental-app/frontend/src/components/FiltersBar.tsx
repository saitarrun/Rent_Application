import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, RefreshCcw, Star } from 'lucide-react';
import { PRICE_MAX, PRICE_MIN } from '../data/properties';
import { BedroomsFilter, usePropertyFilters } from '../state/usePropertyFilters';

type FiltersBarProps = {
  cities: string[];
  priceBounds?: { min: number; max: number } | null;
};

const bedroomOptions: BedroomsFilter[] = ['any', '1', '2', '3', '4+'];

export function FiltersBar({ cities, priceBounds }: FiltersBarProps) {
  const {
    search,
    city,
    type,
    priceMin,
    priceMax,
    bedrooms,
    availableOnly,
    favoritesOnly,
    sort,
    setSearch,
    setCity,
    setType,
    setPrice,
    setBedrooms,
    setAvailableOnly,
    setFavoritesOnly,
    setSort,
    resetFilters
  } = usePropertyFilters();

  const [open, setOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => setLocalSearch(search), [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearch]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const typeOptions = useMemo(() => ['all', 'house', 'apartment', 'villa', 'studio'], []);
  const minPriceBound = priceBounds?.min ?? PRICE_MIN;
  const maxPriceBound = priceBounds?.max ?? PRICE_MAX;

  return (
    <div className="rounded-3xl border border-outline bg-white shadow-soft touch-pan-y">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-muted md:hidden"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </span>
        <span>{open ? 'Hide' : 'Show'}</span>
      </button>
      <AnimatePresence initial={false}>
        {(open || isDesktop) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-4 md:px-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <input
                className="flex-1 rounded-full border border-outline bg-white px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                placeholder="Search by city, address, or name"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFavoritesOnly(!favoritesOnly)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm ${
                    favoritesOnly ? 'border-brand bg-brand/10 text-brand' : 'border-outline text-muted'
                  }`}
                >
                  <Star className="h-4 w-4" />
                  Favorites
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 rounded-full border border-outline px-3 py-1.5 text-sm text-muted hover:text-foreground"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold uppercase text-muted">
                City
                <select
                  className="mt-1 w-full rounded-xl border border-outline bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="all">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase text-muted">
                Type
                <select
                  className="mt-1 w-full rounded-xl border border-outline bg-white px-3 py-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                >
                  {typeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'All types' : option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase text-muted">
                Sort by
                <select
                  className="mt-1 w-full rounded-xl border border-outline bg-white px-3 py-2 text-sm"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                >
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating-desc">Rating</option>
                  <option value="bedrooms-desc">Bedrooms</option>
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted">Price range (Ξ)</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={minPriceBound}
                    max={priceMax}
                    value={priceMin}
                    step="0.01"
                    onChange={(e) =>
                      setPrice({
                        min: Math.min(Number(e.target.value), priceMax),
                        max: priceMax
                      })
                    }
                    className="w-24 rounded-lg border border-outline px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-muted">to</span>
                  <input
                    type="number"
                    min={priceMin}
                    max={maxPriceBound}
                    value={priceMax}
                    step="0.01"
                    onChange={(e) =>
                      setPrice({
                        min: priceMin,
                        max: Math.max(Number(e.target.value), priceMin)
                      })
                    }
                    className="w-24 rounded-lg border border-outline px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <label className="text-xs font-semibold uppercase text-muted">
                Bedrooms
                <select
                  className="mt-1 w-full rounded-xl border border-outline bg-white px-3 py-2 text-sm"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value as BedroomsFilter)}
                >
                  {bedroomOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'any' ? 'Any' : option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex items-center gap-2 rounded-2xl border border-outline px-4 py-3 text-sm font-medium text-muted">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-muted text-brand focus:ring-brand"
                />
                Available only
              </label>
              <label className="inline-flex items-center gap-2 rounded-2xl border border-outline px-4 py-3 text-sm font-medium text-muted">
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(e) => setFavoritesOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-muted text-brand focus:ring-brand"
                />
                Favorites only
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
