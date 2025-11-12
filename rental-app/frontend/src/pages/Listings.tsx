import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchListings, refreshListings, submitApplication } from '../lib/api';
import { useAppStore } from '../store/useAppStore';

export default function Listings() {
  const role = useAppStore((state) => state.user?.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings', city],
    queryFn: () => fetchListings(city ? { city } : undefined)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Browse properties</h1>
          <p className="text-sm text-slate-500">Search active listings and request a lease like you would in RentCafe.</p>
        </div>
        {role === 'owner' && (
          <button
            className="px-4 py-2 rounded bg-slate-900 text-white"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? 'Refreshing…' : 'Sync feed'}
          </button>
        )}
      </div>
      <div className="flex gap-3">
        <input
          className="border rounded px-3 py-2 w-full md:w-64"
          placeholder="Filter by city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>
      {isLoading ? (
        <p>Loading listings…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((listing: any) => (
            <article key={listing.id} className="border rounded-lg bg-white overflow-hidden flex flex-col">
              {listing.photoUrl ? (
                <img src={listing.photoUrl} alt={listing.title} className="h-40 object-cover" />
              ) : (
                <div className="h-40 bg-slate-100" />
              )}
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{listing.title}</h2>
                  <span className="text-sm font-medium">{Number(listing.rentEth).toFixed(2)} ETH</span>
                </div>
                <p className="text-sm text-slate-500">{listing.address}, {listing.city}, {listing.state}</p>
                <p className="text-sm text-slate-500">{listing.beds} bd • {listing.baths ?? 1} ba • {listing.sqft || 0} sqft</p>
                <p className="text-sm text-slate-500 h-10 overflow-hidden">{listing.amenities}</p>
                <div className="mt-auto flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded ${listing.available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {listing.available ? 'Available' : 'Leased'}
                  </span>
                  {role === 'tenant' && listing.available && (
                    <button
                      className="text-sm font-medium text-slate-900"
                      onClick={() => setSelectedListing(listing)}
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
          {!listings.length && <p className="text-sm text-slate-500">No listings match this filter.</p>}
        </div>
      )}

      {selectedListing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyMutation.mutate();
            }}
            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md space-y-4"
          >
            <h2 className="text-xl font-semibold">Apply for {selectedListing.title}</h2>
            <textarea
              className="border rounded w-full px-3 py-2"
              placeholder="Tell the owner about move-in timing, roommates, etc."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <input
              className="border rounded w-full px-3 py-2"
              placeholder="Phone number (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="flex justify-between">
              <button type="button" className="px-4 py-2 rounded border" onClick={() => setSelectedListing(null)}>
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded bg-slate-900 text-white" disabled={applyMutation.isPending}>
                {applyMutation.isPending ? 'Sending…' : 'Submit application'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
