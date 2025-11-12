import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import StepProperty from './StepProperty';
import StepParties from './StepParties';
import StepDates from './StepDates';
import StepMoneyEth from './StepMoneyEth';
import StepTerms from './StepTerms';
import StepReview from './StepReview';
const steps = [
    { label: 'Property', component: StepProperty },
    { label: 'Parties', component: StepParties },
    { label: 'Dates', component: StepDates },
    { label: 'Money', component: StepMoneyEth },
    { label: 'Terms', component: StepTerms },
    { label: 'Review', component: StepReview }
];
export default function Wizard({ onSubmit }) {
    const [stepIndex, setStepIndex] = useState(0);
    const [draft, setDraft] = useState({ dueDay: 1 });
    const [submitting, setSubmitting] = useState(false);
    const CurrentStep = steps[stepIndex].component;
    const goNext = () => setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    const goPrev = () => setStepIndex((prev) => Math.max(prev - 1, 0));
    const handleSubmit = async () => {
        setSubmitting(true);
        await onSubmit(draft);
        setSubmitting(false);
    };
    return (_jsxs("div", { className: "bg-white rounded-lg shadow p-6 space-y-4", children: [_jsx("div", { className: "flex items-center gap-3 text-sm", children: steps.map((step, idx) => (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: `w-6 h-6 rounded-full text-center text-xs leading-6 ${idx === stepIndex ? 'bg-slate-900 text-white' : 'bg-slate-200'}`, children: idx + 1 }), _jsx("span", { className: idx === stepIndex ? 'text-slate-900 font-semibold' : 'text-slate-500', children: step.label })] }, step.label))) }), _jsx(CurrentStep, { data: draft, onChange: (values) => setDraft((prev) => ({ ...prev, ...values })) }), _jsxs("div", { className: "flex justify-between", children: [_jsx("button", { onClick: goPrev, disabled: stepIndex === 0, className: "px-4 py-2 rounded border disabled:opacity-50", children: "Back" }), stepIndex === steps.length - 1 ? (_jsx("button", { onClick: handleSubmit, disabled: submitting, className: "px-4 py-2 rounded bg-slate-900 text-white", children: submitting ? 'Submitting…' : 'Create lease' })) : (_jsx("button", { onClick: goNext, className: "px-4 py-2 rounded bg-slate-900 text-white", children: "Next" }))] })] }));
}
