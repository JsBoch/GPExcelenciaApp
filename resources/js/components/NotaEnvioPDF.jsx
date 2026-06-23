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

const BLUE = "#005f8f";
const FOOTER_SPACE = 110;

const logoSrc = "/images/LogoGPv3.jpg";
const watermarkSrc = "/images/marcagua_pg.png";
const whatsappSrc = "/images/whatsapp.png";

const styles = StyleSheet.create({
    page: {
        fontSize: 10,
        paddingTop: 35,
        paddingHorizontal: 35,
        paddingBottom: 35,
        fontFamily: "Helvetica",
        position: "relative",
    },

    watermark: {
        position: "absolute",
        width: 420,
        opacity: 0.12,
        top: 285,
        left: 95,
    },

    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 20,
    },

    logoBox: {
        width: "28%",
    },

    logo: {
        width: 115,
    },

    companyBox: {
        width: "44%",
        alignItems: "center",
    },

    noteBox: {
        width: "28%",
        alignItems: "flex-end",
        paddingTop: 30,
    },

    contact: {
        color: BLUE,
        fontSize: 9,
        textAlign: "center",
        fontWeight: "bold",
        lineHeight: 1.25,
    },

    noteTitle: {
        color: BLUE,
        fontSize: 15,
        fontWeight: "bold",
    },

    noteNumber: {
        color: BLUE,
        fontSize: 10,
        fontWeight: "bold",
        marginTop: 4,
    },

    dataBox: {
        marginTop: 5,
        marginBottom: 18,
    },

    dataText: {
        fontSize: 10,
        marginBottom: 2,
        color: "#000",
    },

    label: {
        color: BLUE,
        fontWeight: "bold",
    },

    tableHeader: {
        flexDirection: "row",
        borderBottomWidth: 2,
        borderBottomColor: BLUE,
        paddingBottom: 3,
        marginBottom: 5,
    },

    tableHeaderCell: {
        color: BLUE,
        fontWeight: "bold",
        fontSize: 10,
    },

    tableRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 2,
    },

    qtyCol: {
        width: "12%",
        textAlign: "left",
        paddingRight: 8,
    },

    descCol: {
        width: "88%",
    },

    detailText: {
        color: "#000",
        fontSize: 10,
        lineHeight: 1.25,
    },

    footerSpacer: {
        height: FOOTER_SPACE,
    },

    footer: {
        position: "absolute",
        bottom: 35,
        left: 35,
        right: 35,
    },

    redText: {
        color: "red",
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 10,
    },

    observationRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
    },

    observationLabel: {
        color: BLUE,
        fontWeight: "bold",
        fontSize: 10,
    },

    observationLine: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: BLUE,
        marginLeft: 5,
    },

    signatureGroup: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    signatureBox: {
        width: "30%",
        alignItems: "center",
    },

    line: {
        borderBottomWidth: 1,
        borderBottomColor: BLUE,
        width: "100%",
        marginBottom: 4,
    },

    signatureText: {
        color: BLUE,
        fontWeight: "bold",
        fontSize: 9,
        textAlign: "center",
    },

    whatsappIcon: {
        width: 10,
        height: 10,
        marginVertical: 1,
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
    if (!data) return null;

    const { no_envio, direccion, cabecera, items } = data;

    const cliente = cabecera?.cliente ?? "";
    const contacto = cabecera?.contacto ?? "";
    const telefono = cabecera?.telefono ?? "";
    const fecha = fmtFechaSafe(cabecera?.fecha);
    const noCotizacion = cabecera?.nocotizacion ?? "";
    const productos = Array.isArray(items) ? items : [];

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                <Image src={watermarkSrc} style={styles.watermark} fixed />

                <View style={styles.header}>
                    <View style={styles.logoBox}>
                        <Image src={logoSrc} style={styles.logo} />
                    </View>

                    <View style={styles.companyBox}>
                        <Text style={styles.contact}>
                            11 calle, 41-20 Aldea “El Naranjito”,
                        </Text>
                        <Text style={styles.contact}>
                            Zona 6 de Mixco, Guatemala
                        </Text>
                        <Text style={styles.contact}>
                            Tel: 2309-9419  2294-9257
                        </Text>

                        <Image src={whatsappSrc} style={styles.whatsappIcon} />

                        <Text style={styles.contact}>3595-5875</Text>
                        <Text style={styles.contact}>
                            Ventas: servicioalcliente@gpexcelencia.com
                        </Text>
                        <Text style={styles.contact}>
                            Contabilidad: creditos@gpexcelencia.com
                        </Text>
                        <Text style={styles.contact}>
                            Número Interno: GP-20234610-10812
                        </Text>
                    </View>

                    <View style={styles.noteBox}>
                        <Text style={styles.noteTitle}>NOTA DE ENVIO</Text>
                        <Text style={styles.noteNumber}>
                            {noCotizacion
                                ? `${noCotizacion} / Envío ${no_envio}`
                                : `Envío ${no_envio}`}
                        </Text>
                    </View>
                </View>

                <View style={styles.dataBox}>
                    <Text style={styles.dataText}>
                        <Text style={styles.label}>EMPRESA: </Text>
                        {cliente}
                    </Text>
                    <Text style={styles.dataText}>
                        <Text style={styles.label}>DIRECCIÓN: </Text>
                        {direccion || "-"}
                    </Text>
                    <Text style={styles.dataText}>
                        <Text style={styles.label}>FECHA: </Text>
                        {fecha}
                    </Text>
                    <Text style={styles.dataText}>
                        <Text style={styles.label}>CONTACTO: </Text>
                        {contacto}
                    </Text>
                    <Text style={styles.dataText}>
                        <Text style={styles.label}>TELÉFONO: </Text>
                        {telefono}
                    </Text>
                </View>

                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.qtyCol]}>
                        CANT.
                    </Text>
                    <Text style={[styles.tableHeaderCell, styles.descCol]}>
                        DESCRIPCIÓN
                    </Text>
                </View>

                {productos.length === 0 ? (
                    <Text style={styles.detailText}>
                        No hay registros para este envío.
                    </Text>
                ) : (
                    productos.map((item, index) => (
                        <View key={index} style={styles.tableRow} wrap={false}>
                            <Text style={[styles.qtyCol, styles.detailText]}>
                                {Number(item.cantidad).toFixed(0)}
                            </Text>
                            <Text style={[styles.descCol, styles.detailText]}>
                                {item.descripcion}
                            </Text>
                        </View>
                    ))
                )}

                <View style={styles.footerSpacer} />

                <View style={styles.footer}>
                    <Text style={styles.redText}>
                        Verificar producto, no se aceptan cambios ni devoluciones.
                    </Text>

                    <View style={styles.observationRow}>
                        <Text style={styles.observationLabel}>
                            OBSERVACIÓN:
                        </Text>
                        <View style={styles.observationLine} />
                    </View>

                    <View style={styles.signatureGroup}>
                        <View style={styles.signatureBox}>
                            <View style={styles.line} />
                            <Text style={styles.signatureText}>
                                NOMBRE DE QUIEN RECIBE
                            </Text>
                        </View>

                        <View style={styles.signatureBox}>
                            <View style={styles.line} />
                            <Text style={styles.signatureText}>FIRMA</Text>
                        </View>

                        <View style={styles.signatureBox}>
                            <View style={styles.line} />
                            <Text style={styles.signatureText}>HORA</Text>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
};

export default NotaEnvioPDF;