import { Button, Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/layout';

export interface SampleCollectedProps {
  customerName: string;
  requestRef: string;
  collectionDate: string;
  courierName: string;
  trackingNumber: string;
  portalUrl: string;
}

export function SampleCollected({
  customerName = 'Customer',
  requestRef = 'REQ-000',
  collectionDate = new Date().toLocaleDateString(),
  courierName = 'Courier',
  trackingNumber = 'N/A',
  portalUrl = 'https://app.golab.co.za',
}: SampleCollectedProps) {
  return (
    <EmailLayout preview={`Samples collected for ${requestRef}`}>
      <Heading style={heading}>Sample Collected</Heading>
      <Text style={text}>Hi {customerName},</Text>
      <Text style={text}>
        Your samples for request <strong>{requestRef}</strong> have been collected and are now in
        transit to the laboratory.
      </Text>
      <Section style={detailsSection}>
        <Text style={detailRow}>
          <strong>Collection Date:</strong> {collectionDate}
        </Text>
        <Text style={detailRow}>
          <strong>Courier:</strong> {courierName}
        </Text>
        <Text style={detailRow}>
          <strong>Tracking:</strong> {trackingNumber}
        </Text>
      </Section>
      <Text style={text}>
        You will be notified once the samples are delivered and accepted by the lab.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={`${portalUrl}/customer/requests`}>
          Track Request
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default SampleCollected;

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
  backgroundColor: '#f0f9ff',
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
