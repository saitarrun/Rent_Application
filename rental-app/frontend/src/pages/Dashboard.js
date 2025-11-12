import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchLeases, fetchApplications } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
export default function Dashboard() {
    const role = useAppStore((state) => state.user?.role);
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
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Dashboard" }), _jsx("p", { className: "text-slate-500 text-sm", children: role === 'owner' ? 'Track dues, payments, and repairs' : 'See your upcoming rent and requests' })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-white border rounded p-4", children: [_jsx("p", { className: "text-sm text-slate-500", children: "Active leases" }), _jsx("p", { className: "text-2xl font-semibold", children: leases.length })] }), _jsxs("div", { className: "bg-white border rounded p-4", children: [_jsx("p", { className: "text-sm text-slate-500", children: "Outstanding invoices" }), _jsx("p", { className: "text-2xl font-semibold", children: upcomingInvoices.length })] }), ownerView ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "bg-white border rounded p-4", children: [_jsx("p", { className: "text-sm text-slate-500", children: "Collected (ETH)" }), _jsx("p", { className: "text-2xl font-semibold", children: collected.toFixed(2) })] }), _jsxs("div", { className: "bg-white border rounded p-4", children: [_jsx("p", { className: "text-sm text-slate-500", children: "Open applications" }), _jsx("p", { className: "text-2xl font-semibold", children: pendingApplications })] })] })) : (_jsxs("div", { className: "bg-white border rounded p-4", children: [_jsx("p", { className: "text-sm text-slate-500", children: "Next due date" }), _jsx("p", { className: "text-2xl font-semibold", children: nextDue ? dayjs(nextDue.dueISO).format('MMM D') : 'Paid up' })] }))] }), _jsxs("div", { className: `grid grid-cols-1 ${ownerView ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`, children: [_jsxs("div", { className: "bg-white border rounded p-4", children: [_jsx("p", { className: "font-semibold mb-2", children: ownerView ? 'Outstanding invoices' : 'My invoices' }), _jsxs("ul", { className: "space-y-2 text-sm", children: [upcomingInvoices.map((invoice) => (_jsxs("li", { className: "flex justify-between", children: [_jsxs("span", { children: [invoice.amountEth, " ETH due ", dayjs(invoice.dueISO).format('MMM D')] }), _jsx("span", { className: "text-slate-500", children: invoice.status })] }, invoice.id))), !upcomingInvoices.length && _jsx("li", { className: "text-slate-500", children: "No invoices due." })] })] }), _jsxs("div", { className: "bg-white border rounded p-4", children: [_jsx("p", { className: "font-semibold mb-2", children: ownerView ? 'Repair queue' : 'My repairs' }), _jsxs("ul", { className: "space-y-2 text-sm", children: [myRepairs.map((repair) => (_jsxs("li", { className: "flex justify-between", children: [_jsx("span", { children: repair.title }), _jsx("span", { className: "text-slate-500", children: repair.status })] }, repair.id))), !myRepairs.length && _jsx("li", { className: "text-slate-500", children: "No open repairs." })] })] }), ownerView && (_jsxs("div", { className: "bg-white border rounded p-4", children: [_jsx("p", { className: "font-semibold mb-2", children: "Recent payments" }), _jsxs("ul", { className: "space-y-2 text-sm", children: [recentPayments.map((payment) => (_jsxs("li", { className: "flex justify-between", children: [_jsxs("span", { children: [payment.paidEth, " ETH from ", payment.tenant] }), _jsx("span", { className: "text-slate-500", children: dayjs(payment.paidAtISO).format('MMM D') })] }, payment.id))), !recentPayments.length && _jsx("li", { className: "text-slate-500", children: "No payments yet." })] })] }))] })] }));
}
