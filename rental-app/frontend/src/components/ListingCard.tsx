import { ReactNode } from 'react';

type ListingCardProps = {
  listing: any;
  actions?: ReactNode;
  footer?: ReactNode;
};

export function ListingCard({ listing, actions, footer }: ListingCardProps) {
  const rent = Number(listing.rentEth ?? 0).toFixed(2);
  const beds = listing.beds ?? listing.bedrooms ?? 0;
  const baths = listing.baths ?? listing.bathrooms ?? 0;
  const sqft = listing.sqft ?? 0;
  return (
    <article className="overflow-hidden rounded-3xl border border-outline bg-surface-1 shadow-soft">
      <div className="relative h-48 w-full overflow-hidden">
        {listing.photoUrl ? (
          <img src={listing.photoUrl} alt={listing.title} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-surface-2 to-brand/20" />
        )}
        <span
          className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${
            listing.available ? 'bg-white text-success' : 'bg-danger/10 text-danger'
          }`}
        >
          {listing.available ? 'Available' : 'Leased'}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted">{listing.property?.name ?? 'Listing'}</p>
            <h3 className="text-lg font-semibold text-foreground">{listing.title}</h3>
            <p className="text-sm text-muted">
              {listing.address1}, {listing.city}, {listing.state} {listing.postalCode ?? ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Rent</p>
            <p className="text-xl font-semibold text-foreground">ETH {rent} /mo</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted">
          <span>{beds} Beds</span>
          <span>{baths} Baths</span>
          <span>{sqft} sqft</span>
        </div>
        {actions && <div className="flex flex-wrap items-center justify-between gap-2">{actions}</div>}
        {footer}
      </div>
    </article>
  );
}
