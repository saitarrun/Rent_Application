import { useMemo, useState, ChangeEvent } from 'react';
import { AnimatedButton } from './AnimatedButton';
import { useAppStore } from '../store/useAppStore';
import {
  ApplicationDetailsPayload,
  ApplicationDocumentPayload,
  SubmitApplicationPayload
} from '../lib/api';

type WizardResult = {
  details: ApplicationDetailsPayload;
  documents: ApplicationDocumentPayload[];
  message?: string;
};

type WizardProps = {
  listing: any;
  onClose: () => void;
  onSubmit: (payload: WizardResult) => void;
  submitting?: boolean;
};

type OccupantDraft = {
  name: string;
  relationship: string;
  age: string;
};

type WizardDetailsState = {
  legalName: string;
  email: string;
  phone: string;
  birthDate: string;
  preferredMoveIn: string;
  employmentStatus: string;
  employerName: string;
  annualIncome: string;
  monthlyIncome: string;
  creditScore: string;
  notes: string;
  occupants: ApplicationDetailsPayload['occupants'];
};

const steps = [
  { key: 'identity', title: 'Personal information', description: 'Introduce yourself to the owner.' },
  { key: 'income', title: 'Income & employment', description: 'Share your income details for verification.' },
  { key: 'occupants', title: 'Household members', description: 'Let us know who else will live with you.' },
  { key: 'documents', title: 'Documents', description: 'Upload IDs, pay stubs, or references (optional).' },
  { key: 'review', title: 'Review & submit', description: 'Double-check everything before sending.' }
];

type WizardDocument = ApplicationDocumentPayload & {
  id: string;
  progress: number;
  uploading: boolean;
};

