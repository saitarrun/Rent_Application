import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function PageHeader({ title, description, actions }) {
    return (_jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-start md:justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "font-display text-3xl font-semibold tracking-tight text-foreground", children: title }), description && _jsx("p", { className: "text-sm text-muted", children: description })] }), actions && _jsx("div", { className: "flex flex-wrap gap-2", children: actions })] }));
}
