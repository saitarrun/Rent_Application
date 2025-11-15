import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchLeases, fetchApplications } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
export default function Dashboard() {
    const role = useAppStore((state) => state.role ?? state.user?.role);
    const { data: leases = [] } = useQuery({ queryKey: ['leases'], queryFn: fetchLeases });
    const { data: applications = [] } = useQuery({
        queryKey: ['applications'],
        queryFn: fetchApplications,
        enabled: role === 'owner'
    });
    const ownerView = role === 'owner';
    const upcomingInvoices = leases
        .flatMap((lease) => lease.invoices || [])
        .filter((invoice) => invoice.status !== 'paid')
        .sort((a, b) => (a.dueISO > b.dueISO ? 1 : -1))
        .slice(0, ownerView ? 5 : 3);
    const myRepairs = leases
        .flatMap((lease) => lease.repairs || [])
        .sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1))
        .slice(0, 5);
    const collected = ownerView
        ? leases
            .flatMap((lease) => lease.receipts || [])
            .reduce((sum, receipt) => sum + Number(receipt.paidEth || 0), 0)
        : 0;
    const recentPayments = ownerView
        ? leases
            .flatMap((lease) => (lease.receipts || []).map((receipt) => ({
            id: receipt.id,
            leaseId: lease.id,
            tenant: lease.tenant?.email || lease.tenantId,
            paidEth: receipt.paidEth,
            paidAtISO: receipt.paidAtISO
        })))
            .sort((a, b) => (a.paidAtISO > b.paidAtISO ? -1 : 1))
            .slice(0, 5)
        : [];
    const nextDue = !ownerView ? upcomingInvoices[0] : null;
    const pendingApplications = ownerView ? applications.filter((app) => app.status === 'submitted' || app.status === 'reviewing').length : 0;
    const metrics = ownerView
        ? [
            { label: 'Active leases', value: leases.length },
            { label: 'Outstanding invoices', value: upcomingInvoices.length },
            { label: 'Collected (ETH)', value: collected.toFixed(2) },
            { label: 'Open applications', value: pendingApplications }
        ]
        : [
            { label: 'Active leases', value: leases.length },
            { label: 'Outstanding invoices', value: upcomingInvoices.length },
            {
                label: 'Next due date',
                value: nextDue ? dayjs(nextDue.dueISO).format('MMM D') : 'Paid up'
            }
        ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: "Dashboard", description: ownerView ? 'At-a-glance look at collections, repairs, and open work.' : 'Track the leases and payments tied to your wallet.' }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: metrics.map((metric) => (_jsxs(SectionCard, { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-muted", children: metric.label }), _jsx("p", { className: "mt-1 text-2xl font-semibold text-foreground", children: metric.value })] }, metric.label))) }), _jsxs("div", { className: `grid gap-4 ${ownerView ? 'md:grid-cols-3' : 'md:grid-cols-2'}`, children: [_jsx(SectionCard, { title: ownerView ? 'Outstanding invoices' : 'My invoices', description: ownerView ? 'Top invoices that still need payment.' : 'Invoices assigned to you.', children: _jsxs("ul", { className: "space-y-2 text-sm text-foreground", children: [upcomingInvoices.map((invoice) => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-medium", children: [invoice.amountEth, " ETH"] }), _jsxs("p", { className: "text-xs text-muted", children: ["Due ", dayjs(invoice.dueISO).format('MMM D')] })] }), _jsx("span", { className: "text-xs uppercase text-muted", children: invoice.status })] }, invoice.id))), !upcomingInvoices.length && _jsx("li", { className: "text-sm text-muted", children: "No invoices due." })] }) }), _jsx(SectionCard, { title: ownerView ? 'Repair queue' : 'My repairs', description: ownerView ? 'Recent repairs requiring attention.' : 'Requests you have submitted.', children: _jsxs("ul", { className: "space-y-2 text-sm text-foreground", children: [myRepairs.map((repair) => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsx("span", { children: repair.title }), _jsx("span", { className: "text-xs uppercase text-muted", children: repair.status })] }, repair.id))), !myRepairs.length && _jsx("li", { className: "text-sm text-muted", children: "No open repairs." })] }) }), ownerView && (_jsx(SectionCard, { title: "Recent payments", description: "Latest rent receipts across your portfolio.", children: _jsxs("ul", { className: "space-y-2 text-sm text-foreground", children: [recentPayments.map((payment) => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-medium", children: [payment.paidEth, " ETH"] }), _jsx("p", { className: "text-xs text-muted", children: payment.tenant })] }), _jsx("span", { className: "text-xs text-muted", children: dayjs(payment.paidAtISO).format('MMM D') })] }, payment.id))), !recentPayments.length && _jsx("li", { className: "text-sm text-muted", children: "No payments yet." })] }) }))] })] }));
}
