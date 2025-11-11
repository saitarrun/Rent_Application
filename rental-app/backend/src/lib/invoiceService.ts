import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Decimal } from '@prisma/client/runtime/library';
import type { Profile } from '@prisma/client';

dayjs.extend(utc);

export interface LeaseSchedule {
  id: string;
  startISO: string;
  endISO: string;
  dueDay: number;
  monthlyRentEth: Decimal;
}

export interface InvoicePeriod {
  periodStartISO: string;
  periodEndISO: string;
  dueISO: string;
}

export function clampDueDay(date: dayjs.Dayjs, dueDay: number) {
  const maxDay = date.daysInMonth();
  const targetDay = Math.min(Math.max(dueDay, 1), maxDay);
  return date.date(targetDay);
}

export function nextPeriodStart(lastPeriodStartISO: string) {
  return dayjs.utc(lastPeriodStartISO).add(1, 'month').startOf('day');
}

export function buildPeriod(lease: LeaseSchedule, periodStart: dayjs.Dayjs): InvoicePeriod {
  const periodEnd = periodStart.add(1, 'month').subtract(1, 'day').endOf('day');
  const due = clampDueDay(periodStart, lease.dueDay).hour(12).minute(0).second(0);
  return {
    periodStartISO: periodStart.toISOString(),
    periodEndISO: periodEnd.toISOString(),
    dueISO: due.toISOString()
  };
}

export function computeLateFee(profile: Profile, base: Decimal, lateDays: number) {
  if (lateDays <= 0) return new Decimal(0);
  if (profile.lateFeeType === 'percent') {
    const percent = new Decimal(profile.lateFeeValue);
    return base.mul(percent).div(100);
  }
  return new Decimal(profile.lateFeeValue);
}

export function shouldMarkOverdue(dueISO: string, profile: Profile) {
  const due = dayjs.utc(dueISO);
  return dayjs.utc().isAfter(due.add(profile.graceDays, 'day'));
}

export function buildInvoicePayload(lease: LeaseSchedule, profile: Profile, periodStart?: string) {
  const start = periodStart ? dayjs.utc(periodStart) : dayjs.utc(lease.startISO).startOf('day');
  const period = buildPeriod(lease, start);
  return {
    ...period,
    amountEth: new Decimal(lease.monthlyRentEth),
    lateFeeEth: new Decimal(0)
  };
}
