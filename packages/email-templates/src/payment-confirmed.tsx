import { Button, Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/layout';

export interface PaymentConfirmedProps {
  customerName: string;
  requestRef: string;
  amountPaid: string;
  paymentDate: string;
  portalUrl: string;
}

export function PaymentConfirmed({
  customerName = 'Customer',
  requestRef = 'REQ-000',
  amountPaid = 'R 0.00',
  paymentDate = new Date().toLocaleDateString(),
  portalUrl = 'https://app.golab.co.za',
}: PaymentConfirmedProps) {
  return (
    <EmailLayout preview={`Payment confirmed for ${requestRef}`}>
      <Heading style={heading}>Payment Confirmed</Heading>
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>
        We have received your payment for request <strong>{requestRef}</strong>. Testing will begin
        shortly.
      </Text>
      <Section style={detailsSection}>
        <Text style={detailRow}>
          <strong>Request:</strong> {requestRef}
        </Text>
        <Text style={detailRow}>
          <strong>Amount Paid:</strong> {amountPaid}
        </Text>
        <Text style={detailRow}>
          <strong>Date:</strong> {paymentDate}
        </Text>
      </Section>
      <Section style={buttonContainer}>
        <Button style={button} href={`${portalUrl}/customer/requests`}>
          View Request
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default PaymentConfirmed;

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
