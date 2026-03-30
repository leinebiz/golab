import { Document, Page, Text, View, StyleSheet, Svg, Rect } from '@react-pdf/renderer';
import { GoLabHeader } from '../components/GoLabHeader';
import { GoLabFooter } from '../components/GoLabFooter';
import { commonStyles } from '../styles';

const checkStyles = StyleSheet.create({
  category: {
    marginTop: 14,
    marginBottom: 6,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
    backgroundColor: '#F3F4F6',
    padding: 6,
    borderRadius: 3,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  itemText: {
    fontSize: 10,
    color: '#1F2937',
    flex: 1,
  },
  itemNote: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 2,
  },
  signOff: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: 200,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    marginBottom: 4,
    height: 30,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#6B7280',
  },
  intro: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 1.5,
  },
});

function Checkbox() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Rect
        x="0.5"
        y="0.5"
        width="13"
        height="13"
        rx="2"
        stroke="#9CA3AF"
        strokeWidth={1}
        fill="#FFFFFF"
      />
    </Svg>
  );
}

export interface ChecklistData {
  requestNumber: string;
  date: string;
  customerName: string;
  labName: string;
  tests: string[];
}

const CHECKLIST_ITEMS = [
  {
    category: 'Sample Preparation',
    items: [
      {
        text: 'Samples are correctly labelled with request reference number',
        note: 'Use permanent marker or adhesive labels',
      },
      { text: 'Samples are in appropriate containers (sealed, leak-proof)', note: null },
      {
        text: 'Sample quantity meets minimum requirements per test',
        note: 'Refer to test catalogue for minimum volumes/weights',
      },
      {
        text: 'Samples are stored at correct temperature (if applicable)',
        note: 'Keep refrigerated samples in insulated packaging',
      },
      { text: 'Chain of custody form completed (if applicable)', note: null },
    ],
  },
  {
    category: 'Documentation',
    items: [
      {
        text: 'Printed request form included with samples',
        note: 'Auto-generated from portal — do not handwrite',
      },
      {
        text: 'Waybill printed and attached to outer packaging',
        note: 'Courier will scan waybill at collection',
      },
      { text: 'Special instructions clearly noted on request form', note: null },
      {
        text: 'Tolerance specifications confirmed (if applicable)',
        note: 'Review tolerance values on portal before dispatch',
      },
      { text: 'Copy of quote or invoice included for reference', note: null },
    ],
  },
  {
    category: 'Packaging & Shipping',
    items: [
      {
        text: 'Outer packaging is sturdy and suitable for transit',
        note: 'Use double-walled cardboard or rigid containers',
      },
      { text: 'Fragile items individually wrapped with cushioning', note: null },
      {
        text: 'Hazardous materials labelled per shipping regulations',
        note: 'Include MSDS where required',
      },
      { text: 'Package is sealed and tamper-evident', note: null },
      { text: 'Return address and lab delivery address clearly visible', note: null },
    ],
  },
  {
    category: 'Before Courier Collection',
    items: [
      {
        text: 'Courier collection date/time confirmed on portal',
        note: 'Reschedule via portal if needed — do not call courier directly',
      },
      { text: 'Contact person available at collection address', note: null },
      { text: 'All items from this checklist verified complete', note: null },
    ],
  },
];

export function Checklist({ data }: { data: ChecklistData }) {
  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <GoLabHeader
          documentType="Sample Preparation Checklist"
          documentNumber={data.requestNumber}
          date={data.date}
        />

        <Text style={checkStyles.intro}>
          Please complete this checklist before dispatching samples for request {data.requestNumber}
          . Ensure all items are checked and the form is signed before handing over to the courier.
          Incomplete submissions may result in delays or sample rejection at the laboratory.
        </Text>

        <View style={commonStyles.twoColumn}>
          <View style={commonStyles.column}>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Customer</Text>
              <Text style={commonStyles.value}>{data.customerName}</Text>
            </View>
          </View>
          <View style={commonStyles.column}>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Destination Lab</Text>
              <Text style={commonStyles.value}>{data.labName}</Text>
            </View>
          </View>
        </View>

        {data.tests.length > 0 && (
          <View style={{ marginTop: 8, marginBottom: 4 }}>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Tests Requested</Text>
              <Text style={commonStyles.value}>{data.tests.join(', ')}</Text>
            </View>
          </View>
        )}

        {CHECKLIST_ITEMS.map((section) => (
          <View key={section.category} style={checkStyles.category}>
            <Text style={checkStyles.categoryTitle}>{section.category}</Text>
            {section.items.map((item, idx) => (
              <View key={idx} style={checkStyles.item}>
                <Checkbox />
                <View style={{ flex: 1 }}>
                  <Text style={checkStyles.itemText}>{item.text}</Text>
                  {item.note && <Text style={checkStyles.itemNote}>{item.note}</Text>}
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={checkStyles.signOff}>
          <View style={checkStyles.signatureBlock}>
            <View style={checkStyles.signatureLine} />
            <Text style={checkStyles.signatureLabel}>Prepared By (Name &amp; Signature)</Text>
          </View>
          <View style={checkStyles.signatureBlock}>
            <View style={checkStyles.signatureLine} />
            <Text style={checkStyles.signatureLabel}>Date</Text>
          </View>
        </View>

        <GoLabFooter />
      </Page>
    </Document>
  );
}
