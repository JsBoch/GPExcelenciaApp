import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, PDFViewer, PDFDownloadLink
} from '@react-pdf/renderer';

// 👇 NUEVO
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 9 },
  h1: { fontSize: 12, textAlign: 'center', marginBottom: 8, fontWeight: 'bold' },
  meta: { marginBottom: 8 },
  table: { display: 'flex', flexDirection: 'column' },
  theadRow: { flexDirection: 'row', backgroundColor: '#eee', borderBottomWidth: 1, borderColor: '#bdbdbd' },
  th: { padding: 3, fontWeight: 'bold', textAlign: 'center' },
  tbodyRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e0e0e0' },
  td: { padding: 3 },
  right: { textAlign: 'right' },
  center: { textAlign: 'center' },
  estadoTh: { fontSize: 8 },
  estadoTd: { fontSize: 8 },
  summaryBox: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f2f6ff',
    borderWidth: 1,
    borderColor: '#b9c6ff',
  },
  summaryLine: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  summaryLabel: { fontWeight: 'bold', fontSize: 11 },
  summaryValue: { fontWeight: 'bold', fontSize: 12 },
});

// Moneda compacta (para el PDF)
const fmtQ = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toDMY = (value) => {
  if (!value) return '';
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s.includes(' ') ? s.replace(' ', 'T') : s);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1, 10).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  return s;
};

const toDMYRange = (range) => {
  if (!range) return '';
  const m = String(range).trim().match(/^(\d{4}-\d{2}-\d{2})\s+a\s+(\d{4}-\d{2}-\d{2})$/);
  if (m) return `${toDMY(m[1])} a ${toDMY(m[2])}`;
  return range;
};

const Col = ({ w, children, style }) => <View style={[{ width: `${w}%` }, style]}>{children}</View>;

export const ReportePrefacturacionDoc = ({ data }) => {
  const { encabezado, rows = [], totales } = data || {};
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>{encabezado?.titulo || 'REPORTE'}</Text>
        <View style={styles.meta}>
          <Text>Rango: {toDMYRange(encabezado?.rango)}</Text>
          <Text>Vendedor: {encabezado?.vendedor}</Text>
          <Text>Generado: {encabezado?.generado}</Text>
        </View>

        {/* Tabla */}
        <View style={styles.table}>
          <View style={styles.theadRow}>
            <Col w={16}><Text style={styles.th}>Número</Text></Col>
            <Col w={14}><Text style={styles.th}>Fecha Prefact.</Text></Col>
            <Col w={26}><Text style={styles.th}>Cliente</Text></Col>
            <Col w={12}><Text style={styles.th}>Vendedor</Text></Col>
            {/* <Col w={10}><Text style={styles.th}>Tipo Pago</Text></Col> */}
            <Col w={12}><Text style={styles.th}>Total</Text></Col>
            <Col w={10}><Text style={[styles.th, styles.estadoTh]}>Estado</Text></Col>
          </View>

          {rows.map((r, i) => (
            <View key={i} style={styles.tbodyRow} wrap={false}>
              <Col w={16}><Text style={styles.td}>{r.nocotizacion}</Text></Col>
              <Col w={14}><Text style={styles.td}>{toDMY(r.fecha_prefacturacion)}</Text></Col>
              <Col w={26}><Text style={styles.td}>{r.cliente}</Text></Col>
              <Col w={12}><Text style={styles.td}>{r.vendedor || ''}</Text></Col>
              {/* <Col w={10}><Text style={styles.td}>{r.tipo_pago}</Text></Col> */}
              <Col w={12}><Text style={[styles.td, styles.right]}>{fmtQ.format(Number(r.total || 0))}</Text></Col>
              <Col w={10}><Text style={[styles.td, styles.estadoTd]}>{r.estado}</Text></Col>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Total General:</Text>
            <Text style={styles.summaryValue}>{fmtQ.format(Number(totales?.total_general || 0))}</Text>
          </View>
          <View style={[styles.summaryLine, { marginTop: 2 }]}>
            <Text style={styles.summaryLabel}>Registros:</Text>
            <Text style={styles.summaryValue}>{totales?.conteo || 0}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// 👇 NUEVO: función para exportar el mismo `data` a Excel
function exportToExcel(data) {
  if (!data) return;

  const { encabezado, rows = [], totales } = data;

  // Encabezado (en celdas superiores)
  const wsData = [
    [encabezado?.titulo || 'REPORTE DE COTIZACIONES (PREFACTURACIÓN)'],
    [`Rango: ${encabezado?.rango || ''}`],
    [`Vendedor: ${encabezado?.vendedor || ''}`],
    [`Generado: ${encabezado?.generado || ''}`],
    [],
    ['Número', 'Fecha Prefact.', 'Cliente', 'Vendedor', 'Tipo Pago', 'Total', 'Estado'],
    ...rows.map(r => [
      r.nocotizacion,
      // Si prefieres el DMY, puedes usar toDMY:
      toDMY(r.fecha_prefacturacion),
      r.cliente,
      r.vendedor || '',
      r.tipo_pago,
      Number(r.total || 0), // deja número para poder sumar/filtrar en Excel
      r.estado,
    ]),
    [],
    ['Total General', Number(totales?.total_general || 0)],
    ['Registros', Number(totales?.conteo || 0)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Opcional: ancho de columnas
  ws['!cols'] = [
    { wch: 14 }, // Número
    { wch: 14 }, // Fecha
    { wch: 36 }, // Cliente
    { wch: 22 }, // Vendedor
    { wch: 14 }, // Tipo Pago
    { wch: 14 }, // Total
    { wch: 14 }, // Estado
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Prefacturación');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([excelBuffer], { type: 'application/octet-stream' }),
    `cotizaciones_prefacturacion_${Date.now()}.xlsx`
  );
}

export default function ReportePrefacturacionPDF({ data, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
      <div style={{ width: '90%', height: '85%', background: '#fff', padding: 8, borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <PDFDownloadLink
            document={<ReportePrefacturacionDoc data={data} />}
            fileName={`cotizaciones_prefacturacion_${Date.now()}.pdf`}
            className="btn btn-primary"
          >
            {({ loading }) => (loading ? 'Preparando…' : 'Descargar PDF')}
          </PDFDownloadLink>

          {/* 👇 NUEVO: botón Excel */}
          <button className="btn btn-success" onClick={() => exportToExcel(data)}>
            Descargar Excel
          </button>

          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <PDFViewer width="100%" height="100%">
            <ReportePrefacturacionDoc data={data} />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
}
