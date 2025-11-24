import { motion } from 'framer-motion';
import type { Property } from '../data/properties';
import { PropertyCard } from './PropertyCard';

type PropertyGridProps = {
  properties: Property[];
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  onViewOnMap: (id: number) => void;
  highlightedId?: number | null;
  registerCardRef?: (id: number, node: HTMLDivElement | null) => void;
  showApplyButton?: boolean;
  onApply?: (property: Property) => void;
  isOwnerView?: boolean;
  publishedLookup?: Map<number, boolean>;
  listingLookup?: Map<number, any>;
  onPublishListing?: (property: Property) => void;
  onUnpublishListing?: (property: Property, listingId: string) => void;
  publishingKey?: string;
  unpublishingKey?: string;
};

export function PropertyGrid({
  properties,
  favorites,
  onToggleFavorite,
  onViewOnMap,
  highlightedId,
  registerCardRef,
  showApplyButton,
  onApply,
  isOwnerView,
  publishedLookup,
  listingLookup,
  onPublishListing,
  onUnpublishListing,
  publishingKey,
  unpublishingKey
}: PropertyGridProps) {
  if (!properties.length) {
    return (
      <div className="rounded-2xl border border-dashed border-outline/60 bg-white p-10 text-center text-muted">
        No properties match your filters. Try adjusting the criteria.
      </div>
    );
  }
  return (
    <motion.div
      className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { staggerChildren: 0.05 } }
      }}
    >
      {properties.map((property) => {
        const propertyKey = `template-${property.id}`;
        const listing = listingLookup?.get(property.id);
        return (
          <PropertyCard
            key={property.id}
            ref={(node) => registerCardRef?.(property.id, node)}
            property={property}
            isFavorite={favorites.includes(property.id)}
            onFavoriteToggle={onToggleFavorite}
            onViewOnMap={onViewOnMap}
            isHighlighted={highlightedId === property.id}
            showApplyButton={showApplyButton}
            onApply={onApply}
            isOwnerView={isOwnerView}
            isPublished={publishedLookup?.get(property.id) ?? false}
            onPublishListing={
              onPublishListing && !listing ? () => onPublishListing(property) : undefined
            }
            onUnpublishListing={
              onUnpublishListing && listing ? () => onUnpublishListing(property, listing.id) : undefined
            }
            publishLoading={Boolean(publishingKey && publishingKey === propertyKey)}
            unpublishLoading={Boolean(unpublishingKey && unpublishingKey === propertyKey)}
          />
        );
      })}
    </motion.div>
  );
}
