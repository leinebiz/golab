import { Button, Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/layout';

export interface ResultsReadyProps {
  customerName: string;
  requestRef: string;
  testCount: number;
  portalUrl: string;
}

export function ResultsReady({
  customerName = 'Customer',
  requestRef = 'REQ-000',
  testCount = 0,
  portalUrl = 'https://app.golab.co.za',
}: ResultsReadyProps) {
  return (
    <EmailLayout preview={`Test results ready for ${requestRef}`}>
      <Heading style={heading}>Results Ready</Heading>
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>
        The test results for request <strong>{requestRef}</strong> are now available in the GoLab
        portal.
      </Text>
      <Section style={highlightSection}>
        <Text style={highlightNumber}>{testCount}</Text>
        <Text style={highlightLabel}>test{testCount !== 1 ? 's' : ''} completed</Text>
      </Section>
      <Text style={text}>
        Log in to the portal to view your detailed results and download certificates.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={`${portalUrl}/customer/certificates`}>
          View Results
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default ResultsReady;

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

const highlightSection: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const highlightNumber: React.CSSProperties = {
  fontSize: '36px',
  fontWeight: 700,
  color: '#16a34a',
  margin: '0 0 4px',
};

const highlightLabel: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
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
