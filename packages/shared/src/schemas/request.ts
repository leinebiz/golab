import { z } from 'zod';

export const CreateRequestSchema = z.object({
  tests: z
    .array(
      z.object({
        testCatalogueId: z.string().cuid(),
        sampleCount: z.number().int().min(1).max(1000),
        accreditationRequired: z.boolean().default(false),
        tolerance: z
          .object({
            minValue: z.number().optional(),
            maxValue: z.number().optional(),
            unit: z.string(),
            notes: z.string().max(500).optional(),
          })
          .optional(),
      }),
    )
    .min(1, 'At least one test is required'),
  collectionAddressId: z.string().cuid(),
  preferredLabId: z.string().cuid().optional(),
  turnaroundType: z.enum(['STANDARD', 'EXPEDITED']),
  specialInstructions: z.string().max(2000).optional(),
  sampleType: z.string().max(100).optional(),
});

export type CreateRequestInput = z.infer<typeof CreateRequestSchema>;

export const LogSampleIssueSchema = z
  .object({
    issueType: z.enum([
      'INSUFFICIENT_SAMPLE',
      'SAMPLE_DAMAGED',
      'INCORRECT_TEST_CHOSEN',
      'INCORRECT_PACKAGING',
      'OTHER',
    ]),
    comments: z.string().min(1).max(2000),
  })
  .refine((data) => data.issueType !== 'OTHER' || data.comments.length >= 10, {
    message: 'Detailed comments required when issue type is Other',
    path: ['comments'],
  });

export type LogSampleIssueInput = z.infer<typeof LogSampleIssueSchema>;

export const ReviewCertificateSchema = z
  .object({
    action: z.enum(['APPROVED', 'RETURNED_TO_LAB', 'ON_HOLD', 'REPLICATED_TO_GOLAB_FORMAT']),
    notes: z.string().max(2000).optional(),
  })
  .refine((data) => data.action === 'APPROVED' || (data.notes && data.notes.length >= 5), {
    message: 'Notes required when not approving',
    path: ['notes'],
  });

export type ReviewCertificateInput = z.infer<typeof ReviewCertificateSchema>;

export const CustomerActionSchema = z
  .object({
    action: z.enum(['ACCEPT_AND_CLOSE', 'RETEST', 'SEND_TO_ANOTHER_LAB', 'REQUEST_CALLBACK']),
    notes: z.string().max(2000).optional(),
  })
  .refine((data) => data.action === 'ACCEPT_AND_CLOSE' || (data.notes && data.notes.length >= 5), {
    message: 'Notes required for retest, lab change, or callback requests',
    path: ['notes'],
  });

export type CustomerActionInput = z.infer<typeof CustomerActionSchema>;
