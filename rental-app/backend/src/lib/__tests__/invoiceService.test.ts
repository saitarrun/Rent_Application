import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { Decimal } from '@prisma/client/runtime/library';
import { buildInvoicePayload, computeLateFee, shouldMarkOverdue } from '../invoiceService';

const baseProfile = {
  id: 1,
  name: 'QA Rentals',
  contact: 'qa@example.com',
  graceDays: 3,
  lateFeeType: 'fixed' as const,
  lateFeeValue: new Decimal(0),
  updatedAt: new Date()
};

describe('invoice service', () => {
  it('builds the first invoice period anchored on lease start', () => {
    const payload = buildInvoicePayload(
      {
        id: 'l1',
        startISO: '2024-01-01T00:00:00.000Z',
        endISO: '2024-12-31T00:00:00.000Z',
        dueDay: 5,
        monthlyRentEth: new Decimal(1)
      },
      baseProfile
    );
    expect(payload.periodStartISO).toContain('2024-01-01');
    expect(payload.periodEndISO).toContain('2024-01-31');
    expect(payload.dueISO).toContain('2024-01-05');
  });

  it('marks overdue after grace days', () => {
    const overdue = shouldMarkOverdue(dayjs().subtract(5, 'day').toISOString(), baseProfile);
    expect(overdue).toBe(true);
  });

  it('computes percentage late fees', () => {
    const fee = computeLateFee({ ...baseProfile, lateFeeType: 'percent', lateFeeValue: new Decimal(10) }, new Decimal(2), 2);
    expect(fee.toNumber()).toBeCloseTo(0.2);
  });
});
