import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { payInit, reconcile } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { payInvoiceOnChain } from '../lib/eth';
const PaymentsTable = ({ leaseId, invoices }) => {
    const env = useAppStore((state) => state.environment);
    const role = useAppStore((state) => state.user?.role);
    const pushNotice = useAppStore((state) => state.pushNotice);
    const queryClient = useQueryClient();
    const payMutation = useMutation({
        mutationFn: async (invoiceId) => {
            const init = await payInit(invoiceId);
            const txHash = await payInvoiceOnChain(leaseId, init, env);
            await reconcile(invoiceId, { txHash, chainId: env === 'local' ? '1337' : '11155111', paidEth: init.amountEth });
        },
        onSuccess: () => {
            pushNotice('success', 'Rent paid');
            queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
            queryClient.invalidateQueries({ queryKey: ['leases'] });
        },
        onError: (err) => pushNotice('error', err.message || 'Payment failed')
    });
    return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-slate-500", children: [_jsx("th", { className: "p-2", children: "Period" }), _jsx("th", { className: "p-2", children: "Due" }), _jsx("th", { className: "p-2", children: "Amount (ETH)" }), _jsx("th", { className: "p-2", children: "Status" }), _jsx("th", { className: "p-2" })] }) }), _jsx("tbody", { children: invoices.map((invoice) => (_jsxs("tr", { className: "border-t", children: [_jsxs("td", { className: "p-2", children: [invoice.periodStartISO.slice(0, 10), " \u2192 ", invoice.periodEndISO.slice(0, 10)] }), _jsx("td", { className: "p-2", children: invoice.dueISO.slice(0, 10) }), _jsx("td", { className: "p-2", children: invoice.amountEth }), _jsx("td", { className: "p-2", children: _jsx("span", { className: `px-2 py-1 rounded text-xs ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`, children: invoice.status }) }), _jsx("td", { className: "p-2 text-right", children: role === 'tenant' && invoice.status !== 'paid' && (_jsx("button", { onClick: () => payMutation.mutate(invoice.id), className: "px-3 py-1 rounded bg-slate-900 text-white", children: payMutation.isPending ? 'Processing…' : 'Pay now' })) })] }, invoice.id))) })] }) }));
};
export default PaymentsTable;