function makeId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function fileToBase64(file: File, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function ApplicationWizard({ listing, onClose, onSubmit, submitting }: WizardProps) {
  const userEmail = useAppStore((state) => state.user?.email);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<WizardDetailsState>({
    legalName: '',
    email: userEmail ?? '',
    phone: '',
    birthDate: '',
    preferredMoveIn: '',
    employmentStatus: 'Employed',
    employerName: '',
    annualIncome: '',
    monthlyIncome: '',
    creditScore: '',
    notes: '',
    occupants: []
  });
  const [occupantDraft, setOccupantDraft] = useState<OccupantDraft>({ name: '', relationship: '', age: '' });
  const [documents, setDocuments] = useState<WizardDocument[]>([]);

  const canGoBack = step > 0;
  const isFinalStep = step === steps.length - 1;
  const hasRoomForUploads = documents.length < 5;

  const validateStep = (currentStep: number): string | null => {
    if (currentStep === 0) {
      if (!details.legalName.trim()) return 'Please enter your legal name.';
      if (!details.email.trim() || !details.email.includes('@')) return 'A valid email is required.';
      if (!details.phone.trim()) return 'Phone number is required.';
    }
    if (currentStep === 1) {
      if (!details.employmentStatus.trim()) return 'Employment status is required.';
      const annualIncome = Number(details.annualIncome || 0);
      if (!Number.isFinite(annualIncome) || annualIncome <= 0) return 'Annual income must be greater than 0.';
    }
    if (currentStep === 2) {
      if (occupantDraft.name.trim() && !occupantDraft.relationship.trim()) {
        return 'Please provide a relationship for the occupant you are adding.';
      }
    }
    return null;
  };

  const nextStep = () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const previousStep = () => {
    if (!canGoBack) return;
    setError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const addOccupant = () => {
    if (!occupantDraft.name.trim()) {
      setError('Occupant name is required.');
      return;
    }
    const occupant = {
      name: occupantDraft.name.trim(),
      relationship: occupantDraft.relationship.trim() || undefined,
      age: occupantDraft.age ? Number(occupantDraft.age) : undefined
    };
    setDetails((prev) => ({
      ...prev,
      occupants: [...prev.occupants, occupant]
    }));
    setOccupantDraft({ name: '', relationship: '', age: '' });
    setError(null);
  };

  const removeOccupant = (index: number) => {
    setDetails((prev) => ({
      ...prev,
      occupants: prev.occupants.filter((_, idx) => idx !== index)
    }));
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    const remainingSlots = Math.max(0, 5 - documents.length);
    const selected = files.slice(0, remainingSlots);
    selected.forEach((file) => {
      const id = makeId();
      const draft: WizardDocument = {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        data: '',
        progress: 0,
        uploading: true
      };
      setDocuments((prev) => [...prev, draft]);
      fileToBase64(file, (percent) => {
        setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, progress: percent } : doc)));
      })
        .then((base64) => {
          setDocuments((prev) =>
            prev.map((doc) => (doc.id === id ? { ...doc, data: base64, progress: 100, uploading: false } : doc))
          );
          setError(null);
        })
        .catch((err) => {
          console.error(err);
          setDocuments((prev) => prev.filter((doc) => doc.id !== id));
          setError('Unable to read one of the selected files.');
        })
        .finally(() => {
          event.target.value = '';
        });
    });
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleSubmit = () => {
    for (let idx = 0; idx <= steps.length - 2; idx += 1) {
      const validationError = validateStep(idx);
      if (validationError) {
        setError(validationError);
        setStep(idx);
        return;
      }
    }
    if (documents.some((doc) => doc.uploading)) {
      setError('Please wait for uploads to finish before submitting.');
      setStep(3);
      return;
    }
    setError(null);
    const payloadDetails: ApplicationDetailsPayload = {
      legalName: details.legalName.trim(),
      email: details.email.trim(),
      phone: details.phone.trim(),
      birthDate: details.birthDate || undefined,
      preferredMoveIn: details.preferredMoveIn || undefined,
      employmentStatus: details.employmentStatus.trim(),
      employerName: details.employerName.trim() || undefined,
      annualIncome: Number(details.annualIncome) || 0,
      monthlyIncome: details.monthlyIncome ? Number(details.monthlyIncome) : undefined,
      creditScore: details.creditScore ? Number(details.creditScore) : undefined,
      occupants: details.occupants,
      notes: details.notes.trim() ? details.notes.trim() : undefined
    };
    const payloadDocuments = documents.map(({ name, type, size, data }) => ({
      name,
      type,
      size,
      data
    }));
    onSubmit({ details: payloadDetails, documents: payloadDocuments, message: payloadDetails.notes });
  };

  const stepIndicator = useMemo(
    () => (
      <ol className="flex items-center gap-3 text-xs font-semibold text-muted">
        {steps.map((item, index) => {
          const active = index === step;
          return (
            <li key={item.key} className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                  active ? 'border-brand bg-brand text-brand-fg' : 'border-outline bg-surface-2 text-muted'
                }`}
              >
                {index + 1}
              </span>
              <span className={active ? 'text-foreground' : ''}>{item.title}</span>
              {index < steps.length - 1 && <span className="text-outline">—</span>}
            </li>
          );
        })}
      </ol>
    ),
    [step]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-outline bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Apply for {listing?.title}</h2>
            <p className="text-sm text-muted">
              {listing?.city}, {listing?.state} • {Number(listing?.rentEth ?? 0).toFixed(2)} ETH / mo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-outline p-2 text-muted hover:text-foreground disabled:opacity-50"
          >
            ×
          </button>
        </div>
        <div className="mt-4">{stepIndicator}</div>
        <div className="mt-4 rounded-2xl border border-outline/60 bg-surface-1 p-4">
          <h3 className="text-lg font-semibold text-foreground">{steps[step].title}</h3>
          <p className="text-sm text-muted">{steps[step].description}</p>
          <div className="mt-4 space-y-4">
            {step === 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-muted">
                  Legal name
                  <input
                    className="mt-1 w-full rounded-xl border border-outline px-3 py-2"
                    value={details.legalName}
                    onChange={(e) => setDetails((prev) => ({ ...prev, legalName: e.target.value }))}
                  />
                </label>
                <label className="text-sm text-muted">
                  Email
                  <input
                    className="mt-1 w-full rounded-xl border border-outline px-3 py-2"
                    type="email"
                    value={details.email}
                    onChange={(e) => setDetails((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </label>
                <label className="text-sm text-muted">
                  Phone
                  <input
                    className="mt-1 w-full rounded-xl border border-outline px-3 py-2"
                    value={details.phone}
                    onChange={(e) => setDetails((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </label>
                <label className="text-sm text-muted">
                  Preferred move-in date
                  <input
                    className="mt-1 w-full rounded-xl border border-outline px-3 py-2"
                    type="date"
                    value={details.preferredMoveIn}
                    onChange={(e) => setDetails((prev) => ({ ...prev, preferredMoveIn: e.target.value }))}
                  />
                </label>
                <label className="text-sm text-muted">
                  Birth date
                  <input
                    className="mt-1 w-full rounded-xl border border-outline px-3 py-2"
                    type="date"
                    value={details.birthDate}
                    onChange={(e) => setDetails((prev) => ({ ...prev, birthDate: e.target.value }))}
                  />
                </label>
                <label className="text-sm text-muted">
                  Notes to owner
                  <textarea
                    className="mt-1 h-24 w-full rounded-xl border border-outline px-3 py-2"
                    value={details.notes}
                    onChange={(e) => setDetails((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-muted">
                  Employment status
                  <select
                    className="mt-1 w-full rounded-xl border border-outline px-3 py-2"
                    value={details.employmentStatus}
                    onChange={(e) => setDetails((prev) => ({ ...prev, employmentStatus: e.target.value }))}
                  >
                    <option value="Employed">Employed</option>
                    <option value="Self-employed">Self-employed</option>
                    <option value="Student">Student</option>
                    <option value="Retired">Retired</option>
                    <option value="Unemployed">Unemployed</option>
                  </select>
                </label>
                <label className="text-sm text-muted">
                  Employer name
                  <input
                    className="mt-1 w-full rounded-xl border border-outline px-3 py-2"
                    value={details.employerName}
                    onChange={(e) => setDetails((prev) => ({ ...prev, employerName: e.target.value }))}
                  />
                </label>
                <label className="text-sm text-muted">
                  Annual income (USD)
                  <input
                    className="mt-1 w-full rounded-xl border border-outline px-3 py-2"
                    type="number"
                    min="0"
                    value={details.annualIncome}
                    onChange={(e) => setDetails((prev) => ({ ...prev, annualIncome: e.target.value }))}
                  />
                </label>
                <label className="text-sm text-muted">
                  Monthly income (USD)
                  <input
                    className="mt-1 w-full rounded-xl border border-outline px-3 py-2"
                    type="number"
                    min="0"
                    value={details.monthlyIncome}
                    onChange={(e) => setDetails((prev) => ({ ...prev, monthlyIncome: e.target.value }))}
                  />
                </label>
                <label className="text-sm text-muted">
                  Credit score
                  <input
                    className="mt-1 w-full rounded-xl border border-outline px-3 py-2"
                    type="number"
                    min="300"
                    max="850"
                    value={details.creditScore}
                    onChange={(e) => setDetails((prev) => ({ ...prev, creditScore: e.target.value }))}
                  />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-outline/60 p-3">
                  <p className="text-sm font-semibold text-muted">Add an occupant</p>
                  <div className="mt-2 grid gap-3 md:grid-cols-3">
                    <input
                      className="rounded-xl border border-outline px-3 py-2 text-sm"
                      placeholder="Name"
                      value={occupantDraft.name}
                      onChange={(e) => setOccupantDraft((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <input
                      className="rounded-xl border border-outline px-3 py-2 text-sm"
                      placeholder="Relationship"
                      value={occupantDraft.relationship}
                      onChange={(e) => setOccupantDraft((prev) => ({ ...prev, relationship: e.target.value }))}
                    />
                    <input
                      className="rounded-xl border border-outline px-3 py-2 text-sm"
                      placeholder="Age"
                      type="number"
                      min="0"
                      value={occupantDraft.age}
                      onChange={(e) => setOccupantDraft((prev) => ({ ...prev, age: e.target.value }))}
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-3 rounded-xl border border-outline px-3 py-1.5 text-sm font-semibold text-brand"
                    onClick={addOccupant}
                  >
                    Add occupant
                  </button>
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted">Household</p>
                  {details.occupants.length ? (
                    <ul className="mt-2 space-y-2 text-sm">
                      {details.occupants.map((occupant, index) => (
                        <li
                          key={`${occupant.name}-${index}`}
                          className="flex items-center justify-between rounded-xl border border-outline px-3 py-2"
                        >
                          <div>
                            <p className="font-medium text-foreground">{occupant.name}</p>
                            <p className="text-xs text-muted">
                              {occupant.relationship || '—'}
                              {occupant.age ? ` • ${occupant.age} yrs` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="text-xs text-danger"
                            onClick={() => removeOccupant(index)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">No additional occupants yet.</p>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <label className="block text-sm text-muted">
                  Upload files (max 5)
                  <input
                    className="mt-2 block w-full text-sm"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    multiple
                    disabled={!hasRoomForUploads}
                    onChange={handleFileUpload}
                  />
                </label>
                {documents.length ? (
                  <ul className="space-y-2 text-sm">
                    {documents.map((doc) => {
                      const fileExt = doc.name?.split('.')?.pop()?.toUpperCase() ?? 'FILE';
                      const sizeLabel =
                        (doc.size || 0) / 1024 < 1
                          ? `${doc.size ?? 0} B`
                          : `${Math.round((doc.size ?? 0) / 1024)} KB`;
                      return (
                        <li
                          key={doc.id}
                          className="rounded-2xl border border-outline px-3 py-3 shadow-sm"
                          aria-live="polite"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-xs font-semibold text-muted">
                                {fileExt}
                              </span>
                              <div>
                                <p className="font-medium text-foreground">{doc.name}</p>
                                <p className="text-xs text-muted">{sizeLabel}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="text-xs font-semibold text-danger"
                              onClick={() => removeDocument(doc.id)}
                              aria-label={`Remove ${doc.name}`}
                            >
                              Remove
                            </button>
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[11px] text-muted">
                              <span>{doc.uploading ? 'Uploading…' : 'Ready'}</span>
                              <span>{doc.progress}%</span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-outline/30">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  doc.uploading ? 'bg-brand/60' : 'bg-brand'
                                }`}
                                style={{ width: `${doc.progress}%` }}
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={doc.progress}
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">No documents uploaded yet.</p>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 text-sm">
                <div className="rounded-2xl border border-outline/60 p-3">
                  <p className="text-xs uppercase text-muted">Applicant</p>
                  <p className="font-medium text-foreground">{details.legalName || '—'}</p>
                  <p className="text-muted">{details.email || '—'} • {details.phone || '—'}</p>
                  {details.preferredMoveIn && (
                    <p className="text-muted">Move-in: {details.preferredMoveIn}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-outline/60 p-3">
                  <p className="text-xs uppercase text-muted">Income</p>
                  <p className="text-muted">Status: {details.employmentStatus || '—'}</p>
                  <p className="text-muted">Employer: {details.employerName || '—'}</p>
                  <p className="text-muted">
                    Annual income: ${details.annualIncome || '0'} {details.monthlyIncome ? `• Monthly: $${details.monthlyIncome}` : ''}
                  </p>
                  {details.creditScore && <p className="text-muted">Credit score: {details.creditScore}</p>}
                </div>
                <div className="rounded-2xl border border-outline/60 p-3">
                  <p className="text-xs uppercase text-muted">Occupants</p>
                  {details.occupants.length ? (
                    <ul className="mt-2 space-y-1">
                      {details.occupants.map((occupant, index) => (
                        <li key={`${occupant.name}-${index}`}>
                          {occupant.name} • {occupant.relationship || '—'}
                          {occupant.age ? ` (${occupant.age})` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted">Only you.</p>
                  )}
                </div>
                {documents.length > 0 && (
                  <div className="rounded-2xl border border-outline/60 p-3">
                    <p className="text-xs uppercase text-muted">Documents</p>
                    <p className="text-muted">{documents.length} file(s) ready to send.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            className="rounded-xl border border-outline px-4 py-2 text-sm text-muted disabled:opacity-50"
            onClick={previousStep}
            disabled={!canGoBack || submitting}
          >
            Back
          </button>
          <div className="flex gap-3">
            {!isFinalStep && (
              <button
                type="button"
                className="rounded-xl border border-outline px-4 py-2 text-sm font-semibold text-brand disabled:opacity-50"
                onClick={nextStep}
                disabled={submitting}
              >
                Next
              </button>
            )}
            {isFinalStep && (
              <AnimatedButton onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit application'}
              </AnimatedButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApplicationWizard;
