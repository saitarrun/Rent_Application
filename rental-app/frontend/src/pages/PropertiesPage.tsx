import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { properties, type Property } from '../data/properties';
import { filterProperties, sortProperties } from '../lib/filterAndSort';
import { usePropertyFilters } from '../state/usePropertyFilters';
import { PropertyGrid } from '../components/PropertyGrid';
import ApplicationWizard from '../components/ApplicationWizard';
const PropertyMap = lazy(() =>
  import('../components/PropertyMap').then((module) => ({ default: module.PropertyMap }))
);
import { useAppStore } from '../store/useAppStore';
import {
  fetchListings,
  fetchProperties as fetchPortfolio,
  fetchLeases,
  refreshListings,
  createListing,
  updateListing,
  submitApplication
} from '../lib/api';
import PageHeader from '../components/PageHeader';
import ConfirmModal from '../components/ConfirmModal';

const ETH_TO_USD = 3200;
const formatEth = (value: number) => Number(value.toFixed(3));
const formatUsd = (eth: number) => `$${Math.round(eth * ETH_TO_USD).toLocaleString()}`;
const FALLBACK_COORDS: [number, number] = [37.7749, -122.4194];
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80';

const normalizeTitle = (value?: string | null) => (value ? value.toLowerCase().trim() : '');

const cityTemplateLookup = new Map<string, Property>();
const templateById = new Map<number, Property>();
const templateTitleLookup = new Map<string, number>();
properties.forEach((property) => {
  const key = property.city.toLowerCase();
  if (!cityTemplateLookup.has(key)) {
    cityTemplateLookup.set(key, property);
  }
  templateById.set(property.id, property);
  templateTitleLookup.set(normalizeTitle(property.title), property.id);
});

