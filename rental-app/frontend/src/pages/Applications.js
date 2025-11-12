import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApplications, updateApplicationStatus } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
const statuses = ['submitted', 'reviewing', 'approved', 'rejected'];
export default function Applications() {
    const role = useAppStore((state) => state.user?.role);
    const pushNotice = useAppStore((state) => state.pushNotice);
    const queryClient = useQueryClient();
    const { data: applications = [], isLoading } = useQuery({ queryKey: ['applications'], queryFn: fetchApplications });
    const updateMutation = useMutation({
        mutationFn: ({ id, status }) => updateApplicationStatus(id, status),
        onSuccess: () => {
            pushNotice('success', 'Application updated');
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['leases'] });
        },
        onError: (err) => pushNotice('error', err.response?.data?.message || 'Unable to update application')
    });
    const title = role === 'owner' ? 'Lease applications' : 'My applications';
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold", children: title }), _jsx("p", { className: "text-sm text-slate-500", children: role === 'owner'
                            ? 'Review tenant submissions and approve to convert them into leases.'
                            : 'Track the status of every property you applied for.' })] }), isLoading ? (_jsx("p", { children: "Loading applications\u2026" })) : (_jsx("div", { className: "bg-white border rounded", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-slate-500", children: [_jsx("th", { className: "p-3", children: "Property" }), _jsx("th", { className: "p-3", children: "City" }), _jsx("th", { className: "p-3", children: "Applicant" }), _jsx("th", { className: "p-3", children: "Status" }), _jsx("th", { className: "p-3" })] }) }), _jsxs("tbody", { children: [applications.map((app) => (_jsxs("tr", { className: "border-t", children: [_jsx("td", { className: "p-3 font-medium", children: app.listing?.title }), _jsx("td", { className: "p-3", children: app.listing?.city }), _jsx("td", { className: "p-3", children: app.applicant?.email || app.applicantEmail }), _jsx("td", { className: "p-3 capitalize", children: app.status }), _jsx("td", { className: "p-3", children: role === 'owner' && (_jsx("select", { className: "border rounded px-2 py-1 text-sm", value: app.status, onChange: (e) => updateMutation.mutate({ id: app.id, status: e.target.value }), children: statuses.map((status) => (_jsx("option", { value: status, children: status }, status))) })) })] }, app.id))), !applications.length && (_jsx("tr", { children: _jsx("td", { className: "p-4 text-center text-slate-500", colSpan: 5, children: "No applications yet." }) }))] })] }) }))] }));
}
