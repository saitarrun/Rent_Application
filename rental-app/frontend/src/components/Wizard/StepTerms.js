import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function StepTerms({ data, onChange }) {
    return (_jsxs("label", { className: "text-sm font-medium text-slate-600 w-full", children: ["Special terms / notes", _jsx("textarea", { className: "mt-1 w-full border rounded px-3 py-2 min-h-[120px]", value: data.notes || '', onChange: (e) => onChange({ notes: e.target.value }) })] }));
}
