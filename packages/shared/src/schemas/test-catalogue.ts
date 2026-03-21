import { z } from 'zod';
import { TEST_CATEGORIES } from '../constants/enums';

export const CreateTestCatalogueSchema = z.object({
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20, 'Code must be at most 20 characters')
    .regex(/^[A-Z0-9-]+$/, 'Code must contain only uppercase letters, numbers, and hyphens'),
  name: z.string().min(2, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(TEST_CATEGORIES),
  accreditation: z.enum(['ACCREDITED', 'NON_ACCREDITED']),
  standardTatDays: z.number().int().min(1).max(365),
  expeditedTatDays: z.number().int().min(1).max(365).optional(),
  basePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid price with up to 2 decimal places'),
  expediteSurcharge: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid price with up to 2 decimal places')
    .optional(),
  toleranceApplicable: z.boolean().default(false),
  toleranceUnit: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
});

export type CreateTestCatalogueInput = z.infer<typeof CreateTestCatalogueSchema>;

export const UpdateTestCatalogueSchema = CreateTestCatalogueSchema.partial();

export type UpdateTestCatalogueInput = z.infer<typeof UpdateTestCatalogueSchema>;