const derivePropertyType = (listing: any, fallback?: Property): Property['type'] => {
  const tag = `${listing?.propertyType ?? ''} ${listing?.amenities ?? ''}`.toLowerCase();
  if (tag.includes('villa')) return 'villa';
  if (tag.includes('studio')) return 'studio';
  if (tag.includes('apartment')) return 'apartment';
  if (tag.includes('house')) return 'house';
  if ((listing?.beds ?? 0) >= 4) return 'house';
  if ((listing?.beds ?? 0) === 1) return 'studio';
  return fallback?.type ?? 'apartment';
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

const mergeTemplateWithListing = (template: Property, listing: any): Property => {
  const rentEth = listing.rentEth !== undefined && listing.rentEth !== null ? Number(listing.rentEth) : undefined;
  const beds = listing.beds !== undefined && listing.beds !== null ? Number(listing.beds) : undefined;
  const baths = listing.baths !== undefined && listing.baths !== null ? Number(listing.baths) : undefined;
  const area = listing.sqft !== undefined && listing.sqft !== null ? Number(listing.sqft) : undefined;
  return {
    ...template,
    title: listing.title || template.title,
    address: listing.address1 || template.address,
    city: listing.city || template.city,
    state: listing.state || template.state,
    price: rentEth && rentEth > 0 ? formatEth(rentEth) : template.price,
    beds: beds ?? template.beds,
    baths: baths ?? template.baths,
    area: area ?? template.area,
    available: typeof listing.available === 'boolean' ? listing.available : template.available,
    imageUrl: listing.photoUrl || template.imageUrl
  };
};

const buildPropertyFromListing = (listing: any, fallbackId: number, fallbackTemplate?: Property): Property => {
  const rentEth = listing.rentEth !== undefined && listing.rentEth !== null ? Number(listing.rentEth) : undefined;
  const beds = listing.beds !== undefined && listing.beds !== null ? Number(listing.beds) : 1;
  const baths = listing.baths !== undefined && listing.baths !== null ? Number(listing.baths) : 1;
  const area = listing.sqft !== undefined && listing.sqft !== null ? Number(listing.sqft) : fallbackTemplate?.area ?? 800;
  const template = fallbackTemplate ?? cityTemplateLookup.get((listing.city || '').toLowerCase());
  return {
    id: fallbackId,
    title: listing.title || template?.title || 'Listing',
    address: listing.address1 || template?.address || 'Address pending',
    city: listing.city || template?.city || 'Unknown',
    state: listing.state || template?.state || '',
    price: rentEth && rentEth > 0 ? formatEth(rentEth) : template?.price ?? 0,
    beds,
    baths,
    area,
    type: derivePropertyType(listing, template),
    rating: template?.rating ?? 4.7,
    available: Boolean(listing.available ?? true),
    latitude: template?.latitude ?? FALLBACK_COORDS[0],
    longitude: template?.longitude ?? FALLBACK_COORDS[1],
    imageUrl: listing.photoUrl || template?.imageUrl || FALLBACK_IMAGE
  };
};

export default function PropertiesPage() {
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
    favorites,
    toggleFavorite,
    setPrice
  } = usePropertyFilters();

  const [focusId, setFocusId] = useState<number | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [mapDrawerOpen, setMapDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [applicationWizardOpen, setApplicationWizardOpen] = useState(false);
  const [selectedPropertyForApplication, setSelectedPropertyForApplication] = useState<Property | null>(null);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const appRole = useAppStore((state) => state.role);
  const isOwner = appRole === 'owner';
  const showMarketplace = true;

  const {
    data: liveListings = [],
    isLoading: isLoadingListings,
    isError: isListingsError,
    error: listingsError
  } = useQuery({
    queryKey: ['liveListings'],
    queryFn: async () => {
      const result = await fetchListings();
      // Dev logging
      if (!isOwner && process.env.NODE_ENV === 'development') {
        console.log('[Tenant Listings API]', { result, isOwner });
      }
      return result;
    }
  });

  const handleRefreshListings = async () => {
    try {
      // call refresh endpoint to pull fresh data and then refetch cache
      await refreshListings();
      queryClient.invalidateQueries({ queryKey: ['liveListings'] });
      pushNotice('success', 'Listings refreshed');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to refresh listings';
      pushNotice('error', message);
    }
  };

  const { inventory, listingMapByPropertyId, publishedLookup } = useMemo(() => {
    const listingMap = new Map<number, any>();
    const publishedState = new Map<number, boolean>();
    properties.forEach((property) => publishedState.set(property.id, false));
    const overrides = new Map<number, Property>();
    const extras: Property[] = [];
    const usedSyntheticIds = new Set<number>();

    liveListings.forEach((listing: any, index: number) => {
      let templateId: number | undefined =
        typeof listing.propertyTemplateId === 'number'
          ? listing.propertyTemplateId
          : listing.propertyTemplateId
          ? Number(listing.propertyTemplateId)
          : undefined;

      if (!templateId && listing.property?.propertyTemplateId) {
        templateId = Number(listing.property.propertyTemplateId);
      }

      if (!templateId) {
        const normalized = normalizeTitle(listing.title);
        if (normalized && templateTitleLookup.has(normalized)) {
          templateId = templateTitleLookup.get(normalized);
        }
      }

      if (templateId && templateById.has(templateId)) {
        const template = templateById.get(templateId)!;
        overrides.set(templateId, mergeTemplateWithListing(template, listing));
        listingMap.set(templateId, listing);
        // Consider a listing published only when it's explicitly available
        publishedState.set(templateId, Boolean(listing.available));
        return;
      }

      const baseId = 1000 + Math.abs(hashString(listing.id ?? `${index}`));
      let fallbackId = baseId;
      while (usedSyntheticIds.has(fallbackId) || templateById.has(fallbackId)) {
        fallbackId += 1;
      }
      usedSyntheticIds.add(fallbackId);
      const fallbackProperty = buildPropertyFromListing(listing, fallbackId);
      extras.push(fallbackProperty);
      listingMap.set(fallbackId, listing);
      // For synthetic listings treat availability as the published flag
      publishedState.set(fallbackId, Boolean(listing.available));
    });

    const mergedInventory = properties.map((template) => overrides.get(template.id) ?? template);
    mergedInventory.push(...extras);

    return { inventory: mergedInventory, listingMapByPropertyId: listingMap, publishedLookup: publishedState };
  }, [liveListings]);

  const cityOptions = useMemo(() => Array.from(new Set(inventory.map((p) => p.city))).sort(), [inventory]);
  const priceBounds = useMemo(() => {
    if (!inventory.length) return null;
    const min = Math.min(...inventory.map((p) => p.price));
    const max = Math.max(...inventory.map((p) => p.price));
    return { min: Number(min.toFixed(2)), max: Number(max.toFixed(2)) };
  }, [inventory]);

  useEffect(() => {
    if (!priceBounds) return;
    const nextMin = Math.max(priceBounds.min, Math.min(priceMin, priceBounds.max));
    const nextMax = Math.min(priceBounds.max, Math.max(priceMax, priceBounds.min));
    if (nextMin !== priceMin || nextMax !== priceMax) {
      setPrice({ min: nextMin, max: nextMax });
    }
  }, [priceBounds, priceMin, priceMax, setPrice]);

  const filtered = useMemo(() => {
    const filtersPayload = {
      search,
      city,
      type,
      priceMin,
      priceMax,
      bedrooms,
      availableOnly: isOwner ? availableOnly : false,
      favoritesOnly,
      sort,
      favorites
    };
    const filteredList = filterProperties(inventory, filtersPayload);
    return sortProperties(filteredList, sort);
  }, [search, city, type, priceMin, priceMax, bedrooms, availableOnly, favoritesOnly, sort, favorites, inventory, isOwner]);
  const cityCount = new Set(inventory.map((p) => p.city)).size;

  const { data: leases = [] } = useQuery({
    queryKey: ['leases-overview'],
    queryFn: fetchLeases,
    enabled: isOwner
  });
  
  const queryClient = useQueryClient();
  const pushNotice = useAppStore((s) => s.pushNotice);
  const listingsErrorMessage =
    (listingsError as any)?.response?.data?.message ||
    (listingsError as Error | undefined)?.message ||
    'We could not load listings right now.';

  // UI keys to show loading states per template card
  const [publishingKey, setPublishingKey] = useState<string | null>(null);
  const [unpublishingKey, setUnpublishingKey] = useState<string | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState<null | { property: Property; listingId: string }>(null);

  const publishMutation = useMutation({
    mutationFn: (payload: any) => createListing(payload),
    onMutate: async (payload: any) => {
      await queryClient.cancelQueries({ queryKey: ['liveListings'] });
      const previous = queryClient.getQueryData<any[]>(['liveListings']) ?? [];
      const tempId = `temp-${payload.propertyTemplateId}-${Date.now()}`;
      const optimistic = {
        id: tempId,
        ownerId: useAppStore.getState().user?.id ?? 'me',
        title: payload.title,
        address1: payload.address1,
        city: payload.city,
        state: payload.state,
        beds: payload.beds,
        baths: payload.baths,
        sqft: payload.sqft,
        photoUrl: payload.photoUrl,
        rentEth: payload.rentEth,
        available: true,
        propertyTemplateId: payload.propertyTemplateId
      };
      queryClient.setQueryData(['liveListings'], [...previous, optimistic]);
      return { previous, tempId };
    },
    onError: (err, _vars, context: any) => {
      queryClient.setQueryData(['liveListings'], context?.previous ?? []);
      const message = (err as any)?.response?.data?.message || (err as Error)?.message || 'Failed to publish listing';
      pushNotice('error', message);
    },
    onSuccess: (data, _vars, context: any) => {
      const current = queryClient.getQueryData<any[]>(['liveListings']) ?? [];
      const replaced = current.map((l) => (l.id === context?.tempId ? data : l));
      queryClient.setQueryData(['liveListings'], replaced);
      pushNotice('success', 'Listing published');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['liveListings'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setPublishingKey(null);
    }
  });

  const unpublishMutation = useMutation({
  mutationFn: (vars: any) => updateListing(vars.id, vars.payload),
    onMutate: async ({ id }: { id: string }) => {
      await queryClient.cancelQueries({ queryKey: ['liveListings'] });
      const previous = queryClient.getQueryData<any[]>(['liveListings']) ?? [];
      const next = (previous || []).map((l: any) => (l.id === id ? { ...l, available: false } : l));
      queryClient.setQueryData(['liveListings'], next);
      return { previous };
    },
    onError: (err, _vars, context: any) => {
      queryClient.setQueryData(['liveListings'], context?.previous ?? []);
      const message = (err as any)?.response?.data?.message || (err as Error)?.message || 'Failed to unpublish listing';
      pushNotice('error', message);
    },
    onSuccess: (_data) => {
      pushNotice('success', 'Listing unpublished');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['liveListings'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setUnpublishingKey(null);
    }
  });

  const republishMutation = useMutation({
    mutationFn: (vars: any) => updateListing(vars.id, vars.payload),
    onMutate: async ({ id }: { id: string }) => {
      await queryClient.cancelQueries({ queryKey: ['liveListings'] });
      const previous = queryClient.getQueryData<any[]>(['liveListings']) ?? [];
      const next = (previous || []).map((l: any) => (l.id === id ? { ...l, available: true } : l));
      queryClient.setQueryData(['liveListings'], next);
      return { previous };
    },
    onError: (err, _vars, context: any) => {
      queryClient.setQueryData(['liveListings'], context?.previous ?? []);
      const message = (err as any)?.response?.data?.message || (err as Error)?.message || 'Failed to publish listing';
      pushNotice('error', message);
    },
    onSuccess: () => {
      pushNotice('success', 'Listing published');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['liveListings'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setPublishingKey(null);
    }
  });

  const applicationMutation = useMutation({
    mutationFn: (payload: any) => submitApplication(payload),
    onError: (err: any) => {
      const message = err?.response?.data?.message || (err as Error)?.message || 'Failed to submit application';
      pushNotice('error', message);
    },
    onSuccess: () => {
      pushNotice('success', 'Application submitted successfully');
      setApplicationWizardOpen(false);
      setSelectedPropertyForApplication(null);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    }
  });

  const handleApplyToProperty = (property: Property) => {
    setSelectedPropertyForApplication(property);
    setApplicationWizardOpen(true);
  };

  const handleApplicationSubmit = async (payload: any) => {
    // payload comes from ApplicationWizard: { details, documents, message }
    if (!selectedPropertyForApplication) return;

    const listingId = listingMapByPropertyId.get(selectedPropertyForApplication.id)?.id;
    if (!listingId) {
      pushNotice('error', 'Listing ID not found');
      return;
    }

    const submitPayload = {
      listingId,
      message: payload.message,
      details: payload.details,
      documents: payload.documents || []
    };

    try {
      await applicationMutation.mutateAsync(submitPayload);
    } catch (err: any) {
      // Error is handled in mutation callbacks
      console.error('Application submission error:', err);
    }
  };

  const handleApplicationWizardClose = () => {
    setApplicationWizardOpen(false);
    setSelectedPropertyForApplication(null);
  };

  const handlePublishListing = async (property: Property, listingId?: string) => {
    const key = `template-${property.id}`;
    setPublishingKey(key);
    try {
      if (listingId) {
        // republish existing listing
        await republishMutation.mutateAsync({ id: listingId, payload: { available: true } } as any);
        return;
      }

      const payload = {
        title: property.title,
        address1: property.address,
        city: property.city,
        state: property.state,
        postalCode: '',
        beds: Number(property.beds || 1),
        baths: Number(property.baths || 1),
        sqft: Number(property.area || 0),
        amenities: undefined,
        photoUrl: property.imageUrl,
        externalUrl: undefined,
        rentEth: Number(property.price || 0),
        available: true,
        propertyTemplateId: property.id
      };
      await publishMutation.mutateAsync(payload);
    } catch (err) {
      // swallow - pushNotice handled in mutation callbacks
    }
  };

  const handleUnpublishListing = async (property: Property, listingId: string) => {
    const key = `template-${property.id}`;
    setUnpublishingKey(key);
    try {
      await unpublishMutation.mutateAsync({ id: listingId, payload: { available: false } } as any);
    } catch (err) {
      // swallow - pushNotice handled in mutation callbacks
    }
  };

  const requestUnpublishListing = (property: Property, listingId: string) => {
    setConfirmUnpublish({ property, listingId });
  };

  const cancelUnpublish = () => setConfirmUnpublish(null);

  const confirmAndUnpublish = async () => {
    if (!confirmUnpublish) return;
    const { property, listingId } = confirmUnpublish;
    setConfirmUnpublish(null);
    await handleUnpublishListing(property, listingId);
  };

  const handleViewOnMap = (id: number) => {
    setFocusId(id);
    setHighlightedId(id);
    setMapDrawerOpen(true);
  };

  const handleMarkerClick = (id: number) => {
    setHighlightedId(id);
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const availableCount = useMemo(() => filtered.filter((property) => property.available).length, [filtered]);
  const summaryStats = [
    { label: 'Total properties', value: inventory.length },
    { label: 'Cities covered', value: cityCount },
  { label: isOwner ? 'Published listings' : 'Favorites saved', value: isOwner ? liveListings.filter((l: any) => l.available).length : favorites.length },
    { label: 'Available today', value: availableCount }
  ];

  const pageTitle = isOwner ? 'Portfolio' : 'Explore modern homes';
  const pageDescription = isOwner
    ? 'Manage your properties.'
    : 'Browse curated rentals and view the live map.';
  const headerActions = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex gap-2">
        {(['grid', 'map'] as const).map((mode) => {
          const active = viewMode === mode;
          return (
            <button
              key={mode}
              type="button"
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                active ? 'bg-brand text-brand-fg border-transparent' : 'border-outline text-muted hover:text-foreground'
              }`}
              onClick={() => {
                setViewMode(mode);
                if (mode === 'map') {
                  setMapDrawerOpen(false);
                  setTimeout(() => setMapDrawerOpen(false), 0);
                }
              }}
              aria-pressed={active}
            >
              {mode === 'grid' ? 'Grid view' : 'Map view'}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader title={pageTitle} description={pageDescription} actions={headerActions} />
      {isOwner && <p className="text-xs text-muted">Browsing in portfolio mode.</p>}
      {!isOwner && (
        <div className="rounded-2xl border border-dashed border-brand/30 bg-brand/5 p-4 text-sm text-muted">
          <p className="font-semibold text-foreground mb-2">Tenant View Debug:</p>
          <p>Live Listings: {Array.isArray(liveListings) ? liveListings.length : '?'}</p>
          <p>Total Properties: {inventory.length}</p>
          <p>Filtered Count: {filtered.length}</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-outline bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-muted">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>
      {showMarketplace &&
        (viewMode === 'grid' ? (
          !isOwner && !isLoadingListings && filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline/60 bg-white p-8 text-center text-muted">
              <p className="mb-2 text-lg font-semibold text-foreground">
                {isListingsError ? 'Unable to load listings' : 'No active listings found'}
              </p>
              <p className="mb-4 text-sm">
                {isListingsError
                  ? listingsErrorMessage
                  : "We couldn't find any published listings. This could be due to a network/auth issue or there are no listings published yet."}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['liveListings'] })}
                  className="rounded-xl border border-outline px-4 py-2 text-sm font-semibold"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={handleRefreshListings}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
                >
                  Refresh listings
                </button>
              </div>
              <p className="mt-4 text-xs text-muted">
                If this persists, open DevTools → Network and check the GET /api/listings response (401/403/empty array).
              </p>
            </div>
          ) : (
            <PropertyGrid
              properties={filtered}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onViewOnMap={handleViewOnMap}
              onApply={!isOwner ? handleApplyToProperty : undefined}
              highlightedId={highlightedId}
              registerCardRef={(id, node) => {
                cardRefs.current[id] = node;
              }}
              showApplyButton={!isOwner}
              isOwnerView={isOwner}
              publishedLookup={publishedLookup}
              listingLookup={listingMapByPropertyId}
              onPublishListing={handlePublishListing}
              onUnpublishListing={requestUnpublishListing}
              publishingKey={publishingKey ?? undefined}
              unpublishingKey={unpublishingKey ?? undefined}
            />
          )
        ) : (
          <Suspense fallback={<div className="rounded-3xl border border-outline bg-white p-8 text-center text-muted">Loading map…</div>}>
            <div className="rounded-3xl border border-outline bg-white p-2 shadow-soft">
              <PropertyMap properties={filtered} focusId={focusId ?? undefined} onMarkerClick={handleMarkerClick} activeId={highlightedId ?? undefined} />
            </div>
          </Suspense>
        ))}

      <AnimatePresence>
        {mapDrawerOpen && (
          <motion.div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 shadow-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-muted">Map view</p>
                <button type="button" onClick={() => setMapDrawerOpen(false)} className="rounded-full border border-outline p-2" aria-label="Close map view">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Suspense fallback={<div className="rounded-3xl border border-outline bg-white p-4 text-center text-muted">Loading map…</div>}>
                <PropertyMap properties={filtered} focusId={focusId ?? undefined} onMarkerClick={handleMarkerClick} activeId={highlightedId ?? undefined} />
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmModal
        isOpen={!!confirmUnpublish}
        onCancel={cancelUnpublish}
        onConfirm={confirmAndUnpublish}
        title="Confirm unpublish"
        description="Are you sure you want to make this listing unavailable? This will prevent new applications."
        confirmLabel="Unpublish"
        isDestructive
      />
      {selectedPropertyForApplication && (
        <ApplicationWizard
          listing={{
            id: listingMapByPropertyId.get(selectedPropertyForApplication.id)?.id || selectedPropertyForApplication.id.toString(),
            title: selectedPropertyForApplication.title,
            city: selectedPropertyForApplication.city,
            price: selectedPropertyForApplication.price
          }}
          onClose={handleApplicationWizardClose}
          onSubmit={handleApplicationSubmit}
          submitting={applicationMutation.isPending}
        />
      )}
    </motion.div>
  );
}
