import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import logoBase64 from "../logoBase64";
import whatsappIcon from "../whatsappIconBase64";

const styles = StyleSheet.create({
  page: {
    fontSize: 10,
    padding: 30,
    fontFamily: "Helvetica",
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
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
  },
  contactPhonesRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  contactPhoneText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  whatsappIcon: {
    width: 10,
    height: 10,
    marginRight: 4,
  },
  whatsappGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
});

function fmtFechaSafe(v) {
  try {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d)) return "";
    return format(d, "dd/MM/yyyy");
  } catch {
    return "";
  }
}

const NotaEnvioPDF = ({ data }) => {
  // Nuevo shape: { no_envio, direccion, cabecera, items }
  if (!data) return null;

  const { no_envio, direccion, cabecera, items } = data;

  const cliente = cabecera?.cliente ?? "";
  const contacto = cabecera?.contacto ?? "";
  const telefono = cabecera?.telefono ?? "";
  const fecha = fmtFechaSafe(cabecera?.fecha);
  const noCotizacion = cabecera?.nocotizacion ?? ""; // Ej: "CT1234"

  const productos = Array.isArray(items) ? items : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado con 3 columnas */}
        <View style={[styles.row, { alignItems: "center", marginBottom: 10 }]}>
          {/* Columna izquierda: logo */}
          <View style={{ width: "33%" }}>
            <Image src={logoBase64} style={{ width: 100 }} />
          </View>

          {/* Columna centro: contacto empresa */}
          <View style={{ width: "34%" }}>
            <Text style={[styles.title, { textAlign: "center" }]}>
              GP Excelencia S.A.
            </Text>
            <Text style={styles.contact}>ventas@gpexcelencia.com</Text>
            <Text style={styles.contact}>www.gpexcelencia.com</Text>
            <Text style={styles.contact}>
              11 Calle 41-21 Aldea "El Naranjo" Zona 6 de Mixco, Guatemala
            </Text>
            <View style={styles.contactPhonesRow}>
              <Text style={styles.contactPhoneText}>Tel: 2309-9419</Text>
              <View style={styles.whatsappGroup}>
                <Image src={whatsappIcon} style={styles.whatsappIcon} />
                <Text style={styles.contactPhoneText}>3595-5875</Text>
              </View>
            </View>
          </View>

          {/* Columna derecha: datos de la nota */}
          <View style={{ width: "33%", textAlign: "right" }}>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>
              NOTA DE ENVÍO
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "bold" }}>
              {noCotizacion ? `${noCotizacion} / Envío ${no_envio}` : `Envío ${no_envio}`}
            </Text>
          </View>
        </View>

        {/* Datos principales */}
        <View style={{ marginBottom: 10 }}>
          <Text>
            <Text style={styles.bold}>EMPRESA:</Text> {cliente}
          </Text>
          <Text>
            <Text style={styles.bold}>DIRECCIÓN:</Text> {direccion || "-"}
          </Text>
          <Text>
            <Text style={styles.bold}>FECHA:</Text> {fecha}
          </Text>
          <Text>
            <Text style={styles.bold}>CONTACTO:</Text> {contacto}
          </Text>
          <Text>
            <Text style={styles.bold}>TELÉFONO:</Text> {telefono}
          </Text>
        </View>

        {/* Encabezado de tabla */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 0.2 }]}>CANTIDAD</Text>
          <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>DESCRIPCIÓN</Text>
        </View>

        {/* Detalle de productos */}
        {productos.length === 0 ? (
          <Text>No hay registros para este envío.</Text>
        ) : (
          productos.map((item, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <Text>
                {item.cantidad} - {item.descripcion}
              </Text>
            </View>
          ))
        )}

        {/* Pie de página fijo */}
        <View style={styles.footer}>
          <Text style={styles.redText}>
            Verificar producto, no se aceptan cambios ni devoluciones.
          </Text>

          <Text>OBSERVACIÓN: ___________________________________________</Text>

          <View className="firmas" style={styles.signatureGroup}>
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
