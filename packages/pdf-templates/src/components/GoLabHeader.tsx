import { View, Text, StyleSheet, Svg, Rect, Circle, Path } from '@react-pdf/renderer';

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
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  companyNameAccent: {
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

function LogoMark() {
  return (
    <Svg width={40} height={40} viewBox="0 0 52 52">
      <Rect x="0" y="0" width="52" height="52" rx="10" fill="#2563EB" />
      {/* Flask body */}
      <Path
        d="M18 10h16v8l6 16a4 4 0 01-3.8 5.2H15.8A4 4 0 0112 34l6-16v-8z"
        fill="#ffffff"
        opacity={0.95}
      />
      {/* Flask neck */}
      <Rect x="21" y="10" width="10" height="4" rx="1" fill="#2563EB" />
      {/* Bubbles */}
      <Circle cx="24" cy="30" r="3" fill="#2563EB" opacity={0.6} />
      <Circle cx="30" cy="26" r="2" fill="#3B82F6" opacity={0.5} />
      <Circle cx="26" cy="34" r="1.5" fill="#60A5FA" opacity={0.7} />
    </Svg>
  );
}

interface GoLabHeaderProps {
  documentType: string;
  documentNumber?: string;
  date?: string;
}

export function GoLabHeader({ documentType, documentNumber, date }: GoLabHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <LogoMark />
        <View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={styles.companyName}>Go</Text>
            <Text style={styles.companyNameAccent}>Lab</Text>
          </View>
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
