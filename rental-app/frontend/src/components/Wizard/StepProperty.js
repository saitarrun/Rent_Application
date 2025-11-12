import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function StepProperty({ data, onChange }) {
    return (_jsxs("div", { className: "grid grid-cols-1 gap-4", children: [_jsxs("label", { className: "text-sm font-medium text-slate-600", children: ["Property name", _jsx("input", { className: "mt-1 w-full border rounded px-3 py-2", value: data.propertyName || '', onChange: (e) => onChange({ propertyName: e.target.value }) })] }), _jsxs("label", { className: "text-sm font-medium text-slate-600", children: ["Address", _jsx("textarea", { className: "mt-1 w-full border rounded px-3 py-2", value: data.propertyAddress || '', onChange: (e) => onChange({ propertyAddress: e.target.value }) })] })] }));
}
