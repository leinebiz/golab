import { z } from 'zod';

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  registrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  industry: z.string().optional(),
  preferredCommChannel: z.enum(['PORTAL', 'EMAIL', 'WHATSAPP']).optional(),
});

export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

export const CreateAddressSchema = z.object({
  type: z.enum(['BILLING', 'COLLECTION', 'DELIVERY', 'LAB_RECEIVING']),
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().default('ZA'),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  isDefault: z.boolean().default(false),
});

export type CreateAddressInput = z.infer<typeof CreateAddressSchema>;

export const InviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name is required'),
  role: z.enum([
    'CUSTOMER_ADMIN',
    'CUSTOMER_USER',
    'LAB_ADMIN',
    'LAB_TECHNICIAN',
  ]),
});

export type InviteUserInput = z.infer<typeof InviteUserSchema>;

export const DefaultToleranceSchema = z.object({
  testCatalogueId: z.string().cuid(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  unit: z.string().min(1, 'Unit is required'),
  notes: z.string().max(500).optional(),
});

export type DefaultToleranceInput = z.infer<typeof DefaultToleranceSchema>;
