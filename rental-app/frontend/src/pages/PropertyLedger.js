import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getLedger } from '../lib/api';
export default function PropertyLedger() {
    const { id } = useParams();
    const { data, isLoading } = useQuery({ queryKey: ['ledger', id], queryFn: () => getLedger(id), enabled: Boolean(id) });
    if (isLoading || !data)
        return _jsx("p", { children: "Loading\u2026" });
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-semibold", children: ["Ledger for ", data.property.name] }), _jsx("p", { className: "text-sm text-slate-500", children: "Track dues and receipts per lease." })] }), _jsx("div", { className: "overflow-x-auto bg-white border rounded", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-slate-500", children: [_jsx("th", { className: "p-3", children: "Lease" }), _jsx("th", { className: "p-3", children: "Tenant" }), _jsx("th", { className: "p-3", children: "Outstanding (ETH)" }), _jsx("th", { className: "p-3", children: "Collected (ETH)" })] }) }), _jsx("tbody", { children: data.ledger.map((entry) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "p-3", children: entry.leaseId.slice(0, 6) }), _jsx("td", { className: "p-3", children: entry.tenantId.slice(0, 6) }), _jsx("td", { className: "p-3", children: entry.outstandingEth }), _jsx("td", { className: "p-3", children: entry.collectedEth })] }, entry.leaseId))) })] }) })] }));
}
