import { useEffect, useState } from 'react';
import { fetchListings, submitApplication } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';

type Listing = {
  id: string;
  title: string;
  address1: string;
  city: string;
  state: string;
  postalCode?: string;
  rentEth: number;
  photoUrl?: string | null;
  available: boolean;
};

export default function Browse() {
  const role = useAppStore((state) => state.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchListings()
      .then((data) => {
        if (!mounted) return;
        setListings(Array.isArray(data) ? data : data?.listings ?? []);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err?.response?.data?.message || err?.message || 'Unable to load listings');
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleApply = async (listingId: string) => {
    if (role !== 'tenant') {
      pushNotice('info', 'Only tenants can submit applications');
      return;
    }
    setSubmittingId(listingId);
    try {
      await submitApplication({ listingId });
      pushNotice('success', 'Application submitted');
    } catch (err: any) {
      pushNotice('error', err?.response?.data?.message || 'Unable to submit application');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader title="Available properties" description="Active inventory published by owners in your workspace." />
      {loading && <p className="text-muted">Loading listings…</p>}
      {error && <p className="text-danger text-sm">{error}</p>}
      {!loading && !error && listings.length === 0 && <p className="text-sm text-muted">No listings available.</p>}
      <SectionCard bleed>
        <div className="grid gap-4 sm:grid-cols-2">
          {listings.map((listing) => (
            <article key={listing.id} className="flex flex-col overflow-hidden rounded-2xl border border-outline bg-surface-2 shadow-soft">
              {listing.photoUrl ? (
                <img src={listing.photoUrl} alt={listing.title} className="h-48 w-full object-cover" />
              ) : (
                <div className="h-48 w-full bg-surface-3" />
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">{listing.title}</h2>
                  <span className="text-sm font-medium text-foreground">{Number(listing.rentEth).toFixed(2)} ETH</span>
                </div>
                <p className="text-sm text-muted">
                  {listing.address1}, {listing.city}, {listing.state} {listing.postalCode || ''}
                </p>
                <span
                  className={`w-fit rounded-full px-2 py-1 text-xs ${
                    listing.available ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted'
                  }`}
                >
                  {listing.available ? 'Available' : 'Unavailable'}
                </span>
                <AnimatedButton
                  className="mt-auto w-full justify-center text-sm"
                  onClick={() => handleApply(listing.id)}
                  disabled={!listing.available || submittingId === listing.id}
                >
                  {submittingId === listing.id ? 'Submitting…' : 'Apply'}
                </AnimatedButton>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </section>
  );
}
