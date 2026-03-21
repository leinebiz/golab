import { Button, Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/layout';

export interface CreditApprovedProps {
  customerName: string;
  organizationName: string;
  creditLimit: string;
  paymentTerms: string;
  portalUrl: string;
}

export function CreditApproved({
  customerName = 'Customer',
  organizationName = 'Your Organization',
  creditLimit = 'R 0.00',
  paymentTerms = '30 days',
  portalUrl = 'https://app.golab.co.za',
}: CreditApprovedProps) {
  return (
    <EmailLayout preview={`Credit application approved for ${organizationName}`}>
      <Heading style={heading}>Credit Application Approved</Heading>
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>
        We are pleased to inform you that the credit application for{' '}
        <strong>{organizationName}</strong> has been approved.
      </Text>
      <Section style={detailsSection}>
        <Text style={detailRow}>
          <strong>Credit Limit:</strong> {creditLimit}
        </Text>
        <Text style={detailRow}>
          <strong>Payment Terms:</strong> {paymentTerms}
        </Text>
      </Section>
      <Text style={text}>
        You can now submit testing requests on credit. Invoices will be generated at the end of each
        billing cycle.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={`${portalUrl}/customer/requests/new`}>
          Submit a Request
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default CreditApproved;

const heading: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#1f2937',
  margin: '0 0 16px',
};

const text: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 12px',
};

const detailsSection: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const detailRow: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  margin: '4px 0',
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button: React.CSSProperties = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  padding: '12px 24px',
  textDecoration: 'none',
};
