import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQueryClient } from '@tanstack/react-query';
import { payInit, reconcile } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { payInvoiceOnChain } from '../lib/eth';
import { TxButton } from './TxButton';
const PaymentsTable = ({ leaseId, invoices }) => {
    const env = useAppStore((state) => state.environment);
    const role = useAppStore((state) => state.role ?? state.user?.role);
    const pushNotice = useAppStore((state) => state.pushNotice);
    const queryClient = useQueryClient();
    const payInvoice = async (invoiceId) => {
        const init = await payInit(invoiceId);
        const txHash = await payInvoiceOnChain(leaseId, init, env);
        await reconcile(invoiceId, { txHash, chainId: env === 'local' ? '1337' : '11155111', paidEth: init.amountEth });
        pushNotice('success', 'Rent paid');
        queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
        queryClient.invalidateQueries({ queryKey: ['leases'] });
        return txHash;
    };
    return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-muted", children: [_jsx("th", { className: "p-2 font-semibold text-foreground/80", children: "Period" }), _jsx("th", { className: "p-2 font-semibold text-foreground/80", children: "Due" }), _jsx("th", { className: "p-2 font-semibold text-foreground/80", children: "Amount (ETH)" }), _jsx("th", { className: "p-2 font-semibold text-foreground/80", children: "Status" }), _jsx("th", { className: "p-2" })] }) }), _jsx("tbody", { children: invoices.map((invoice) => (_jsxs("tr", { className: "border-t border-outline/40", children: [_jsxs("td", { className: "p-2 text-foreground", children: [invoice.periodStartISO.slice(0, 10), " \u2192 ", invoice.periodEndISO.slice(0, 10)] }), _jsx("td", { className: "p-2 text-muted", children: invoice.dueISO.slice(0, 10) }), _jsx("td", { className: "p-2 text-foreground", children: invoice.amountEth }), _jsx("td", { className: "p-2", children: _jsx("span", { className: `inline-flex rounded-full px-2 py-1 text-xs font-semibold ${invoice.status === 'paid' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`, children: invoice.status }) }), _jsx("td", { className: "p-2 text-right", children: role === 'tenant' && invoice.status !== 'paid' && (_jsx(TxButton, { label: "Pay now", onSend: () => payInvoice(invoice.id), className: "text-sm px-4 py-1.5" })) })] }, invoice.id))) })] }) }));
};
export default PaymentsTable;
