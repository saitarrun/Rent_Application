import { useState } from 'react';
import StepProperty from './StepProperty';
import StepParties from './StepParties';
import StepDates from './StepDates';
import StepMoneyEth from './StepMoneyEth';
import StepTerms from './StepTerms';
import StepReview from './StepReview';
import type { LeaseWizardData } from '../../lib/validate';

interface WizardProps {
  onSubmit: (data: Partial<LeaseWizardData>) => Promise<void>;
}

type StepDef = {
  label: string;
  component: React.FC<{
    data: Partial<LeaseWizardData>;
    onChange: (values: Partial<LeaseWizardData>) => void;
  }>;
};

const steps: StepDef[] = [
  { label: 'Property', component: StepProperty },
  { label: 'Parties', component: StepParties },
  { label: 'Dates', component: StepDates },
  { label: 'Money', component: StepMoneyEth },
  { label: 'Terms', component: StepTerms },
  { label: 'Review', component: StepReview }
];

export default function Wizard({ onSubmit }: WizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<Partial<LeaseWizardData>>({ dueDay: 1 });
  const [submitting, setSubmitting] = useState(false);

  const CurrentStep = steps[stepIndex].component;

  const goNext = () => setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  const goPrev = () => setStepIndex((prev) => Math.max(prev - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit(draft);
    setSubmitting(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center gap-3 text-sm">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex items-center gap-1">
            <div
              className={`w-6 h-6 rounded-full text-center text-xs leading-6 ${
                idx === stepIndex ? 'bg-slate-900 text-white' : 'bg-slate-200'
              }`}
            >
              {idx + 1}
            </div>
            <span className={idx === stepIndex ? 'text-slate-900 font-semibold' : 'text-slate-500'}>{step.label}</span>
          </div>
        ))}
      </div>
      <CurrentStep data={draft} onChange={(values) => setDraft((prev) => ({ ...prev, ...values }))} />
      <div className="flex justify-between">
        <button onClick={goPrev} disabled={stepIndex === 0} className="px-4 py-2 rounded border disabled:opacity-50">
          Back
        </button>
        {stepIndex === steps.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded bg-slate-900 text-white"
          >
            {submitting ? 'Submitting…' : 'Create lease'}
          </button>
        ) : (
          <button onClick={goNext} className="px-4 py-2 rounded bg-slate-900 text-white">
            Next
          </button>
        )}
      </div>
    </div>
  );
}
