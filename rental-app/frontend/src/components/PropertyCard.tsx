import { forwardRef, memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bath, Bed, Heart, MapPin, Square } from 'lucide-react';
import type { Property } from '../data/properties';

type PropertyCardProps = {
  property: Property;
  isFavorite: boolean;
  onFavoriteToggle: (id: number) => void;
  onViewOnMap: (id: number) => void;
  isHighlighted?: boolean;
  showApplyButton?: boolean;
  onApply?: (property: Property) => void;
  isOwnerView?: boolean;
  isPublished?: boolean;
  onPublishListing?: () => void;
  onUnpublishListing?: () => void;
  publishLoading?: boolean;
  unpublishLoading?: boolean;
};

export const PropertyCard = memo(
  forwardRef<HTMLDivElement, PropertyCardProps>(function PropertyCard(
    {
      property,
      isFavorite,
      onFavoriteToggle,
      onViewOnMap,
      isHighlighted,
      showApplyButton,
      onApply,
      isOwnerView,
      isPublished = true,
      onPublishListing,
      onUnpublishListing,
      publishLoading,
      unpublishLoading
    },
    ref
  ) {
    const fallbackImage =
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80';
    const [imageSrc, setImageSrc] = useState(property.imageUrl);
    const usdEstimate = `$${Math.round(property.price * 3200).toLocaleString()}`;

    useEffect(() => {
      setImageSrc(property.imageUrl);
    }, [property.imageUrl]);

    const published = isPublished;
    const status = published
      ? property.available
        ? { label: 'Available', className: 'bg-green-50 text-success' }
        : { label: 'Leased', className: 'bg-amber-50 text-warning' }
      : { label: 'Not published', className: 'bg-amber-100 text-warning' };

    const disableApply = showApplyButton && !published;

    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border bg-white shadow-sm transition-all focus-within:ring-2 focus-within:ring-brand/50 ${
          isHighlighted ? 'ring-2 ring-brand/60' : 'border-outline/40'
        }`}
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.99 }}
      >
      <div className="relative h-48 overflow-hidden rounded-2xl bg-surface-2">
        <img
          src={imageSrc}
          alt={`${property.title} in ${property.city}`}
          className="h-full w-full object-cover transition duration-300 hover:scale-105"
          loading="lazy"
          onError={() => {
            if (imageSrc !== fallbackImage) {
              setImageSrc(fallbackImage);
            }
          }}
        />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-muted">
          {property.type}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{property.city}, {property.state}</p>
            <h3 className="text-lg font-semibold text-slate-900">{property.title}</h3>
            <p className="text-sm text-muted">{property.address}</p>
          </div>
          <button
            type="button"
            onClick={() => onFavoriteToggle(property.id)}
            aria-pressed={isFavorite}
            className={`rounded-full border p-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              isFavorite ? 'border-brand bg-brand/10 text-brand' : 'border-outline text-muted hover:text-brand'
            }`}
          >
            <Heart className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
            <span className="sr-only">Toggle favorite</span>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-semibold text-slate-900">
              ETH {property.price.toFixed(2)}
              <span className="text-sm font-normal text-muted"> /mo</span>
            </p>
            <p className="text-xs text-muted">{usdEstimate} /mo</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Bed className="h-4 w-4" /> {property.beds} Beds
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath className="h-4 w-4" /> {property.baths} Baths
          </span>
          <span className="inline-flex items-center gap-1">
            <Square className="h-4 w-4" /> {property.area} sqft
          </span>
        </div>
        {!published && (
          <p className="text-xs font-medium text-warning">
            {isOwnerView ? 'Hidden from tenants. Publish to make it available.' : 'Not yet published. Check back soon.'}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onViewOnMap(property.id)}
            aria-label={`View ${property.title} on the map`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            <MapPin className="h-4 w-4" />
            View on Map
          </button>
          {showApplyButton ? (
            <button
              type="button"
              onClick={() => !disableApply && onApply?.(property)}
              disabled={disableApply}
              className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${
                disableApply ? 'border-dashed text-muted cursor-not-allowed' : 'border-outline text-brand hover:bg-slate-50'
              }`}
            >
              {disableApply ? 'Coming soon' : 'Apply now'}
            </button>
          ) : isOwnerView ? (
            published ? (
              <button
                type="button"
                onClick={() => onUnpublishListing?.()}
                disabled={!onUnpublishListing || unpublishLoading}
                className="flex-1 rounded-xl border border-outline px-4 py-2 text-sm font-semibold text-danger transition hover:bg-slate-50 disabled:opacity-60"
              >
                {unpublishLoading ? 'Unpublishing…' : 'Unpublish listing'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onPublishListing?.()}
                disabled={!onPublishListing || publishLoading}
                className="flex-1 rounded-xl border border-outline px-4 py-2 text-sm font-semibold text-brand transition hover:bg-slate-50 disabled:opacity-60"
              >
                {publishLoading ? 'Publishing…' : 'Publish listing'}
              </button>
            )
          ) : (
            <button
              type="button"
              className="flex-1 rounded-xl border border-outline px-4 py-2 text-sm font-medium text-muted transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              aria-label={`Rating ${property.rating} stars`}
            >
              ⭐ {property.rating.toFixed(1)}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
})
);
