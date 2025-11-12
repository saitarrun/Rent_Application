import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const [selectedListing, setSelectedListing] = useState(null);
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
        onError: (err) => pushNotice('error', err.message || 'Unable to refresh listings')
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
        onError: (err) => pushNotice('error', err.response?.data?.message || 'Unable to submit application')
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Browse properties" }), _jsx("p", { className: "text-sm text-slate-500", children: "Search active listings and request a lease like you would in RentCafe." })] }), role === 'owner' && (_jsx("button", { className: "px-4 py-2 rounded bg-slate-900 text-white", onClick: () => refreshMutation.mutate(), disabled: refreshMutation.isPending, children: refreshMutation.isPending ? 'Refreshing…' : 'Sync feed' }))] }), _jsx("div", { className: "flex gap-3", children: _jsx("input", { className: "border rounded px-3 py-2 w-full md:w-64", placeholder: "Filter by city", value: city, onChange: (e) => setCity(e.target.value) }) }), isLoading ? (_jsx("p", { children: "Loading listings\u2026" })) : (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [listings.map((listing) => (_jsxs("article", { className: "border rounded-lg bg-white overflow-hidden flex flex-col", children: [listing.photoUrl ? (_jsx("img", { src: listing.photoUrl, alt: listing.title, className: "h-40 object-cover" })) : (_jsx("div", { className: "h-40 bg-slate-100" })), _jsxs("div", { className: "p-4 flex-1 flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold", children: listing.title }), _jsxs("span", { className: "text-sm font-medium", children: [Number(listing.rentEth).toFixed(2), " ETH"] })] }), _jsxs("p", { className: "text-sm text-slate-500", children: [listing.address, ", ", listing.city, ", ", listing.state] }), _jsxs("p", { className: "text-sm text-slate-500", children: [listing.beds, " bd \u2022 ", listing.baths ?? 1, " ba \u2022 ", listing.sqft || 0, " sqft"] }), _jsx("p", { className: "text-sm text-slate-500 h-10 overflow-hidden", children: listing.amenities }), _jsxs("div", { className: "mt-auto flex items-center justify-between", children: [_jsx("span", { className: `text-xs px-2 py-1 rounded ${listing.available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`, children: listing.available ? 'Available' : 'Leased' }), role === 'tenant' && listing.available && (_jsx("button", { className: "text-sm font-medium text-slate-900", onClick: () => setSelectedListing(listing), children: "Apply" }))] })] })] }, listing.id))), !listings.length && _jsx("p", { className: "text-sm text-slate-500", children: "No listings match this filter." })] })), selectedListing && (_jsx("div", { className: "fixed inset-0 bg-black/30 flex items-center justify-center", children: _jsxs("form", { onSubmit: (e) => {
                        e.preventDefault();
                        applyMutation.mutate();
                    }, className: "bg-white rounded-lg shadow-lg p-6 w-full max-w-md space-y-4", children: [_jsxs("h2", { className: "text-xl font-semibold", children: ["Apply for ", selectedListing.title] }), _jsx("textarea", { className: "border rounded w-full px-3 py-2", placeholder: "Tell the owner about move-in timing, roommates, etc.", value: message, onChange: (e) => setMessage(e.target.value) }), _jsx("input", { className: "border rounded w-full px-3 py-2", placeholder: "Phone number (optional)", value: phone, onChange: (e) => setPhone(e.target.value) }), _jsxs("div", { className: "flex justify-between", children: [_jsx("button", { type: "button", className: "px-4 py-2 rounded border", onClick: () => setSelectedListing(null), children: "Cancel" }), _jsx("button", { type: "submit", className: "px-4 py-2 rounded bg-slate-900 text-white", disabled: applyMutation.isPending, children: applyMutation.isPending ? 'Sending…' : 'Submit application' })] })] }) }))] }));
}
