import type { FC } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { payInit, reconcile } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { payInvoiceOnChain } from '../lib/eth';

interface Props {
  leaseId: string;
  invoices: any[];
}

const PaymentsTable: FC<Props> = ({ leaseId, invoices }) => {
  const env = useAppStore((state) => state.environment);
  const role = useAppStore((state) => state.user?.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();

  const payMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const init = await payInit(invoiceId);
      const txHash = await payInvoiceOnChain(leaseId, init, env);
      await reconcile(invoiceId, { txHash, chainId: env === 'local' ? '1337' : '11155111', paidEth: init.amountEth });
    },
    onSuccess: () => {
      pushNotice('success', 'Rent paid');
      queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
    },
    onError: (err: any) => pushNotice('error', err.message || 'Payment failed')
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="p-2">Period</th>
            <th className="p-2">Due</th>
            <th className="p-2">Amount (ETH)</th>
            <th className="p-2">Status</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-t">
              <td className="p-2">{invoice.periodStartISO.slice(0, 10)} → {invoice.periodEndISO.slice(0, 10)}</td>
              <td className="p-2">{invoice.dueISO.slice(0, 10)}</td>
              <td className="p-2">{invoice.amountEth}</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded text-xs ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {invoice.status}
                </span>
              </td>
              <td className="p-2 text-right">
                {role === 'tenant' && invoice.status !== 'paid' && (
                  <button
                    onClick={() => payMutation.mutate(invoice.id)}
                    className="px-3 py-1 rounded bg-slate-900 text-white"
                  >
                    {payMutation.isPending ? 'Processing…' : 'Pay now'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentsTable;
