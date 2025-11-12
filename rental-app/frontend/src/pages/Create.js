import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Wizard from '../components/Wizard/Wizard';
import { createLease } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { useQueryClient } from '@tanstack/react-query';
export default function Create() {
    const role = useAppStore((state) => state.user?.role);
    const pushNotice = useAppStore((state) => state.pushNotice);
    const queryClient = useQueryClient();
    const handleSubmit = async (data) => {
        if (role !== 'owner') {
            pushNotice('error', 'Only owners can create leases');
            return;
        }
        await createLease({
            property: {
                name: data.propertyName,
                address: data.propertyAddress
            },
            tenantEmail: data.tenantEmail,
            tenantEth: data.tenantEth,
            startISO: data.startISO,
            endISO: data.endISO,
            dueDay: data.dueDay,
            monthlyRentEth: data.monthlyRent,
            securityDepositEth: data.deposit,
            notes: data.notes
        });
        pushNotice('success', 'Lease created and first invoice generated');
        queryClient.invalidateQueries({ queryKey: ['leases'] });
    };
    if (role !== 'owner') {
        return _jsx("p", { className: "text-sm text-slate-500", children: "Only owners can access the lease builder." });
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold", children: "New lease" }), _jsx("p", { className: "text-sm text-slate-500", children: "Seven-step wizard to capture parties, schedule, and ETH terms." })] }), _jsx(Wizard, { onSubmit: handleSubmit })] }));
}
