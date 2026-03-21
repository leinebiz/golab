import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { GoLabHeader } from '../components/GoLabHeader';
import { GoLabFooter } from '../components/GoLabFooter';
import { commonStyles, totalsStyles } from '../styles';
import { formatCurrency } from '../utils';

const quoteStyles = StyleSheet.create({
  termsBox: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 6,
  },
  termsText: {
    fontSize: 8,
    color: '#6B7280',
    lineHeight: 1.5,
  },
});

export interface QuoteLineItem {
  testName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuoteData {
  quoteNumber: string;
  date: string;
  validUntil: string;
  customer: {
    name: string;
    contactPerson: string;
    email: string;
    address: string;
  };
  lineItems: QuoteLineItem[];
  subtotal: number;
  expediteSurcharge?: number;
  logisticsFee?: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency?: string;
  terms?: string;
}

export function Quote({ data }: { data: QuoteData }) {
  const currency = data.currency ?? 'ZAR';

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <GoLabHeader documentType="Quotation" documentNumber={data.quoteNumber} date={data.date} />

        {/* Customer Info */}
        <View style={commonStyles.section}>
          <Text style={commonStyles.sectionTitle}>Bill To</Text>
          <Text style={[commonStyles.value, commonStyles.bold]}>{data.customer.name}</Text>
          <Text style={commonStyles.value}>{data.customer.contactPerson}</Text>
          <Text style={commonStyles.value}>{data.customer.email}</Text>
          <Text style={commonStyles.value}>{data.customer.address}</Text>
        </View>

        {/* Line Items */}
        <View style={commonStyles.section}>
          <Text style={commonStyles.sectionTitle}>Line Items</Text>
          <View style={commonStyles.tableHeader}>
            <Text style={[commonStyles.tableHeaderCell, { flex: 3 }]}>Test</Text>
            <Text style={[commonStyles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>
              Qty
            </Text>
            <Text style={[commonStyles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Unit Price
            </Text>
            <Text style={[commonStyles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
              Total
            </Text>
          </View>
          {data.lineItems.map((item, i) => (
            <View key={i} style={commonStyles.tableRow}>
              <Text style={[commonStyles.tableCell, { flex: 3 }]}>{item.testName}</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'center' }]}>
                {item.quantity}
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 1.5, textAlign: 'right' }]}>
                {formatCurrency(item.unitPrice, currency)}
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 1.5, textAlign: 'right' }]}>
                {formatCurrency(item.total, currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={totalsStyles.section}>
          <View style={totalsStyles.row}>
            <Text style={totalsStyles.label}>Subtotal</Text>
            <Text style={totalsStyles.value}>{formatCurrency(data.subtotal, currency)}</Text>
          </View>
          {data.expediteSurcharge != null && data.expediteSurcharge > 0 && (
            <View style={totalsStyles.row}>
              <Text style={totalsStyles.label}>Expedite Surcharge</Text>
              <Text style={totalsStyles.value}>
                {formatCurrency(data.expediteSurcharge, currency)}
              </Text>
            </View>
          )}
          {data.logisticsFee != null && data.logisticsFee > 0 && (
            <View style={totalsStyles.row}>
              <Text style={totalsStyles.label}>Logistics Fee</Text>
              <Text style={totalsStyles.value}>{formatCurrency(data.logisticsFee, currency)}</Text>
            </View>
          )}
          <View style={totalsStyles.row}>
            <Text style={totalsStyles.label}>VAT ({data.vatRate}%)</Text>
            <Text style={totalsStyles.value}>{formatCurrency(data.vatAmount, currency)}</Text>
          </View>
          <View style={[totalsStyles.row, totalsStyles.grandTotalRow]}>
            <Text style={totalsStyles.grandTotalLabel}>Total</Text>
            <Text style={totalsStyles.grandTotalValue}>{formatCurrency(data.total, currency)}</Text>
          </View>
        </View>

        {/* Validity & Terms */}
        <View style={quoteStyles.termsBox}>
          <Text style={quoteStyles.termsTitle}>Terms &amp; Conditions</Text>
          <Text style={quoteStyles.termsText}>Valid until: {data.validUntil}</Text>
          <Text style={quoteStyles.termsText}>
            {data.terms ??
              'Payment terms: 30 days from date of invoice. Prices are quoted in South African Rand (ZAR) and are exclusive of VAT unless otherwise stated. This quote is valid for 30 days from the date of issue.'}
          </Text>
        </View>

        <GoLabFooter />
      </Page>
    </Document>
  );
}
