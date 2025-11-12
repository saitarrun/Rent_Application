import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function StepParties({ data, onChange }) {
    return (_jsxs("div", { className: "grid grid-cols-1 gap-4", children: [_jsxs("label", { className: "text-sm font-medium text-slate-600", children: ["Tenant email", _jsx("input", { type: "email", className: "mt-1 w-full border rounded px-3 py-2", value: data.tenantEmail || '', onChange: (e) => onChange({ tenantEmail: e.target.value }) })] }), _jsxs("label", { className: "text-sm font-medium text-slate-600", children: ["Tenant wallet (ETH)", _jsx("input", { className: "mt-1 w-full border rounded px-3 py-2", value: data.tenantEth || '', onChange: (e) => onChange({ tenantEth: e.target.value }), placeholder: "0x\u2026" })] })] }));
}
