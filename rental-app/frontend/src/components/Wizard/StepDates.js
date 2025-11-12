import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function StepDates({ data, onChange }) {
    return (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("label", { className: "text-sm font-medium text-slate-600", children: ["Start date", _jsx("input", { type: "date", className: "mt-1 w-full border rounded px-3 py-2", value: data.startISO?.slice(0, 10) || '', onChange: (e) => {
                            if (!e.target.value)
                                return;
                            onChange({ startISO: new Date(e.target.value).toISOString() });
                        } })] }), _jsxs("label", { className: "text-sm font-medium text-slate-600", children: ["End date", _jsx("input", { type: "date", className: "mt-1 w-full border rounded px-3 py-2", value: data.endISO?.slice(0, 10) || '', onChange: (e) => {
                            if (!e.target.value)
                                return;
                            onChange({ endISO: new Date(e.target.value).toISOString() });
                        } })] }), _jsxs("label", { className: "text-sm font-medium text-slate-600", children: ["Due day of month", _jsx("input", { type: "number", min: 1, max: 31, className: "mt-1 w-full border rounded px-3 py-2", value: data.dueDay || 1, onChange: (e) => onChange({ dueDay: Number(e.target.value) }) })] })] }));
}
