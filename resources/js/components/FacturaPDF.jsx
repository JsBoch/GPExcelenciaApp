// src/components/FacturaPDF.jsx
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// Tamaños del footer (ajústalos si deseas aún más alto/ancho)
const FOOTER_IMG_H = 120;   // altura de la imagen (más alta)
const FOOTER_TEXT_H = 80;   // alto reservado para textos/cajas
const FOOTER_GAP = 8;       // separación entre textos e imagen
const FOOTER_H = FOOTER_TEXT_H + FOOTER_GAP + FOOTER_IMG_H; // altura total reservada

// —— Estilos ——
const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    fontSize: 9,
    fontFamily: "Helvetica",
    flexDirection: "column",
  },
  watermark: {
    position: "absolute",
    top: 280,
    left: "50%",
    transform: "translateX(-210px)",
    width: 420,
    opacity: 0.06,
  },
  headerRow: { flexDirection: "row", marginBottom: 8 },
  logoBox: { width: 120, justifyContent: "flex-start" },
  logo: { width: 120, height: 120, objectFit: "contain" },
  headerCenter: { flex: 1, textAlign: "center", justifyContent: "center" },
  headerRight: { width: 180, textAlign: "right" },

  box: { borderWidth: 1, borderColor: "#666", padding: 4 },

  clientBox: {
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 6,
    marginBottom: 10,
  },
  clientRow: { flexDirection: "row" },
  clientCol: { flex: 1 },

  table: { borderWidth: 1, borderColor: "#DDD" },
  tr: { flexDirection: "row" },
  th: {
    fontWeight: 700,
    backgroundColor: "#F4F4F4",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderColor: "#DDD",
  },
  td: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: "#EEE",
  },
  colCant: { width: 35, textAlign: "center" },
  colDesc: { flex: 1 },
  colNum: { width: 65, textAlign: "right" },

  // Footer anclado a los bordes de la HOJA (no del contenido)
  footerFixed: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,              // pegado al borde inferior de la página
    paddingHorizontal: 20,  // alinea textos con el contenido
    paddingBottom: 0,
  },
  footerLine: { marginBottom: 6 },
  footerTotalsRow: { flexDirection: "row", marginBottom: 8 },
  footerTotalsLeft: { flex: 1, paddingRight: 6 },
  footerTotalsRight: {
    width: 170,
    textAlign: "right",
    justifyContent: "center",
  },
  authRow: { flexDirection: "row", marginBottom: 6, columnGap: 10 },
  authCol: { flex: 1 },

  // Imagen a LO ANCHO de la hoja carta (saltando padding con márgenes negativos)
  footerImage: {
    width: "100%",
    height: FOOTER_IMG_H,
    objectFit: "cover",
    marginLeft: -20,  // cubre de borde a borde horizontal
    marginRight: -20,
  },
});

const money = (n) =>
  Number(isFinite(n) ? n : 0).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Props:
 * - cotizacion: { serie, numero, numero_autorizacion, fecha_emision, total, nit, nombre, direccion, numero_interno, total_en_letras }
 * - detalles: [{ cantidad, descripcion, precio, total }]
 * - images: { logoSrc, watermarkSrc, footerSrc }
 */
