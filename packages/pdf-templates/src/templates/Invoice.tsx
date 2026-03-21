import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { GoLabHeader } from '../components/GoLabHeader';
import { GoLabFooter } from '../components/GoLabFooter';
import { commonStyles, totalsStyles } from '../styles';
import { formatCurrency } from '../utils';

const invoiceStyles = StyleSheet.create({
  paymentBox: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  paymentTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 6,
  },
  paymentText: {
    fontSize: 9,
    color: '#1E3A5F',
    lineHeight: 1.5,
  },
  dueDateBanner: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FCD34D',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDateLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400E',
  },
  dueDateValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400E',
  },
});

export interface InvoiceLineItem {
  testName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  quoteNumber?: string;
  date: string;
  dueDate: string;
  customer: {
    name: string;
    contactPerson: string;
    email: string;
    address: string;
  };
  lineItems: InvoiceLineItem[];
  subtotal: number;
  expediteSurcharge?: number;
  logisticsFee?: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency?: string;
  paymentInstructions?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchCode: string;
    reference: string;
  };
}

export function Invoice({ data }: { data: InvoiceData }) {
  const currency = data.currency ?? 'ZAR';

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <GoLabHeader
          documentType="Tax Invoice"
          documentNumber={data.invoiceNumber}
          date={data.date}
        />

        {/* Customer & Reference Info */}
        <View style={commonStyles.twoColumn}>
          <View style={commonStyles.column}>
            <Text style={commonStyles.sectionTitle}>Bill To</Text>
            <Text style={[commonStyles.value, commonStyles.bold]}>{data.customer.name}</Text>
            <Text style={commonStyles.value}>{data.customer.contactPerson}</Text>
            <Text style={commonStyles.value}>{data.customer.email}</Text>
            <Text style={commonStyles.value}>{data.customer.address}</Text>
          </View>
          <View style={commonStyles.column}>
            <Text style={commonStyles.sectionTitle}>Invoice Details</Text>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Invoice No.</Text>
              <Text style={commonStyles.value}>{data.invoiceNumber}</Text>
            </View>
            {data.quoteNumber && (
              <View style={commonStyles.row}>
                <Text style={commonStyles.label}>Quote Ref.</Text>
                <Text style={commonStyles.value}>{data.quoteNumber}</Text>
              </View>
            )}
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Date</Text>
              <Text style={commonStyles.value}>{data.date}</Text>
            </View>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Due Date</Text>
              <Text style={[commonStyles.value, commonStyles.bold]}>{data.dueDate}</Text>
            </View>
          </View>
        </View>

        {/* Line Items */}
        <View style={{ marginTop: 16 }}>
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
            <Text style={totalsStyles.grandTotalLabel}>Total Due</Text>
            <Text style={totalsStyles.grandTotalValue}>{formatCurrency(data.total, currency)}</Text>
          </View>
        </View>

        {/* Due Date Banner */}
        <View style={invoiceStyles.dueDateBanner}>
          <Text style={invoiceStyles.dueDateLabel}>Payment Due By</Text>
          <Text style={invoiceStyles.dueDateValue}>{data.dueDate}</Text>
        </View>

        {/* Payment Instructions */}
        {data.paymentInstructions && (
          <View style={invoiceStyles.paymentBox}>
            <Text style={invoiceStyles.paymentTitle}>Payment Instructions</Text>
            <Text style={invoiceStyles.paymentText}>Bank: {data.paymentInstructions.bankName}</Text>
            <Text style={invoiceStyles.paymentText}>
              Account Name: {data.paymentInstructions.accountName}
            </Text>
            <Text style={invoiceStyles.paymentText}>
              Account No: {data.paymentInstructions.accountNumber}
            </Text>
            <Text style={invoiceStyles.paymentText}>
              Branch Code: {data.paymentInstructions.branchCode}
            </Text>
            <Text style={invoiceStyles.paymentText}>
              Reference: {data.paymentInstructions.reference}
            </Text>
          </View>
        )}

        <GoLabFooter />
      </Page>
    </Document>
  );
}
