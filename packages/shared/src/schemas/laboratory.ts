import { z } from 'zod';

export const CreateLaboratorySchema = z.object({
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20, 'Code must be at most 20 characters')
    .regex(/^[A-Z0-9-]+$/, 'Code must contain only uppercase letters, numbers, and hyphens'),
  name: z.string().min(2, 'Name is required').max(200),
  organizationId: z.string().min(1, 'Organization is required'),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(1, 'Address is required'),
  }),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().min(5, 'Phone number is required').max(20),
  isActive: z.boolean().default(true),
});

export type CreateLaboratoryInput = z.infer<typeof CreateLaboratorySchema>;

export const UpdateLaboratorySchema = CreateLaboratorySchema.partial();

export type UpdateLaboratoryInput = z.infer<typeof UpdateLaboratorySchema>;

export const LabTestMappingSchema = z.object({
  testCatalogueId: z.string().min(1),
  accreditation: z.enum(['ACCREDITED', 'NON_ACCREDITED']),
  labTatDays: z.number().int().min(1).max(365),
  labPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid price with up to 2 decimal places')
    .optional(),
  isActive: z.boolean().default(true),
});

export type LabTestMappingInput = z.infer<typeof LabTestMappingSchema>;

export const UpdateLabTestMappingsSchema = z.object({
  mappings: z.array(LabTestMappingSchema),
});

export type UpdateLabTestMappingsInput = z.infer<typeof UpdateLabTestMappingsSchema>;
