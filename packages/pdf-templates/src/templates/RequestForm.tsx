import { Document, Page, Text, View } from '@react-pdf/renderer';
import { GoLabHeader } from '../components/GoLabHeader';
import { GoLabFooter } from '../components/GoLabFooter';
import { commonStyles } from '../styles';

export interface RequestFormTest {
  name: string;
  category: string;
  sampleType: string;
  tolerances?: string;
}

export interface RequestFormData {
  requestNumber: string;
  date: string;
  customer: {
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
  };
  lab: {
    name: string;
    accreditationNumber?: string;
    address: string;
  };
  tests: RequestFormTest[];
  specialInstructions?: string;
  expectedTurnaround?: string;
}

export function RequestForm({ data }: { data: RequestFormData }) {
  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <GoLabHeader
          documentType="Test Request Form"
          documentNumber={data.requestNumber}
          date={data.date}
        />

        {/* Customer & Lab Info */}
        <View style={commonStyles.twoColumn}>
          <View style={commonStyles.column}>
            <Text style={commonStyles.sectionTitle}>Customer Details</Text>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Company</Text>
              <Text style={commonStyles.value}>{data.customer.name}</Text>
            </View>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Contact</Text>
              <Text style={commonStyles.value}>{data.customer.contactPerson}</Text>
            </View>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Email</Text>
              <Text style={commonStyles.value}>{data.customer.email}</Text>
            </View>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Phone</Text>
              <Text style={commonStyles.value}>{data.customer.phone}</Text>
            </View>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Address</Text>
              <Text style={commonStyles.value}>{data.customer.address}</Text>
            </View>
          </View>

          <View style={commonStyles.column}>
            <Text style={commonStyles.sectionTitle}>Laboratory Assignment</Text>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Lab Name</Text>
              <Text style={commonStyles.value}>{data.lab.name}</Text>
            </View>
            {data.lab.accreditationNumber && (
              <View style={commonStyles.row}>
                <Text style={commonStyles.label}>Accreditation</Text>
                <Text style={commonStyles.value}>{data.lab.accreditationNumber}</Text>
              </View>
            )}
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Address</Text>
              <Text style={commonStyles.value}>{data.lab.address}</Text>
            </View>
          </View>
        </View>

        {/* Tests Table */}
        <View style={{ marginTop: 16 }}>
          <Text style={commonStyles.sectionTitle}>Requested Tests</Text>
          <View style={commonStyles.tableHeader}>
            <Text style={[commonStyles.tableHeaderCell, { flex: 2 }]}>Test Name</Text>
            <Text style={[commonStyles.tableHeaderCell, { flex: 1 }]}>Category</Text>
            <Text style={[commonStyles.tableHeaderCell, { flex: 1 }]}>Sample Type</Text>
            <Text style={[commonStyles.tableHeaderCell, { flex: 1.5 }]}>Tolerances</Text>
          </View>
          {data.tests.map((test, i) => (
            <View key={i} style={commonStyles.tableRow}>
              <Text style={[commonStyles.tableCell, { flex: 2 }]}>{test.name}</Text>
              <Text style={[commonStyles.tableCell, { flex: 1 }]}>{test.category}</Text>
              <Text style={[commonStyles.tableCell, { flex: 1 }]}>{test.sampleType}</Text>
              <Text style={[commonStyles.tableCell, { flex: 1.5 }]}>
                {test.tolerances ?? 'Standard'}
              </Text>
            </View>
          ))}
        </View>

        {/* Additional Info */}
        {data.specialInstructions && (
          <View style={{ marginTop: 16 }}>
            <Text style={commonStyles.sectionTitle}>Special Instructions</Text>
            <Text style={commonStyles.value}>{data.specialInstructions}</Text>
          </View>
        )}

        {data.expectedTurnaround && (
          <View style={commonStyles.row}>
            <Text style={[commonStyles.label, { fontWeight: 'bold' }]}>Expected Turnaround</Text>
            <Text style={commonStyles.value}>{data.expectedTurnaround}</Text>
          </View>
        )}

        <GoLabFooter />
      </Page>
    </Document>
  );
}
