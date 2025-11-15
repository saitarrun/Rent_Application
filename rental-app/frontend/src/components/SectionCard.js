import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function SectionCard({ title, description, children, footer, bleed }) {
    return (_jsxs("section", { className: `bg-surface-2 border border-outline rounded-2xl ${bleed ? '' : 'p-6'} shadow-soft`, children: [title && (_jsxs("header", { className: `flex flex-col gap-1 ${bleed ? 'p-6 pb-0' : ''}`, children: [_jsx("p", { className: "text-sm font-semibold text-foreground", children: title }), description && _jsx("p", { className: "text-xs text-muted", children: description })] })), _jsx("div", { className: bleed ? 'p-6' : 'mt-4', children: children }), footer && _jsx("div", { className: `mt-4 border-t border-outline pt-3 text-sm text-muted ${bleed ? 'px-6 pb-6' : ''}`, children: footer })] }));
}
