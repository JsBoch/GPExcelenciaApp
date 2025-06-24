import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import logoBase64 from "../logoBase64";
import whatsappIcon from "../whatsappIconBase64";
import { format } from "date-fns";

const styles = StyleSheet.create({
  page: {
    fontSize: 10,
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  contact: {
    textAlign: "center",
    fontSize: 9,
  },
  section: {
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bold: {
    fontWeight: "bold",
  },
  redText: {
    color: "red",
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
  },
  tableRow: {
    marginVertical: 2,
  },
  tableHeader: {
    marginTop: 10,
    marginBottom: 4,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
  },
  tableHeaderCell: {
    flex: 1,
    fontWeight: "bold",
  },
  line: {
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    width: "100%",
  },
  signatureGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  signatureBox: {
    textAlign: "center",
    width: "30%",
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
  },
  contactPhonesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  contactPhoneText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  whatsappIcon: {
    width: 10,
    height: 10,
    marginRight: 4,
  },
  whatsappGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const NotaEnvioPDF = ({ data }) => {
  if (!data || data.length === 0) return null;

  const encabezado = data[0];
  const productos = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado con 3 columnas */}
        <View style={[styles.row, { alignItems: "center", marginBottom: 10 }]}>
          {/* Columna izquierda: logo */}
          <View style={{ width: "33%" }}>
            <Image src={logoBase64} style={{ width: 100 }} />
          </View>

          {/* Columna centro: contacto */}
          <View style={{ width: "34%" }}>
            <Text style={[styles.title, { textAlign: "center" }]}>GP Excelencia S.A.</Text>
            <Text style={styles.contact}>ventas@gpexcelencia.com</Text>
            <Text style={styles.contact}>www.gpexcelencia.com</Text>
            <Text style={styles.contact}>11 Calle 41-21 Aldea "El Naranjo" Zona 6 de Mixco, Guatemala</Text>
            <View style={styles.contactPhonesRow}>
              <Text style={styles.contactPhoneText}>Tel: 2309-9419</Text>
              <View style={styles.whatsappGroup}>
                <Image src={whatsappIcon} style={styles.whatsappIcon} />
                <Text style={styles.contactPhoneText}>3595-5875</Text>
              </View>
            </View>
          </View>

          {/* Columna derecha: nota de envío */}
          <View style={{ width: "33%", textAlign: "right" }}>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>NOTA DE ENVÍO</Text>
            <Text style={{ fontSize: 12, fontWeight: "bold" }}>N° {encabezado.noenvio}</Text>
          </View>
        </View>

        {/* Datos principales alineados a la izquierda */}
        <View style={{ marginBottom: 10 }}>
          <Text><Text style={styles.bold}>EMPRESA:</Text> {encabezado.cliente}</Text>
          <Text><Text style={styles.bold}>DIRECCIÓN:</Text> {encabezado.direccion_entrega}</Text>
          <Text><Text style={styles.bold}>FECHA:</Text> {format(new Date(encabezado.fecha_cotizacion), 'dd/MM/yyyy')}</Text>
          <Text><Text style={styles.bold}>CONTACTO:</Text> {encabezado.contacto}</Text>
          <Text><Text style={styles.bold}>TELÉFONO:</Text> {encabezado.telefono}</Text>
        </View>

        {/* Encabezado de tabla */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>CANTIDAD</Text>
          <Text style={styles.tableHeaderCell}>DESCRIPCIÓN</Text>
        </View>

        {/* Detalle de productos */}
        {productos.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text>{item.cantidad} - {item.descripcion}</Text>
          </View>
        ))}

        {/* Pie de página fijo */}
        <View style={styles.footer}>
          <Text style={styles.redText}>
            Verificar producto, no se aceptan cambios ni devoluciones.
          </Text>

          <Text>OBSERVACIÓN: ___________________________________________</Text>

          <View style={styles.signatureGroup}>
            <View style={styles.signatureBox}>
              <View style={styles.line} />
              <Text>NOMBRE DE QUIEN RECIBE</Text>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.line} />
              <Text>FIRMA</Text>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.line} />
              <Text>HORA</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default NotaEnvioPDF;