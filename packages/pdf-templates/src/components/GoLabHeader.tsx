import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: '#2563EB',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  subtitle: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  docInfo: {
    alignItems: 'flex-end',
  },
  docType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  docNumber: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  docDate: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
});

interface GoLabHeaderProps {
  documentType: string;
  documentNumber?: string;
  date?: string;
}

export function GoLabHeader({ documentType, documentNumber, date }: GoLabHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>GL</Text>
        </View>
        <View>
          <Text style={styles.companyName}>GoLab</Text>
          <Text style={styles.subtitle}>B2B Laboratory Testing Services</Text>
        </View>
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docType}>{documentType}</Text>
        {documentNumber && <Text style={styles.docNumber}>{documentNumber}</Text>}
        {date && <Text style={styles.docDate}>{date}</Text>}
      </View>
    </View>
  );
}
