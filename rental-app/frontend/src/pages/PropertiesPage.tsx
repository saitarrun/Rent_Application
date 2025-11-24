import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { properties, type Property } from '../data/properties';
import { filterProperties, sortProperties } from '../lib/filterAndSort';
import { usePropertyFilters } from '../state/usePropertyFilters';
import { PropertyGrid } from '../components/PropertyGrid';
const PropertyMap = lazy(() =>
  import('../components/PropertyMap').then((module) => ({ default: module.PropertyMap }))
);
import { useAppStore } from '../store/useAppStore';
import {
  createListing,
  deleteListing,
  fetchListings,
  fetchProperties as fetchPortfolio,
  fetchLeases,
  refreshListings,
  submitApplication,
  updateListing,
  SubmitApplicationPayload
} from '../lib/api';
import { AnimatedButton } from '../components/AnimatedButton';
import SectionCard from '../components/SectionCard';
import ApplicationWizard from '../components/ApplicationWizard';
import PageHeader from '../components/PageHeader';

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

type ListingDraft = {
  title: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  rentEth: string;
  beds: number;
  baths: number;
  sqft: number;
  amenities: string;
  photoUrl: string;
  externalUrl: string;
  propertyId?: string;
  propertyTemplateId: number | null;
};

const emptyListingDraft: ListingDraft = {
  title: '',
  address1: '',
  city: '',
  state: '',
  postalCode: '',
  rentEth: '',
  beds: 1,
  baths: 1,
  sqft: 500,
  amenities: '',
  photoUrl: '',
  externalUrl: '',
  propertyId: '',
  propertyTemplateId: null
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
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const appRole = useAppStore((state) => state.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const isOwner = appRole === 'owner';
  const ownerMode: 'marketplace' | 'portfolio' = 'marketplace';
  const showMarketplace = true;
  const queryClient = useQueryClient();
  type ListingFormErrors = Partial<Record<'title' | 'address1' | 'city' | 'state' | 'rentEth' | 'beds' | 'baths' | 'sqft' | 'propertyTemplateId' | 'general', string>>;
  const [listingFormVisible, setListingFormVisible] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [listingDraft, setListingDraft] = useState<ListingDraft>(emptyListingDraft);
  const [applyListing, setApplyListing] = useState<any>(null);
  const [listingErrors, setListingErrors] = useState<ListingFormErrors>({});
  const [listingSaveMessage, setListingSaveMessage] = useState<string | null>(null);

  const startCreateListing = () => {
    setEditingListing(null);
    setListingDraft(emptyListingDraft);
    setListingFormVisible(true);
    setListingErrors({});
    setListingSaveMessage(null);
  };

  const {
    data: portfolio = [],
    isLoading: portfolioLoading
  } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => fetchPortfolio({ withListings: true }),
    enabled: isOwner
  });

  const {
    data: liveListings = [],
    isLoading: liveListingsLoading
  } = useQuery({
    queryKey: ['liveListings'],
    queryFn: () => fetchListings()
  });

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
        publishedState.set(templateId, true);
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
      publishedState.set(fallbackId, true);
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
      availableOnly,
      favoritesOnly,
      sort,
      favorites
    };
    const filteredList = filterProperties(inventory, filtersPayload);
    return sortProperties(filteredList, sort);
  }, [search, city, type, priceMin, priceMax, bedrooms, availableOnly, favoritesOnly, sort, favorites, inventory]);
  const cityCount = new Set(inventory.map((p) => p.city)).size;

  const refreshOwnerListings = useMutation({
    mutationFn: refreshListings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['liveListings'] })
  });

  const validateListingDraft = (draft: ListingDraft): ListingFormErrors => {
    const errors: ListingFormErrors = {};
    if (!draft.title.trim()) errors.title = 'Title is required.';
    if (!draft.address1.trim()) errors.address1 = 'Street address is required.';
    if (!draft.city.trim()) errors.city = 'City is required.';
    if (!draft.state.trim()) errors.state = 'State is required.';
    if (!draft.rentEth || Number(draft.rentEth) <= 0) errors.rentEth = 'Rent must be greater than zero.';
    if (!draft.propertyTemplateId) errors.propertyTemplateId = 'Template is required.';
    return errors;
  };

  const saveListingMutation = useMutation({
    mutationFn: () => {
      const errors = validateListingDraft(listingDraft);
      if (Object.keys(errors).length) {
        setListingErrors(errors);
        return Promise.reject(new Error('validation'));
      }
      const payload = {
        ...listingDraft,
        rentEth: Number(listingDraft.rentEth || 0),
        beds: Number(listingDraft.beds),
        baths: Number(listingDraft.baths),
        sqft: Number(listingDraft.sqft) || 0,
        propertyTemplateId: listingDraft.propertyTemplateId ?? undefined
      };
      setListingErrors({});
      setListingSaveMessage(null);
      return editingListing ? updateListing(editingListing.id, payload) : createListing(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liveListings'] });
      setListingFormVisible(false);
      setEditingListing(null);
      setListingDraft(emptyListingDraft);
      setListingErrors({});
      setListingSaveMessage('Listing saved!');
    },
    onError: (err: any) => {
      if (err?.message === 'validation') return;
      setListingErrors((prev) => ({
        ...prev,
        general: err?.response?.data?.message || 'Unable to save listing.'
      }));
    }
  });

const deleteListingMutation = useMutation({
  mutationFn: (id: string) => deleteListing(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['liveListings'] })
});

