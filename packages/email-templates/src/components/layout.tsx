import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        {/* Blue header */}
        <Section style={header}>
          <Container style={headerContainer}>
            <Text style={logo}>GoLab</Text>
          </Container>
        </Section>

        {/* White body */}
        <Container style={container}>{children}</Container>

        {/* Gray footer */}
        <Section style={footer}>
          <Container style={footerContainer}>
            <Hr style={hr} />
            <Text style={footerText}>
              This is an automated notification from GoLab. Please do not reply to this email.
            </Text>
            <Text style={footerText}>GoLab - Laboratory Testing Services</Text>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const header: React.CSSProperties = {
  backgroundColor: '#2563eb',
  padding: '20px 0',
};

const headerContainer: React.CSSProperties = {
  maxWidth: '580px',
  margin: '0 auto',
  padding: '0 20px',
};

const logo: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 700,
  margin: 0,
};

const container: React.CSSProperties = {
  maxWidth: '580px',
  margin: '0 auto',
  padding: '32px 20px',
  backgroundColor: '#ffffff',
};

const footer: React.CSSProperties = {
  padding: '20px 0',
};

const footerContainer: React.CSSProperties = {
  maxWidth: '580px',
  margin: '0 auto',
  padding: '0 20px',
};

const hr: React.CSSProperties = {
  borderColor: '#e6ebf1',
  margin: '16px 0',
};

const footerText: React.CSSProperties = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '4px 0',
};
