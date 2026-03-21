import { z } from 'zod';

export const CreateLaboratorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with hyphens/underscores'),
  organizationId: z.string().min(1, 'Organization is required'),
  contactEmail: z.string().email('Must be a valid email'),
  contactPhone: z.string().min(1, 'Phone is required').max(30),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accreditationBody: z.string().max(200).optional(),
  accreditationNumber: z.string().max(100).optional(),
  isActive: z.boolean().optional().default(true),
});

export type CreateLaboratoryInput = z.input<typeof CreateLaboratorySchema>;

export const UpdateLaboratorySchema = CreateLaboratorySchema.partial();

export type UpdateLaboratoryInput = z.input<typeof UpdateLaboratorySchema>;

export const SetLabTestsSchema = z.object({
  tests: z.array(
    z.object({
      testCatalogueId: z.string().min(1),
      accreditation: z.enum(['ACCREDITED', 'NON_ACCREDITED']),
      labTatDays: z.coerce.number().int().min(1),
      labPrice: z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal')
        .optional(),
      isActive: z.boolean().optional().default(true),
    }),
  ),
});

export type SetLabTestsInput = z.input<typeof SetLabTestsSchema>;
