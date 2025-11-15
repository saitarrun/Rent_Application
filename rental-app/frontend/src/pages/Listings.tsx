import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createListing,
  deleteListing,
  fetchListings,
  fetchProperties,
  refreshListings,
  submitApplication,
  updateListing
} from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';

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
};

const emptyDraft: ListingDraft = {
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
  propertyId: ''
};

export default function Listings() {
  const role = useAppStore((state) => state.role);
  const userId = useAppStore((state) => state.user?.id);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [formDraft, setFormDraft] = useState<ListingDraft>(emptyDraft);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings', city],
    queryFn: () => fetchListings(city ? { city } : undefined)
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
    enabled: role === 'owner'
  });

  const refreshMutation = useMutation({
    mutationFn: refreshListings,
    onSuccess: () => {
      pushNotice('success', 'Listing feed refreshed');
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (err: any) => pushNotice('error', err.message || 'Unable to refresh listings')
  });

  const applyMutation = useMutation({
    mutationFn: () => submitApplication({ listingId: selectedListing.id, message, phone }),
    onSuccess: () => {
      pushNotice('success', 'Application submitted');
      setSelectedListing(null);
      setMessage('');
      setPhone('');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err: any) => pushNotice('error', err.response?.data?.message || 'Unable to submit application')
  });

  const saveListingMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...formDraft,
        rentEth: Number(formDraft.rentEth || 0),
        beds: Number(formDraft.beds),
        baths: Number(formDraft.baths),
        sqft: Number(formDraft.sqft) || 0
      };
      return editingListing ? updateListing(editingListing.id, payload) : createListing(payload);
    },
    onSuccess: () => {
      pushNotice('success', editingListing ? 'Listing updated' : 'Listing created');
      setFormVisible(false);
      setEditingListing(null);
      setFormDraft(emptyDraft);
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (err: any) => pushNotice('error', err.response?.data?.message || 'Unable to save listing')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: () => {
      pushNotice('success', 'Listing removed');
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (err: any) => pushNotice('error', err.response?.data?.message || 'Unable to delete listing')
  });

  const openListingForm = (listing?: any) => {
    if (listing) {
      setEditingListing(listing);
      setFormDraft({
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
        propertyId: listing.propertyId || ''
      });
    } else {
      setEditingListing(null);
      setFormDraft(emptyDraft);
    }
    setFormVisible(true);
  };

  const ownerView = role === 'owner';

  return (
    <div className="space-y-6">
      <PageHeader
        title={ownerView ? 'My listings' : 'Browse properties'}
        description={
          ownerView
            ? 'Publish, edit, and sync the properties in your portfolio.'
            : 'Search available homes and apply with a single click.'
        }
        actions={
          ownerView && (
            <>
              <button
                className="rounded-2xl border border-outline px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-1 transition"
                onClick={() => openListingForm()}
                type="button"
              >
                Add listing
              </button>
              <AnimatedButton onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending} className="text-sm">
                {refreshMutation.isPending ? 'Refreshing…' : 'Sync feed'}
              </AnimatedButton>
            </>
          )
        }
      />
      <SectionCard>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            className="w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 md:w-64"
            placeholder="Filter by city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          {role === 'tenant' && (
            <p className="text-sm text-muted">
              Showing {listings.length} result{listings.length === 1 ? '' : 's'} filtered by{' '}
              {city ? `"${city}"` : 'all cities'}.
            </p>
          )}
        </div>
      </SectionCard>
      {isLoading ? (
        <p className="text-sm text-muted">Loading listings…</p>
      ) : (
        <SectionCard bleed>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map((listing: any) => (
              <article key={listing.id} className="border border-outline rounded-2xl bg-surface-2 overflow-hidden flex flex-col shadow-soft">
                {listing.photoUrl ? (
                  <img src={listing.photoUrl} alt={listing.title} className="h-40 object-cover" />
                ) : (
                  <div className="h-40 bg-surface-3" />
                )}
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">{listing.title}</h2>
                    <span className="text-sm font-medium text-muted">{Number(listing.rentEth ?? 0).toFixed(2)} ETH</span>
                  </div>
                  <p className="text-sm text-muted">
                    {listing.address1}, {listing.city}, {listing.state}
                  </p>
                  <p className="text-sm text-muted">
                    {listing.beds} bd • {listing.baths ?? 1} ba • {listing.sqft || 0} sqft
                  </p>
                  <p className="text-sm text-muted h-10 overflow-hidden">{listing.amenities}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        listing.available ? 'bg-success/20 text-success' : 'bg-muted/10 text-muted'
                      }`}
                    >
                      {listing.available ? 'Available' : 'Leased'}
                    </span>
                    {role === 'tenant' && listing.available && (
                      <button
                        className="text-sm font-semibold text-brand hover:text-brand-hover transition"
                        onClick={() => setSelectedListing(listing)}
                      >
                        Apply
                      </button>
                    )}
                    {role === 'owner' && listing.ownerId === userId && (
                      <div className="flex gap-2">
                        <button
                          className="text-sm text-brand hover:text-brand-hover"
                          onClick={() => openListingForm(listing)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="text-sm text-danger hover:text-danger/80"
                          onClick={() => {
                            if (window.confirm('Remove listing?')) deleteMutation.mutate(listing.id);
                          }}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!listings.length && <p className="text-sm text-muted">No listings match this filter.</p>}
          </div>
        </SectionCard>
      )}

      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyMutation.mutate();
            }}
            className="w-full max-w-md space-y-4 rounded-2xl border border-outline bg-surface-2 p-6 shadow-ring"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Apply for</p>
              <h2 className="text-xl font-semibold text-foreground">{selectedListing.title}</h2>
            </div>
            <textarea
              className="min-h-[120px] w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              placeholder="Tell the owner about move-in timing, roommates, etc."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <input
              className="w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              placeholder="Phone number (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="flex justify-between gap-3">
              <button
                type="button"
                className="rounded-2xl border border-outline px-4 py-2 text-sm text-muted hover:bg-surface-1"
                onClick={() => setSelectedListing(null)}
              >
                Cancel
              </button>
              <AnimatedButton type="submit" disabled={applyMutation.isPending} className="flex-1 justify-center">
                {applyMutation.isPending ? 'Sending…' : 'Submit application'}
              </AnimatedButton>
            </div>
          </form>
        </div>
      )}

      {formVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveListingMutation.mutate();
            }}
            className="w-full max-w-2xl space-y-3 rounded-2xl border border-outline bg-surface-2 p-6 shadow-ring"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">{editingListing ? 'Edit listing' : 'New listing'}</h2>
              <span className="text-xs uppercase text-muted">{editingListing ? 'Update' : 'Create'}</span>
            </div>
            {['title', 'address1', 'city', 'state', 'postalCode', 'rentEth', 'amenities', 'photoUrl', 'externalUrl'].map(
              (field) => (
                <input
                  key={field}
                  className="w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  placeholder={field}
                  value={(formDraft as any)[field]}
                  onChange={(e) => setFormDraft((prev) => ({ ...prev, [field]: e.target.value }))}
                  required={['title', 'address1', 'city', 'state', 'rentEth'].includes(field)}
                />
              )
            )}
            <div className="grid grid-cols-3 gap-2">
              {(['beds', 'baths', 'sqft'] as const).map((field) => (
                <div key={field}>
                  <label className="text-xs uppercase text-muted">{field}</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-2 py-1 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    value={(formDraft as any)[field]}
                    onChange={(e) => setFormDraft((prev) => ({ ...prev, [field]: Number(e.target.value) }))}
                  />
                </div>
              ))}
            </div>
            {properties.length > 0 && (
              <label className="block text-sm text-muted">
                Property (optional)
                <select
                  className="mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  value={formDraft.propertyId || ''}
                  onChange={(e) => setFormDraft((prev) => ({ ...prev, propertyId: e.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {properties.map((property: any) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex justify-between gap-3 pt-2">
              <button
                type="button"
                className="rounded-2xl border border-outline px-4 py-2 text-sm text-muted hover:bg-surface-1"
                onClick={() => setFormVisible(false)}
              >
                Cancel
              </button>
              <AnimatedButton type="submit" disabled={saveListingMutation.isPending} className="flex-1 justify-center">
                {saveListingMutation.isPending ? 'Saving…' : 'Save'}
              </AnimatedButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