const buildPortfolioListingPayload = (property: any) => ({
  title: property.name || property.listing?.title || 'Listing',
  address1: property.address || property.listing?.address1 || 'Pending address',
  city: property.city || property.listing?.city || 'Metropolis',
  state: property.state || property.listing?.state || 'NY',
  postalCode: property.postalCode || '',
  rentEth: Number(property.monthlyRentEth ?? property.rentEth ?? property.price ?? 1) || 1,
  beds: Number(property.beds ?? 1),
  baths: Number(property.baths ?? 1),
  sqft: Number(property.sqft ?? property.area ?? 0),
  amenities: property.amenities || '',
  photoUrl: property.photoUrl || property.imageUrl || '',
  externalUrl: property.externalUrl || '',
  propertyId: property.id,
  propertyTemplateId: property.propertyTemplateId ?? property.templateId ?? undefined
});

const buildTemplateListingPayload = (template: Property) => ({
  title: template.title,
  address1: template.address,
  city: template.city,
  state: template.state,
  postalCode: '',
  rentEth: template.price,
  beds: template.beds,
  baths: template.baths,
  sqft: template.area,
  amenities: '',
  photoUrl: template.imageUrl,
  externalUrl: '',
  propertyTemplateId: template.id
});

const quickPublishMutation = useMutation({
  mutationFn: (payload: { listing: any; trackingKey: string }) => createListing(payload.listing),
  onSuccess: () => {
    pushNotice('success', 'Listing published to marketplace');
    queryClient.invalidateQueries({ queryKey: ['liveListings'] });
  },
  onError: (err: any) => pushNotice('error', err?.response?.data?.message || 'Unable to publish listing')
});
const publishingKey = quickPublishMutation.variables?.trackingKey as string | undefined;
  const unpublishMutation = useMutation({
    mutationFn: ({ listingId }: { listingId: string; trackingKey: string }) => deleteListing(listingId),
    onSuccess: () => {
      pushNotice('success', 'Listing unpublished from marketplace');
      queryClient.invalidateQueries({ queryKey: ['liveListings'] });
    },
    onError: (err: any) => pushNotice('error', err?.response?.data?.message || 'Unable to unpublish listing')
  });
  const unpublishingKey = unpublishMutation.variables?.trackingKey as string | undefined;

  const publishTemplateProperty = (template: Property) =>
    quickPublishMutation.mutate({
      listing: buildTemplateListingPayload(template),
      trackingKey: `template-${template.id}`
    });

  const publishPortfolioProperty = (property: any) =>
    quickPublishMutation.mutate({
      listing: buildPortfolioListingPayload(property),
      trackingKey: `portfolio-${property.id}`
    });

  const unpublishByListing = (propertyKey: string, listingId: string) =>
    unpublishMutation.mutate({
      listingId,
      trackingKey: propertyKey
    });

  const { data: leases = [] } = useQuery({
    queryKey: ['leases-overview'],
    queryFn: fetchLeases,
    enabled: isOwner
  });

  const applyMutation = useMutation({
    mutationFn: (payload: SubmitApplicationPayload) => submitApplication(payload),
    onSuccess: () => {
      pushNotice('success', 'Application submitted');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setApplyListing(null);
    },
    onError: (err: any) => pushNotice('error', err?.response?.data?.message || 'Unable to submit application')
  });

  const handleViewOnMap = (id: number) => {
    setFocusId(id);
    setHighlightedId(id);
    setMapDrawerOpen(true);
  };

  const handleMarkerClick = (id: number) => {
    setHighlightedId(id);
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleApplyFromCard = (property: Property) => {
    const listing = listingMapByPropertyId.get(property.id);
    if (!listing) {
      pushNotice('error', 'Owner has not published this listing yet.');
      return;
    }
    if (!listing.available) {
      pushNotice('info', 'This listing is currently leased.');
      return;
    }
    setApplyListing(listing);
  };

  const availableCount = useMemo(() => filtered.filter((property) => property.available).length, [filtered]);
  const summaryStats = [
    { label: 'Total properties', value: inventory.length },
    { label: 'Cities covered', value: cityCount },
    { label: isOwner ? 'Published listings' : 'Favorites saved', value: isOwner ? liveListings.length : favorites.length },
    { label: 'Available today', value: availableCount }
  ];

  const availableListingsCount = useMemo(
    () => liveListings.filter((listing: any) => listing.available).length,
    [liveListings]
  );
  const pausedListingsCount = useMemo(
    () => liveListings.length - availableListingsCount,
    [liveListings, availableListingsCount]
  );
  const templatesNeedingListing = useMemo(
    () => inventory.filter((property) => templateById.has(property.id) && !publishedLookup.get(property.id)).length,
    [inventory, liveListings]
  );
  const depositsDueCount = useMemo(
    () =>
      leases.filter((lease: any) => {
        const deposit = Number(lease.securityDepositEth ?? 0);
        const balance = Number(lease.depositBalanceEth ?? 0);
        return deposit > 0 && balance < deposit;
      }).length,
    [leases]
  );
  const annualDueCount = useMemo(
    () =>
      leases.filter((lease: any) => {
        const annualAmount = Number(lease.annualRentEth ?? 0);
        if (annualAmount === 0) return false;
        return !(lease.receipts?.some((receipt: any) => Number(receipt.paidEth ?? 0) >= annualAmount));
      }).length,
    [leases]
  );
  const openRepairsCount = useMemo(
    () =>
      leases.reduce(
        (sum: number, lease: any) =>
          sum + (lease.repairs?.filter((repair: any) => repair.status !== 'closed' && repair.status !== 'resolved').length ?? 0),
        0
      ),
    [leases]
  );
  const pageTitle = isOwner ? 'Portfolio & marketplace' : 'Explore modern homes';
  const pageDescription = isOwner
    ? 'Preview the tenant-facing browse experience and manage availability.'
    : 'Browse curated rentals, view the live map, and submit lease applications in one place.';
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
      {isOwner && <p className="text-xs text-muted">Browsing in marketplace preview mode.</p>}
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
          <PropertyGrid
            properties={filtered}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onViewOnMap={handleViewOnMap}
            highlightedId={highlightedId}
            registerCardRef={(id, node) => {
              cardRefs.current[id] = node;
            }}
            showApplyButton={!isOwner}
            onApply={handleApplyFromCard}
            isOwnerView={isOwner}
            publishedLookup={publishedLookup}
            listingLookup={listingMapByPropertyId}
            onPublishListing={isOwner ? publishTemplateProperty : undefined}
            onUnpublishListing={
              isOwner
                ? (_property, listingId) => unpublishByListing(`template-${_property.id}`, listingId)
                : undefined
            }
            publishingKey={publishingKey}
            unpublishingKey={unpublishingKey}
          />
        ) : (
          <Suspense fallback={<div className="rounded-3xl border border-outline bg-white p-8 text-center text-muted">Loading map…</div>}>
            <div className="rounded-3xl border border-outline bg-white p-2 shadow-soft">
              <PropertyMap properties={filtered} focusId={focusId ?? undefined} onMarkerClick={handleMarkerClick} activeId={highlightedId ?? undefined} />
            </div>
          </Suspense>
        ))}

      <section id="portfolio-listings">
            <SectionCard title="Listing manager" description="Publish listings tied to your properties.">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">Keep listings synchronized with your property templates and availability.</p>
              <div className="flex flex-wrap gap-2">
                <AnimatedButton className="px-5" onClick={startCreateListing}>
                  Add listing
                </AnimatedButton>
                <button
                  type="button"
                  className="rounded-full border border-outline px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted hover:text-foreground"
                  onClick={() => refreshOwnerListings.mutate()}
                >
                  {refreshOwnerListings.isPending ? 'Syncing…' : 'Sync feed'}
                </button>
              </div>
            </div>
            {liveListingsLoading ? (
              <p className="text-sm text-muted">Loading listings…</p>
            ) : liveListings.length ? (
              <div className="space-y-4">
                {liveListings.map((listing: any) => (
                  <article key={listing.id} className="rounded-2xl border border-outline/40 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">{listing.city}</p>
                        <h3 className="text-lg font-semibold">{listing.title}</h3>
                        <p className="text-sm text-muted">{listing.address1}</p>
                        <p className="text-xs text-muted">
                          {listing.propertyTemplateId
                            ? `Template #${listing.propertyTemplateId} ${
                                templateById.get(Number(listing.propertyTemplateId))?.title ?? ''
                              }`
                            : 'No template linked'}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${listing.available ? 'bg-green-100 text-success' : 'bg-slate-100 text-muted'}`}>
                        {listing.available ? 'Available' : 'Leased'}
                      </span>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">
                        ETH {Number(listing.rentEth ?? 0).toFixed(2)} /mo
                      </p>
                      <p className="text-xs text-muted">{formatUsd(Number(listing.rentEth ?? 0))}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
                      <span>
                        {listing.beds} bd • {listing.baths ?? 1} ba
                      </span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          className="text-brand font-semibold"
                          onClick={() => {
                            setEditingListing(listing);
                            setListingDraft({
                              title: listing.title || '',
                              address1: listing.address1 || '',
                              city: listing.city || '',
                              state: listing.state || '',
                              postalCode: listing.postalCode || '',
                              rentEth: listing.rentEth?.toString() || '',
                              beds: listing.beds || 1,
                              baths: listing.baths || 1,
                              sqft: listing.sqft || 0,
                              amenities: listing.amenities || '',
                              photoUrl: listing.photoUrl || '',
                              externalUrl: listing.externalUrl || '',
                              propertyId: listing.propertyId || '',
                              propertyTemplateId: listing.propertyTemplateId ?? null
                            });
                            setListingFormVisible(true);
                            setListingErrors({});
                            setListingSaveMessage(null);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-danger font-semibold"
                          onClick={() => deleteListingMutation.mutate(listing.id)}
                          disabled={deleteListingMutation.isPending}
                        >
                          {deleteListingMutation.isPending ? 'Removing…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-3">
                      <span className={`inline-flex items-center gap-1 ${listing.propertyTemplateId ? 'text-success' : 'text-warning'}`}>
                        {listing.propertyTemplateId ? '✓ Template linked' : '• Template missing'}
                      </span>
                      <span className={`inline-flex items-center gap-1 ${Number(listing.rentEth ?? 0) > 0 ? 'text-success' : 'text-warning'}`}>
                        {Number(listing.rentEth ?? 0) > 0 ? '✓ Rent set' : '• Rent required'}
                      </span>
                      <span className={`inline-flex items-center gap-1 ${listing.available ? 'text-success' : 'text-warning'}`}>
                        {listing.available ? 'Ready to publish' : 'Mark unavailable'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No listings yet. Start by assigning a template and publishing.</p>
            )}
            </SectionCard>
          </section>

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

      {listingFormVisible && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveListingMutation.mutate();
            }}
            className="w-full max-w-3xl space-y-5 rounded-[32px] border border-outline bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            noValidate
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editingListing ? 'Edit listing' : 'New listing'}</h2>
              <button
                type="button"
                className="rounded-full border border-outline p-2"
                onClick={() => {
                  setListingFormVisible(false);
                  setEditingListing(null);
                  setListingErrors({});
                  setListingSaveMessage(null);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs uppercase text-muted">
                Template property <span className="text-danger">*</span>
                <select
                  className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-sm"
                  value={listingDraft.propertyTemplateId ?? ''}
                  onChange={(e) =>
                    setListingDraft((prev) => ({
                      ...prev,
                      propertyTemplateId: e.target.value ? Number(e.target.value) : null
                    }))
                  }
                  required
                >
                  <option value="">Select a template</option>
                  {properties.map((template) => (
                    <option key={template.id} value={template.id}>
                      #{template.id} {template.title} ({template.city})
                    </option>
                  ))}
                </select>
                {listingErrors.propertyTemplateId && (
                  <p className="text-xs text-danger">{listingErrors.propertyTemplateId}</p>
                )}
              </label>
              <label className="text-xs uppercase text-muted">
                Property
                <select
                  className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-sm"
                  value={listingDraft.propertyId || ''}
                  onChange={(e) => setListingDraft((prev) => ({ ...prev, propertyId: e.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {portfolio.map((property: any) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {['title', 'address1', 'city', 'state', 'postalCode', 'amenities'].map((field) => {
                const required = ['title', 'address1', 'city', 'state'].includes(field);
                return (
                  <label key={field} className="text-xs uppercase text-muted">
                    {field}
                    {required && <span className="text-danger">*</span>}
                    <input
                      className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-sm"
                      placeholder={field}
                      value={(listingDraft as any)[field]}
                      onChange={(e) => setListingDraft((prev) => ({ ...prev, [field]: e.target.value }))}
                      required={required}
                    />
                    {listingErrors[field as keyof ListingFormErrors] && (
                      <p className="text-xs text-danger">{listingErrors[field as keyof ListingFormErrors]}</p>
                    )}
                  </label>
                );
              })}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {['rentEth', 'photoUrl', 'externalUrl'].map((field) => (
                <label key={field} className="text-xs uppercase text-muted">
                  {field === 'rentEth' ? 'Rent (ETH)' : field}
                  <input
                    className="mt-1 w-full rounded-xl border border-outline px-3 py-2 text-sm"
                    placeholder={field}
                    value={(listingDraft as any)[field]}
                    onChange={(e) => setListingDraft((prev) => ({ ...prev, [field]: e.target.value }))}
                    type={field === 'rentEth' ? 'number' : 'text'}
                    step={field === 'rentEth' ? '0.01' : undefined}
                    required={field === 'rentEth'}
                  />
                  {listingErrors[field as keyof ListingFormErrors] && (
                    <p className="text-xs text-danger">{listingErrors[field as keyof ListingFormErrors]}</p>
                  )}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {(['beds', 'baths', 'sqft'] as const).map((field) => (
                <label key={field} className="text-xs uppercase text-muted">
                  {field}
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-outline px-2 py-1 text-sm"
                    value={(listingDraft as any)[field]}
                    onChange={(e) => setListingDraft((prev) => ({ ...prev, [field]: Number(e.target.value) }))}
                  />
                </label>
              ))}
            </div>
            {listingErrors.general && <p className="text-sm text-danger">{listingErrors.general}</p>}
            {listingSaveMessage && <p className="text-sm text-success">{listingSaveMessage}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-xl border border-outline px-4 py-2 text-sm text-muted"
                onClick={() => {
                  setListingFormVisible(false);
                  setEditingListing(null);
                  setListingErrors({});
                  setListingSaveMessage(null);
                }}
              >
                Cancel
              </button>
              <AnimatedButton type="submit" disabled={saveListingMutation.isPending}>
                {saveListingMutation.isPending ? 'Saving…' : 'Save listing'}
              </AnimatedButton>
            </div>
          </form>
        </div>
      )}

      {applyListing && (
        <ApplicationWizard
          listing={applyListing}
          submitting={applyMutation.isPending}
          onClose={() => {
            if (!applyMutation.isPending) {
              setApplyListing(null);
            }
          }}
          onSubmit={(payload) => {
            applyMutation.mutate({
              listingId: applyListing.id,
              details: payload.details,
              documents: payload.documents,
              message: payload.message
            });
          }}
        />
      )}
    </motion.div>
  );
}
