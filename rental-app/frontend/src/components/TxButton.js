import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { AnimatedButton } from './AnimatedButton';
export function TxButton({ label, onSend, className, disabled }) {
    const [loading, setLoading] = useState(false);
    const fireConfetti = () => {
        const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion)
            return;
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    };
    const handleClick = async () => {
        if (loading || disabled)
            return;
        setLoading(true);
        const toastId = toast.loading('Submitting transaction…');
        try {
            const hash = await onSend();
            toast.success('Transaction sent', { id: toastId });
            fireConfetti();
            console.info('tx hash', hash);
        }
        catch (error) {
            toast.error(error?.message || 'Transaction failed', { id: toastId });
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AnimatedButton, { onClick: handleClick, disabled: loading || disabled, className: className, children: loading ? 'Processing…' : label }));
}
