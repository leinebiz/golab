import { z } from 'zod';

/**
 * Decimal string validator: accepts strings that look like valid decimal numbers.
 * Prices must be passed as strings to preserve financial precision.
 */
const decimalString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal with up to 2 decimal places');

export const CreateTestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with hyphens/underscores'),
  description: z.string().max(2000).optional(),
  category: z.string().min(1, 'Category is required').max(100),
  sampleType: z.string().min(1, 'Sample type is required').max(100),
  accreditation: z.enum(['ACCREDITED', 'NON_ACCREDITED']),
  basePrice: decimalString,
  standardTatDays: z.coerce.number().int().min(1, 'Must be at least 1 day'),
  expeditedTatDays: z.coerce.number().int().min(1).optional(),
  expediteSurchargePercent: z.coerce.number().min(0).max(100).optional(),
  toleranceApplicable: z.boolean().optional().default(false),
  toleranceUnit: z.string().max(50).optional(),
  isActive: z.boolean().optional().default(true),
});

export type CreateTestInput = z.input<typeof CreateTestSchema>;

export const UpdateTestSchema = CreateTestSchema.partial();

export type UpdateTestInput = z.input<typeof UpdateTestSchema>;
