import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { approveApplication, fetchApplications, fetchLeases, rejectApplication, signLease } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { ensureNetwork } from '../lib/eth';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
export default function Applications() {
    const role = useAppStore((state) => state.role);
    const wallet = useAppStore((state) => state.wallet);
    const environment = useAppStore((state) => state.environment);
    const pushNotice = useAppStore((state) => state.pushNotice);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { data: applications = [], isLoading } = useQuery({
        queryKey: ['applications'],
        queryFn: fetchApplications
    });
    const { data: tenantLeases = [] } = useQuery({
        queryKey: ['leases'],
        queryFn: fetchLeases,
        enabled: role === 'tenant'
    });
    const findLeaseForApplication = (app) => {
        if (role !== 'tenant' || !app.listing?.id)
            return undefined;
        return tenantLeases.find((lease) => lease.listingId === app.listing.id ||
            lease.listing?.id === app.listing.id ||
            String(lease.chainLeaseId) === String(app.leaseId));
    };
    const approveMutation = useMutation({
        mutationFn: (id) => approveApplication(id),
        onSuccess: () => {
            pushNotice('success', 'Application approved');
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['leases'] });
        },
        onError: (err) => pushNotice('error', err.response?.data?.message || 'Unable to approve application')
    });
    const rejectMutation = useMutation({
        mutationFn: (id) => rejectApplication(id),
        onSuccess: () => {
            pushNotice('success', 'Application rejected');
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
        onError: (err) => pushNotice('error', err.response?.data?.message || 'Unable to reject application')
    });
    const signMutation = useMutation({
        mutationFn: async (leaseId) => {
            if (!wallet)
                throw new Error('Wallet not connected');
            await ensureNetwork(environment);
            const provider = window.ethereum;
            const message = `RentalApp Lease ${leaseId}`;
            const signature = await provider.request({
                method: 'personal_sign',
                params: [message, wallet]
            });
            await signLease(leaseId, signature);
        },
        onSuccess: () => {
            pushNotice('success', 'Lease signed');
            queryClient.invalidateQueries({ queryKey: ['leases'] });
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
        onError: (err) => pushNotice('error', err.response?.data?.message || err.message || 'Unable to sign lease')
    });
    const renderOwnerActions = (app) => {
        if (app.status !== 'submitted') {
            return _jsx("span", { className: "text-xs text-muted", children: "Processed" });
        }
        return (_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "rounded-xl border border-outline px-3 py-1.5 text-sm text-success hover:bg-success/10", onClick: () => approveMutation.mutate(app.id), disabled: approveMutation.isPending, children: approveMutation.isPending ? 'Approving…' : 'Approve' }), _jsx("button", { className: "rounded-xl border border-outline px-3 py-1.5 text-sm text-danger hover:bg-danger/10", onClick: () => rejectMutation.mutate(app.id), disabled: rejectMutation.isPending, children: rejectMutation.isPending ? 'Rejecting…' : 'Reject' })] }));
    };
    const renderTenantActions = (app) => {
        if (app.status === 'rejected') {
            return _jsx("span", { className: "text-xs text-red-500", children: "Rejected" });
        }
        if (app.status !== 'approved') {
            return _jsx("span", { className: "text-xs text-muted", children: "Waiting on owner" });
        }
        const lease = findLeaseForApplication(app);
        if (!lease) {
            return _jsx("span", { className: "text-xs text-muted", children: "Provisioning lease\u2026" });
        }
        return (_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [!lease.signedAt && (_jsx("button", { className: "text-sm font-medium text-brand hover:text-brand-hover", onClick: () => signMutation.mutate(lease.id), disabled: signMutation.isPending, children: signMutation.isPending ? 'Signing…' : 'Sign lease' })), _jsx("button", { className: "text-sm text-muted underline-offset-4 hover:underline", type: "button", onClick: () => navigate(`/payments/${lease.id}`), children: "Payments" })] }));
    };
    const title = role === 'owner' ? 'Lease applications' : 'My applications';
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: title, description: role === 'owner'
                    ? 'Review rental interest and convert approved applicants into on-chain leases.'
                    : 'Track each application, sign leases, and jump into payments when approved.' }), isLoading ? (_jsx("p", { className: "text-muted", children: "Loading applications\u2026" })) : (_jsx(SectionCard, { children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-muted", children: [_jsx("th", { className: "p-3 font-semibold text-foreground/80", children: "Property" }), _jsx("th", { className: "p-3 font-semibold text-foreground/80", children: "City" }), role === 'owner' && _jsx("th", { className: "p-3 font-semibold text-foreground/80", children: "Applicant" }), _jsx("th", { className: "p-3 font-semibold text-foreground/80", children: "Status" }), _jsx("th", { className: "p-3 font-semibold text-foreground/80", children: "Actions" })] }) }), _jsxs("tbody", { children: [applications.map((app) => {
                                    const lease = role === 'tenant' ? findLeaseForApplication(app) : undefined;
                                    return (_jsxs("tr", { className: "border-t border-outline/40", children: [_jsx("td", { className: "p-3 font-medium text-foreground", children: app.listing?.title ?? '—' }), _jsx("td", { className: "p-3 text-muted", children: app.listing?.city ?? '—' }), role === 'owner' && _jsx("td", { className: "p-3 text-muted", children: app.applicantEmail }), _jsx("td", { className: "p-3", children: _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "capitalize text-foreground", children: app.status }), lease?.status && (_jsxs("span", { className: "text-xs text-muted", children: ["Lease status: ", lease.status, lease.signedAt ? ' (signed)' : ''] }))] }) }), _jsx("td", { className: "p-3", children: role === 'owner' ? renderOwnerActions(app) : renderTenantActions(app) })] }, app.id));
                                }), !applications.length && (_jsx("tr", { children: _jsx("td", { className: "p-4 text-center text-muted", colSpan: role === 'owner' ? 5 : 4, children: "No applications yet." }) }))] })] }) }))] }));
}
