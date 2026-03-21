import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  pageNumber: {
    fontSize: 8,
    color: '#9CA3AF',
  },
});

interface GoLabFooterProps {
  companyInfo?: string;
}

export function GoLabFooter({
  companyInfo = 'GoLab (Pty) Ltd | Registration No. 2024/000000/07 | VAT: 4000000000',
}: GoLabFooterProps) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{companyInfo}</Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}
