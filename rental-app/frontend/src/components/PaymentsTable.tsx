import type { FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { payInit, reconcile } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { payInvoiceOnChain } from '../lib/eth';
import { TxButton } from './TxButton';

interface Props {
  leaseId: string;
  invoices: any[];
}

const PaymentsTable: FC<Props> = ({ leaseId, invoices }) => {
  const env = useAppStore((state) => state.environment);
  const role = useAppStore((state) => state.role ?? state.user?.role);
  const pushNotice = useAppStore((state) => state.pushNotice);
  const queryClient = useQueryClient();

  const payInvoice = async (invoiceId: string) => {
    const init = await payInit(invoiceId);
    const txHash = await payInvoiceOnChain(leaseId, init, env);
    await reconcile(invoiceId, { txHash, chainId: env === 'local' ? '1337' : '11155111', paidEth: init.amountEth });
    pushNotice('success', 'Rent paid');
    queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
    queryClient.invalidateQueries({ queryKey: ['leases'] });
    return txHash;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th className="p-2 font-semibold text-foreground/80">Period</th>
            <th className="p-2 font-semibold text-foreground/80">Due</th>
            <th className="p-2 font-semibold text-foreground/80">Amount (ETH)</th>
            <th className="p-2 font-semibold text-foreground/80">Status</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-t border-outline/40">
              <td className="p-2 text-foreground">
                {invoice.periodStartISO.slice(0, 10)} → {invoice.periodEndISO.slice(0, 10)}
              </td>
              <td className="p-2 text-muted">{invoice.dueISO.slice(0, 10)}</td>
              <td className="p-2 text-foreground">{invoice.amountEth}</td>
              <td className="p-2">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    invoice.status === 'paid' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                  }`}
                >
                  {invoice.status}
                </span>
              </td>
              <td className="p-2 text-right">
                {role === 'tenant' && invoice.status !== 'paid' && (
                  <TxButton label="Pay now" onSend={() => payInvoice(invoice.id)} className="text-sm px-4 py-1.5" />
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
