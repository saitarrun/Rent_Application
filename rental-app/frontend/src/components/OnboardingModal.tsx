import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AnimatedButton } from './AnimatedButton';

interface OnboardingStep {
  title: string;
  description: string;
  icon?: string;
}

const OWNER_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome, Owner!',
    description: 'Manage your rental properties, leases, and tenant relationships all in one place.',
    icon: '🏠'
  },
  {
    title: 'Portfolio Overview',
    description: 'View all your properties, active leases, and key metrics from the Portfolio section.'
  },
  {
    title: 'Lease Management',
    description: 'Sign leases, track payments, view repairs, and monitor tenant compliance.'
  },
  {
    title: 'Payments & Deposits',
    description: 'Track deposit payments, annual rent collection, and reconcile transactions.'
  },
  {
    title: 'Repairs & Maintenance',
    description: 'Review tenant repair requests, approve costs, and deduct from deposits when needed.'
  }
];

const TENANT_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome, Tenant!',
    description: 'Find properties, apply for leases, sign agreements, and manage payments.',
    icon: '🔑'
  },
  {
    title: 'Browse Listings',
    description: 'Explore available properties and find the perfect rental for your needs.'
  },
  {
    title: 'Apply & Sign',
    description: 'Submit applications and sign leases digitally with property owners.'
  },
  {
    title: 'Payments',
    description: 'Pay your security deposit and monthly rent securely through your wallet.'
  },
  {
    title: 'Repairs',
    description: 'Submit maintenance requests and track their progress with your owner.'
  }
];

export function OnboardingModal() {
  const role = useAppStore((state) => state.role ?? state.user?.role);
  const hasCompleted = useAppStore((state) => state.hasCompletedOnboarding(`onboarding-${role}`));
  const markCompleted = useAppStore((state) => state.markOnboardingCompleted);
  const [step, setStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const steps = role === 'owner' ? OWNER_STEPS : TENANT_STEPS;

  useEffect(() => {
    // Show onboarding if user hasn't completed it
    if (!hasCompleted && role) {
      const timer = setTimeout(() => setIsOpen(true), 1000); // Delay slightly for smoother UX
      return () => clearTimeout(timer);
    }
  }, [hasCompleted, role]);

  if (!isOpen || !role) return null;

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      markCompleted(`onboarding-${role}`);
      setIsOpen(false);
      setStep(0);
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    markCompleted(`onboarding-${role}`);
    setIsOpen(false);
    setStep(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface-1 p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          {currentStep.icon && <div className="mb-4 text-5xl">{currentStep.icon}</div>}
          <h2 className="text-2xl font-semibold text-foreground">{currentStep.title}</h2>
        </div>

        {/* Description */}
        <p className="mb-8 text-center text-muted">{currentStep.description}</p>

        {/* Progress dots */}
        <div className="mb-8 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-6 bg-brand' : i < step ? 'w-2 bg-brand/50' : 'w-2 bg-outline'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <AnimatedButton onClick={handleNext} className="w-full">
            {isLastStep ? 'Get Started' : 'Next'}
          </AnimatedButton>
          <button
            onClick={handleSkip}
            className="w-full rounded-lg border border-outline px-4 py-2 text-sm text-muted transition hover:bg-surface-2"
          >
            {isLastStep ? 'Close' : 'Skip Tour'}
          </button>
        </div>

        {/* Step counter */}
        <p className="mt-4 text-center text-xs text-muted">
          {step + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
}
