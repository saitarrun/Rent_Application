import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getLedger } from '../lib/api';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
export default function PropertyLedger() {
    const { id } = useParams();
    const { data, isLoading } = useQuery({ queryKey: ['ledger', id], queryFn: () => getLedger(id), enabled: Boolean(id) });
    if (isLoading || !data)
        return _jsx("p", { className: "text-muted", children: "Loading\u2026" });
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(PageHeader, { title: `Ledger for ${data.property.name}`, description: "Track dues and receipts per lease." }), _jsx(SectionCard, { children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-muted", children: [_jsx("th", { className: "p-3 font-semibold text-foreground/80", children: "Lease" }), _jsx("th", { className: "p-3 font-semibold text-foreground/80", children: "Tenant" }), _jsx("th", { className: "p-3 font-semibold text-foreground/80", children: "Outstanding (ETH)" }), _jsx("th", { className: "p-3 font-semibold text-foreground/80", children: "Collected (ETH)" })] }) }), _jsx("tbody", { children: data.ledger.map((entry) => (_jsxs("tr", { className: "border-t border-outline/40", children: [_jsx("td", { className: "p-3 font-semibold text-foreground", children: entry.leaseId.slice(0, 6) }), _jsx("td", { className: "p-3 text-muted", children: entry.tenantId.slice(0, 6) }), _jsx("td", { className: "p-3 text-foreground", children: entry.outstandingEth }), _jsx("td", { className: "p-3 text-foreground", children: entry.collectedEth })] }, entry.leaseId))) })] }) }) })] }));
}
