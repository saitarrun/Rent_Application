import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { fetchListings, submitApplication } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';
export default function Browse() {
    const role = useAppStore((state) => state.role);
    const pushNotice = useAppStore((state) => state.pushNotice);
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submittingId, setSubmittingId] = useState(null);
    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);
        fetchListings()
            .then((data) => {
            if (!mounted)
                return;
            setListings(Array.isArray(data) ? data : data?.listings ?? []);
        })
            .catch((err) => {
            if (!mounted)
                return;
            setError(err?.response?.data?.message || err?.message || 'Unable to load listings');
        })
            .finally(() => mounted && setLoading(false));
        return () => {
            mounted = false;
        };
    }, []);
    const handleApply = async (listingId) => {
        if (role !== 'tenant') {
            pushNotice('info', 'Only tenants can submit applications');
            return;
        }
        setSubmittingId(listingId);
        try {
            await submitApplication({ listingId });
            pushNotice('success', 'Application submitted');
        }
        catch (err) {
            pushNotice('error', err?.response?.data?.message || 'Unable to submit application');
        }
        finally {
            setSubmittingId(null);
        }
    };
    return (_jsxs("section", { className: "space-y-6", children: [_jsx(PageHeader, { title: "Available properties", description: "Active inventory published by owners in your workspace." }), loading && _jsx("p", { className: "text-muted", children: "Loading listings\u2026" }), error && _jsx("p", { className: "text-danger text-sm", children: error }), !loading && !error && listings.length === 0 && _jsx("p", { className: "text-sm text-muted", children: "No listings available." }), _jsx(SectionCard, { bleed: true, children: _jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: listings.map((listing) => (_jsxs("article", { className: "flex flex-col overflow-hidden rounded-2xl border border-outline bg-surface-2 shadow-soft", children: [listing.photoUrl ? (_jsx("img", { src: listing.photoUrl, alt: listing.title, className: "h-48 w-full object-cover" })) : (_jsx("div", { className: "h-48 w-full bg-surface-3" })), _jsxs("div", { className: "flex flex-1 flex-col gap-2 p-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold text-foreground", children: listing.title }), _jsxs("span", { className: "text-sm font-medium text-foreground", children: [Number(listing.rentEth).toFixed(2), " ETH"] })] }), _jsxs("p", { className: "text-sm text-muted", children: [listing.address1, ", ", listing.city, ", ", listing.state, " ", listing.postalCode || ''] }), _jsx("span", { className: `w-fit rounded-full px-2 py-1 text-xs ${listing.available ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted'}`, children: listing.available ? 'Available' : 'Unavailable' }), _jsx(AnimatedButton, { className: "mt-auto w-full justify-center text-sm", onClick: () => handleApply(listing.id), disabled: !listing.available || submittingId === listing.id, children: submittingId === listing.id ? 'Submitting…' : 'Apply' })] })] }, listing.id))) }) })] }));
}
