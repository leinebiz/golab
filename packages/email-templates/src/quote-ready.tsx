import { Button, Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/layout';

export interface QuoteReadyProps {
  customerName: string;
  requestRef: string;
  totalAmount: string;
  portalUrl: string;
}

export function QuoteReady({
  customerName = 'Customer',
  requestRef = 'REQ-000',
  totalAmount = 'R 0.00',
  portalUrl = 'https://app.golab.co.za',
}: QuoteReadyProps) {
  return (
    <EmailLayout preview={`Your quote for ${requestRef} is ready for review`}>
      <Heading style={heading}>Quote Ready for Review</Heading>
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>
        Your quote for request <strong>{requestRef}</strong> has been calculated and is ready for
        your review.
      </Text>
      <Section style={amountSection}>
        <Text style={amountLabel}>Quoted Amount</Text>
        <Text style={amount}>{totalAmount}</Text>
      </Section>
      <Text style={text}>Please review the quote details and accept to proceed with testing.</Text>
      <Section style={buttonContainer}>
        <Button style={button} href={`${portalUrl}/customer/requests`}>
          Review Quote
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default QuoteReady;

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

const amountSection: React.CSSProperties = {
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const amountLabel: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const amount: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#2563eb',
  margin: 0,
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