export default function FacturaPDF({ cotizacion, detalles, images }) {
  const { logoSrc, watermarkSrc, footerSrc } = images || {};

  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        {/* Marca de agua en TODAS las páginas */}
        {watermarkSrc ? (
          <Image src={watermarkSrc} style={styles.watermark} fixed />
        ) : null}

        {/* Encabezado */}
        <View style={styles.headerRow} wrap={false}>
          <View style={styles.logoBox}>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
          </View>

          <View style={styles.headerCenter}>
            <Text style={{ fontSize: 12, fontWeight: 700 }}>
              GP EXCELENCIA, S.A.
            </Text>
            <Text style={{ marginTop: 2 }}>Tel: 2309-9419 · 2294-9257</Text>
            <Text>
              11 calle, 41-20 Aldea “El Naranjito”, Zona 6 de Mixco, Guatemala
            </Text>
            <Text style={{ marginTop: 4 }}>
              Número Interno: {cotizacion?.numero_interno || ""}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <Text>DOCUMENTO TRIBUTARIO ELECTRÓNICO</Text>
            <Text style={{ fontWeight: 700, marginTop: 6, marginBottom: 2 }}>
              Factura Cambiaria Electrónica
            </Text>
            <Text>Serie: {cotizacion?.serie || ""}</Text>
            <Text>No.: {cotizacion?.numero || ""}</Text>
            <Text>Fecha Emisión: {cotizacion?.fecha_emision || ""}</Text>
            <Text style={{ marginTop: 6, fontWeight: 700 }}>NIT: 109126599</Text>
            <Text>GP Excelencia, Sociedad Anónima</Text>
          </View>
        </View>

        {/* Cliente */}
        <View style={styles.clientBox} wrap={false}>
          <View style={styles.clientRow}>
            <View style={styles.clientCol}>
              <Text>NIT: {cotizacion?.nit || ""}</Text>
            </View>
            <View style={styles.clientCol}>
              <Text>NOMBRE: {cotizacion?.nombre || ""}</Text>
            </View>
            <View style={styles.clientCol}>
              <Text>DIRECCIÓN: {cotizacion?.direccion || ""}</Text>
            </View>
          </View>
        </View>

        {/* Detalle */}
        <View style={styles.table}>
          {/* Header (se repite solo si parte de otra página) */}
          <View style={styles.tr} fixed>
            <Text style={[styles.th, styles.colCant]}>Cant.</Text>
            <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
            <Text style={[styles.th, styles.colNum]}>Precio</Text>
            <Text style={[styles.th, styles.colNum]}>Total</Text>
          </View>

          {(detalles || []).map((d, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, styles.colCant]}>
                {d.cantidad ?? ""}
              </Text>
              <Text style={[styles.td, styles.colDesc]}>
                {d.descripcion ?? ""}
              </Text>
              <Text style={[styles.td, styles.colNum]}>{money(d.precio)}</Text>
              <Text style={[styles.td, styles.colNum]}>{money(d.total)}</Text>
            </View>
          ))}
        </View>

        {/* Empujador para ocupar el alto disponible */}
        <View style={{ flexGrow: 1 }} />

        {/* Reserva de espacio SOLO en la última página (evita solaparse) */}
        <View
          render={({ pageNumber, totalPages }) =>
            pageNumber === totalPages ? <View style={{ height: FOOTER_H }} /> : null
          }
        />

        {/* Footer anclado SOLO en la última página */}
        <View
          fixed
          render={({ pageNumber, totalPages }) =>
            pageNumber === totalPages ? (
              <View style={[styles.footerFixed, { height: FOOTER_H }]} wrap={false}>
                {/* Bloque de textos (alto controlado) */}
                <View style={{ height: FOOTER_TEXT_H }}>
                  <Text style={[styles.footerLine, { fontWeight: 700 }]}>
                    Sujeto a Pagos Trimestrales
                  </Text>

                  {/* Total en letras + total numérico */}
                  <View style={styles.footerTotalsRow}>
                    <View style={styles.footerTotalsLeft}>
                      <Text style={{ fontWeight: 700, marginBottom: 2 }}>
                        Total en Letras
                      </Text>
                      <Text style={{ fontSize: 8 }}>
                        {cotizacion?.total_en_letras || ""}
                      </Text>
                    </View>
                    <View style={styles.footerTotalsRight}>
                      <Text style={{ fontWeight: 700, fontSize: 10 }}>
                        TOTAL Q. {money(cotizacion?.total ?? 0)}
                      </Text>
                    </View>
                  </View>

                  {/* Autorización + Fecha */}
                  <View style={styles.authRow}>
                    <View style={styles.authCol}>
                      <View style={styles.box}>
                        <Text>{cotizacion?.numero_autorizacion || ""}</Text>
                      </View>
                    </View>
                    <View style={styles.authCol}>
                      <View style={styles.box}>
                        <Text>{cotizacion?.fecha_emision || ""}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Separación y luego imagen a lo ancho de la hoja */}
                <View style={{ height: FOOTER_GAP }} />
                {footerSrc ? <Image src={footerSrc} style={styles.footerImage} /> : null}
              </View>
            ) : null
          }
        />
      </Page>
    </Document>
  );
}
