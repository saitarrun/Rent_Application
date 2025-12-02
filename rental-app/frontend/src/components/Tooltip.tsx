import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

export function Tooltip({ content, children, side = 'top', delay = 200 }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let top = 0,
      left = 0;

    switch (side) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + gap;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + gap;
        break;
    }

    // Clamp to viewport
    const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
    const clampedTop = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));

    setPosition({ top: clampedTop, left: clampedLeft });
  };

  const handleOpen = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(true), delay);
  };

  const handleClose = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      window.addEventListener('scroll', handleClose);
      window.addEventListener('resize', calculatePosition);
      return () => {
        window.removeEventListener('scroll', handleClose);
        window.removeEventListener('resize', calculatePosition);
      };
    }
  }, [isOpen]);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
      className="inline-block"
    >
      {children}

      {isOpen && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className="fixed z-50 max-w-xs rounded-lg bg-foreground px-3 py-2 text-sm text-surface-1 shadow-lg pointer-events-none"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
