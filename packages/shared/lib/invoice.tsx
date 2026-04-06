// packages/shared/lib/invoice.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Noto Sans',
  src: 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf',
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Noto Sans', fontSize: 10, color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f97316' },
  subtitle: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 6, color: '#374151' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 6,
    borderBottomWidth: 1, borderBottomColor: '#d1d5db', fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row', padding: 6, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb',
  },
  col1: { width: '40%' },
  col2: { width: '10%', textAlign: 'center' },
  col3: { width: '15%', textAlign: 'right' },
  col4: { width: '10%', textAlign: 'center' },
  col5: { width: '12.5%', textAlign: 'right' },
  col6: { width: '12.5%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  totalLabel: { width: '25%', textAlign: 'right', paddingRight: 10, fontWeight: 'bold' },
  totalValue: { width: '12.5%', textAlign: 'right' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#9ca3af' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginVertical: 12 },
});

interface InvoiceData {
  orderNumber: string;
  orderDate: string;
  customer: { name: string; phone: string; address: string; city: string; state: string; pincode: string };
  shop: { name: string; gstNumber: string | null; address?: string };
  items: Array<{
    name: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    total: number;
  }>;
  subtotal: number;
  gstAmount: number;
  shipping: number;
  discount: number;
  total: number;
  paymentMethod: string;
  razorpayPaymentId?: string;
}

export function GSTInvoice({ data }: { data: InvoiceData }) {
  const isSameState = true; // Simplified; in production, compare shop state vs customer state

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>TheHappyPets</Text>
            <Text style={styles.subtitle}>Tax Invoice / Bill of Supply</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontWeight: 'bold' }}>Invoice: {data.orderNumber}</Text>
            <Text style={styles.subtitle}>Date: {data.orderDate}</Text>
          </View>
        </View>

        {/* Seller & Buyer Info */}
        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
          <View style={{ width: '50%' }}>
            <Text style={styles.sectionTitle}>Sold By</Text>
            <Text>{data.shop.name}</Text>
            {data.shop.gstNumber && <Text>GSTIN: {data.shop.gstNumber}</Text>}
            {data.shop.address && <Text>{data.shop.address}</Text>}
          </View>
          <View style={{ width: '50%' }}>
            <Text style={styles.sectionTitle}>Ship To</Text>
            <Text>{data.customer.name}</Text>
            <Text>{data.customer.address}</Text>
            <Text>{data.customer.city}, {data.customer.state} - {data.customer.pincode}</Text>
            <Text>Phone: {data.customer.phone}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Items Table */}
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>Item</Text>
          <Text style={styles.col2}>Qty</Text>
          <Text style={styles.col3}>Unit Price (₹)</Text>
          <Text style={styles.col4}>GST %</Text>
          <Text style={styles.col5}>GST (₹)</Text>
          <Text style={styles.col6}>Total (₹)</Text>
        </View>

        {data.items.map((item, idx) => {
          const basePrice = item.unitPrice / (1 + item.gstRate / 100);
          const gstPerUnit = item.unitPrice - basePrice;
          const lineGst = gstPerUnit * item.quantity;

          return (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.col1}>
                {item.name}{item.variantName ? ` (${item.variantName})` : ''}
              </Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>{item.unitPrice.toFixed(2)}</Text>
              <Text style={styles.col4}>{item.gstRate}%</Text>
              <Text style={styles.col5}>{lineGst.toFixed(2)}</Text>
              <Text style={styles.col6}>{item.total.toFixed(2)}</Text>
            </View>
          );
        })}

        <View style={styles.divider} />

        {/* Totals */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text style={styles.totalValue}>₹{data.subtotal.toFixed(2)}</Text>
        </View>

        {/* GST Breakdown: CGST + SGST for same state, IGST for inter-state */}
        {isSameState ? (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>CGST:</Text>
              <Text style={styles.totalValue}>₹{(data.gstAmount / 2).toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SGST:</Text>
              <Text style={styles.totalValue}>₹{(data.gstAmount / 2).toFixed(2)}</Text>
            </View>
          </>
        ) : (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IGST:</Text>
            <Text style={styles.totalValue}>₹{data.gstAmount.toFixed(2)}</Text>
          </View>
        )}

        {data.discount > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Discount:</Text>
            <Text style={styles.totalValue}>-₹{data.discount.toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Shipping:</Text>
          <Text style={styles.totalValue}>
            {data.shipping === 0 ? 'FREE' : `₹${data.shipping.toFixed(2)}`}
          </Text>
        </View>

        <View style={[styles.totalRow, { marginTop: 8 }]}>
          <Text style={[styles.totalLabel, { fontSize: 13 }]}>Grand Total:</Text>
          <Text style={[styles.totalValue, { fontSize: 13, fontWeight: 'bold' }]}>
            ₹{data.total.toFixed(2)}
          </Text>
        </View>

        {/* Payment Info */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <Text style={styles.subtitle}>
            Payment: {data.paymentMethod.toUpperCase()}
            {data.razorpayPaymentId ? ` | Ref: ${data.razorpayPaymentId}` : ''}
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This is a computer-generated invoice. No signature required.{'\n'}
          TheHappyPets Marketplace • thehappypets.in • support@thehappypets.in
        </Text>
      </Page>
    </Document>
  );
}
