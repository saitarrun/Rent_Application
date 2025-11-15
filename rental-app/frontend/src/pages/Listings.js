import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createListing, deleteListing, fetchListings, fetchProperties, refreshListings, submitApplication, updateListing } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { AnimatedButton } from '../components/AnimatedButton';
const emptyDraft = {
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
    const [selectedListing, setSelectedListing] = useState(null);
    const [formVisible, setFormVisible] = useState(false);
    const [editingListing, setEditingListing] = useState(null);
    const [formDraft, setFormDraft] = useState(emptyDraft);
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
        onError: (err) => pushNotice('error', err.response?.data?.message || 'Unable to save listing')
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => deleteListing(id),
        onSuccess: () => {
            pushNotice('success', 'Listing removed');
            queryClient.invalidateQueries({ queryKey: ['listings'] });
        },
        onError: (err) => pushNotice('error', err.response?.data?.message || 'Unable to delete listing')
    });
    const openListingForm = (listing) => {
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
        }
        else {
            setEditingListing(null);
            setFormDraft(emptyDraft);
        }
        setFormVisible(true);
    };
    const ownerView = role === 'owner';
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: ownerView ? 'My listings' : 'Browse properties', description: ownerView
                    ? 'Publish, edit, and sync the properties in your portfolio.'
                    : 'Search available homes and apply with a single click.', actions: ownerView && (_jsxs(_Fragment, { children: [_jsx("button", { className: "rounded-2xl border border-outline px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-1 transition", onClick: () => openListingForm(), type: "button", children: "Add listing" }), _jsx(AnimatedButton, { onClick: () => refreshMutation.mutate(), disabled: refreshMutation.isPending, className: "text-sm", children: refreshMutation.isPending ? 'Refreshing…' : 'Sync feed' })] })) }), _jsx(SectionCard, { children: _jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-center md:justify-between", children: [_jsx("input", { className: "w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 md:w-64", placeholder: "Filter by city", value: city, onChange: (e) => setCity(e.target.value) }), role === 'tenant' && (_jsxs("p", { className: "text-sm text-muted", children: ["Showing ", listings.length, " result", listings.length === 1 ? '' : 's', " filtered by", ' ', city ? `"${city}"` : 'all cities', "."] }))] }) }), isLoading ? (_jsx("p", { className: "text-sm text-muted", children: "Loading listings\u2026" })) : (_jsx(SectionCard, { bleed: true, children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [listings.map((listing) => (_jsxs("article", { className: "border border-outline rounded-2xl bg-surface-2 overflow-hidden flex flex-col shadow-soft", children: [listing.photoUrl ? (_jsx("img", { src: listing.photoUrl, alt: listing.title, className: "h-40 object-cover" })) : (_jsx("div", { className: "h-40 bg-surface-3" })), _jsxs("div", { className: "p-4 flex-1 flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold text-foreground", children: listing.title }), _jsxs("span", { className: "text-sm font-medium text-muted", children: [Number(listing.rentEth ?? 0).toFixed(2), " ETH"] })] }), _jsxs("p", { className: "text-sm text-muted", children: [listing.address1, ", ", listing.city, ", ", listing.state] }), _jsxs("p", { className: "text-sm text-muted", children: [listing.beds, " bd \u2022 ", listing.baths ?? 1, " ba \u2022 ", listing.sqft || 0, " sqft"] }), _jsx("p", { className: "text-sm text-muted h-10 overflow-hidden", children: listing.amenities }), _jsxs("div", { className: "mt-auto flex items-center justify-between", children: [_jsx("span", { className: `text-xs px-2 py-1 rounded ${listing.available ? 'bg-success/20 text-success' : 'bg-muted/10 text-muted'}`, children: listing.available ? 'Available' : 'Leased' }), role === 'tenant' && listing.available && (_jsx("button", { className: "text-sm font-semibold text-brand hover:text-brand-hover transition", onClick: () => setSelectedListing(listing), children: "Apply" })), role === 'owner' && listing.ownerId === userId && (_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "text-sm text-brand hover:text-brand-hover", onClick: () => openListingForm(listing), type: "button", children: "Edit" }), _jsx("button", { className: "text-sm text-danger hover:text-danger/80", onClick: () => {
                                                                if (window.confirm('Remove listing?'))
                                                                    deleteMutation.mutate(listing.id);
                                                            }, type: "button", children: "Delete" })] }))] })] })] }, listing.id))), !listings.length && _jsx("p", { className: "text-sm text-muted", children: "No listings match this filter." })] }) })), selectedListing && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md", children: _jsxs("form", { onSubmit: (e) => {
                        e.preventDefault();
                        applyMutation.mutate();
                    }, className: "w-full max-w-md space-y-4 rounded-2xl border border-outline bg-surface-2 p-6 shadow-ring", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-muted", children: "Apply for" }), _jsx("h2", { className: "text-xl font-semibold text-foreground", children: selectedListing.title })] }), _jsx("textarea", { className: "min-h-[120px] w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", placeholder: "Tell the owner about move-in timing, roommates, etc.", value: message, onChange: (e) => setMessage(e.target.value) }), _jsx("input", { className: "w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", placeholder: "Phone number (optional)", value: phone, onChange: (e) => setPhone(e.target.value) }), _jsxs("div", { className: "flex justify-between gap-3", children: [_jsx("button", { type: "button", className: "rounded-2xl border border-outline px-4 py-2 text-sm text-muted hover:bg-surface-1", onClick: () => setSelectedListing(null), children: "Cancel" }), _jsx(AnimatedButton, { type: "submit", disabled: applyMutation.isPending, className: "flex-1 justify-center", children: applyMutation.isPending ? 'Sending…' : 'Submit application' })] })] }) })), formVisible && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md", children: _jsxs("form", { onSubmit: (e) => {
                        e.preventDefault();
                        saveListingMutation.mutate();
                    }, className: "w-full max-w-2xl space-y-3 rounded-2xl border border-outline bg-surface-2 p-6 shadow-ring", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-semibold text-foreground", children: editingListing ? 'Edit listing' : 'New listing' }), _jsx("span", { className: "text-xs uppercase text-muted", children: editingListing ? 'Update' : 'Create' })] }), ['title', 'address1', 'city', 'state', 'postalCode', 'rentEth', 'amenities', 'photoUrl', 'externalUrl'].map((field) => (_jsx("input", { className: "w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", placeholder: field, value: formDraft[field], onChange: (e) => setFormDraft((prev) => ({ ...prev, [field]: e.target.value })), required: ['title', 'address1', 'city', 'state', 'rentEth'].includes(field) }, field))), _jsx("div", { className: "grid grid-cols-3 gap-2", children: ['beds', 'baths', 'sqft'].map((field) => (_jsxs("div", { children: [_jsx("label", { className: "text-xs uppercase text-muted", children: field }), _jsx("input", { type: "number", className: "mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-2 py-1 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40", value: formDraft[field], onChange: (e) => setFormDraft((prev) => ({ ...prev, [field]: Number(e.target.value) })) })] }, field))) }), properties.length > 0 && (_jsxs("label", { className: "block text-sm text-muted", children: ["Property (optional)", _jsxs("select", { className: "mt-1 w-full rounded-2xl border border-outline bg-surface-1 px-3 py-2 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50", value: formDraft.propertyId || '', onChange: (e) => setFormDraft((prev) => ({ ...prev, propertyId: e.target.value })), children: [_jsx("option", { value: "", children: "Unassigned" }), properties.map((property) => (_jsx("option", { value: property.id, children: property.name }, property.id)))] })] })), _jsxs("div", { className: "flex justify-between gap-3 pt-2", children: [_jsx("button", { type: "button", className: "rounded-2xl border border-outline px-4 py-2 text-sm text-muted hover:bg-surface-1", onClick: () => setFormVisible(false), children: "Cancel" }), _jsx(AnimatedButton, { type: "submit", disabled: saveListingMutation.isPending, className: "flex-1 justify-center", children: saveListingMutation.isPending ? 'Saving…' : 'Save' })] })] }) }))] }));
}
