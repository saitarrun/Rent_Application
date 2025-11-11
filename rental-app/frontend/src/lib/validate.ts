import { z } from 'zod';

export const leaseWizardSchema = z.object({
  role: z.enum(['owner', 'tenant']).default('owner'),
  propertyName: z.string().min(1, 'Property name is required'),
  propertyAddress: z.string().min(1, 'Address is required'),
  tenantEmail: z.string().email('Valid tenant email required'),
  tenantEth: z.string().min(42, 'Tenant wallet required'),
  startISO: z.string(),
  endISO: z.string(),
  dueDay: z.number().min(1).max(31),
  monthlyRent: z.string().min(1),
  deposit: z.string().min(1),
  notes: z.string().optional()
});

export type LeaseWizardData = z.infer<typeof leaseWizardSchema>;

export function validateWizard(data: Partial<LeaseWizardData>) {
  return leaseWizardSchema.safeParse(data);
}
