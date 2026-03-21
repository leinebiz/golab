import type { NotificationEventType } from '../types';
import { quoteReadyTemplate } from './quote-ready';
import { certificateReleasedTemplate } from './certificate-released';
import { paymentConfirmationTemplate } from './payment-confirmation';
import { creditDecisionTemplate } from './credit-decision';
import { invitationTemplate } from './invitation';
import { defaultTemplate } from './default';

type TemplateData = Record<string, unknown>;
type TemplateFn = (data: TemplateData) => string;

const templates: Partial<Record<NotificationEventType, TemplateFn>> = {
  'quote.ready': quoteReadyTemplate,
  'results.ready': certificateReleasedTemplate,
  'certificate.available': certificateReleasedTemplate,
  'payment.confirmed': paymentConfirmationTemplate,
  'credit.approved': creditDecisionTemplate,
  'credit.declined': creditDecisionTemplate,
};

export function getEmailTemplate(
  eventType: NotificationEventType,
  data: TemplateData,
): string {
  const templateFn = templates[eventType] ?? defaultTemplate;
  return templateFn({ ...data, eventType });
}

export { invitationTemplate };
