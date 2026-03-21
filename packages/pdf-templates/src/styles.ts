import { StyleSheet } from '@react-pdf/renderer';

/** Shared styles used across all PDF templates */
export const commonStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1F2937',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  label: {
    fontSize: 9,
    color: '#6B7280',
    width: 120,
  },
  value: {
    fontSize: 10,
    color: '#1F2937',
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    fontSize: 9,
    color: '#1F2937',
  },
  bold: {
    fontWeight: 'bold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginVertical: 12,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 24,
  },
  column: {
    flex: 1,
  },
});

/** Shared styles for totals sections used in Quote and Invoice */
export const totalsStyles = StyleSheet.create({
  section: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#D1D5DB',
    alignItems: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 250,
    paddingVertical: 3,
  },
  label: {
    fontSize: 10,
    color: '#6B7280',
    width: 140,
    textAlign: 'right',
    paddingRight: 12,
  },
  value: {
    fontSize: 10,
    color: '#1F2937',
    width: 110,
    textAlign: 'right',
  },
  grandTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#2563EB',
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    width: 140,
    textAlign: 'right',
    paddingRight: 12,
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563EB',
    width: 110,
    textAlign: 'right',
  },
});
