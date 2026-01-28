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

const FOOTER_SPACE = 70; // más pequeño que A4

const styles = StyleSheet.create({
    page: {
        fontSize: 9,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
        fontFamily: "Helvetica",
    },

    row: { flexDirection: "row", justifyContent: "space-between" },
    bold: { fontWeight: "bold" },

    title: {
        fontSize: 11,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 2,
    },

    contact: { textAlign: "center", fontSize: 8 },

    redText: {
        color: "red",
        fontWeight: "bold",
        textAlign: "center",
        marginVertical: 3,
        fontSize: 8,
    },

    tableHeader: {
        marginTop: 6,
        marginBottom: 3,
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        paddingBottom: 2,
    },

    tableRow: {
        flexDirection: "row",
        paddingVertical: 1.5,
    },

    qtyCol: {
        flex: 0.1,
        textAlign: "right",
        paddingRight: 4,
    },

    descCol: {
        flex: 0.9,
        paddingLeft: 4,
    },

    line: {
        marginTop: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        width: "100%",
    },

    signatureGroup: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 6,
    },

    signatureBox: {
        textAlign: "center",
        width: "30%",
        fontSize: 8,
    },

    footer: {
        position: "absolute",
        bottom: 20,
        left: 20,
        right: 20,
    },

    footerSpacer: {
        height: FOOTER_SPACE,
    },

    contactPhonesRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        marginTop: 2,
    },

    contactPhoneText: {
        fontSize: 8,
        fontWeight: "bold",
    },

    whatsappIcon: {
        width: 8,
        height: 8,
        marginRight: 3,
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

const NotaEnvioPDFHalf = ({ data }) => {
    if (!data) return null;

    const { no_envio, direccion, cabecera, items } = data;

    const productos = Array.isArray(items) ? items : [];
    const fecha = fmtFechaSafe(cabecera?.fecha);

    return (
        <Document>
            <Page size={[396, 612]} style={styles.page}>
                {/* ===== HEADER (MISMO QUE A4, ESCALADO) ===== */}
                <View style={[styles.row, { alignItems: "center", marginBottom: 6 }]}>
                    <View style={{ width: "33%" }}>
                        <Image src={logoBase64} style={{ width: 70 }} />
                    </View>

                    <View style={{ width: "34%" }}>
                        <Text style={styles.title}>GP Excelencia S.A.</Text>
                        <Text style={styles.contact}>ventas@gpexcelencia.com</Text>
                        <Text style={styles.contact}>www.gpexcelencia.com</Text>
                        <Text style={styles.contact}>
                            11 Calle 41-21 Aldea "El Naranjo" Zona 6 de Mixco
                        </Text>
                        <View style={styles.contactPhonesRow}>
                            <Text style={styles.contactPhoneText}>
                                Tel: 2309-9419
                            </Text>
                            <View style={styles.whatsappGroup}>
                                <Image
                                    src={whatsappIcon}
                                    style={styles.whatsappIcon}
                                />
                                <Text style={styles.contactPhoneText}>
                                    3595-5875
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ width: "33%", textAlign: "right" }}>
                        <Text style={{ fontSize: 11, fontWeight: "bold" }}>
                            NOTA DE ENVÍO
                        </Text>
                        <Text style={{ fontSize: 9, fontWeight: "bold" }}>
                            {cabecera?.nocotizacion
                                ? `${cabecera.nocotizacion} / Envío ${no_envio}`
                                : `Envío ${no_envio}`}
                        </Text>
                    </View>
                </View>

                {/* ===== DATOS ===== */}
                <View style={{ marginBottom: 6 }}>
                    <Text>
                        <Text style={styles.bold}>EMPRESA:</Text>{" "}
                        {cabecera?.cliente}
                    </Text>
                    <Text>
                        <Text style={styles.bold}>DIRECCIÓN:</Text>{" "}
                        {direccion || "-"}
                    </Text>
                    <Text>
                        <Text style={styles.bold}>FECHA:</Text> {fecha}
                    </Text>
                    <Text>CONTACTO: {cabecera?.contacto || "-"}</Text>
                    <Text>TELÉFONO: {cabecera?.telefono || "-"}</Text>
                </View>

                {/* ===== TABLA ===== */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.bold, styles.qtyCol]}>CANT.</Text>
                    <Text style={[styles.bold, styles.descCol]}>
                        DESCRIPCIÓN
                    </Text>
                </View>

                {productos.length === 0 ? (
                    <Text>No hay registros para este envío.</Text>
                ) : (
                    productos.map((item, index) => (
                        <View key={index} style={styles.tableRow} wrap={false}>
                            <Text style={styles.qtyCol}>
                                {Number(item.cantidad).toFixed(0)}
                            </Text>
                            <Text style={styles.descCol}>
                                {item.descripcion}
                            </Text>
                        </View>
                    ))
                )}

                {/* ===== RESERVA FOOTER ===== */}
                <View style={styles.footerSpacer} />

                {/* ===== FOOTER (IGUAL QUE A4, ESCALADO) ===== */}
                <View style={styles.footer}>
                    <Text style={styles.redText}>
                        Verificar producto, no se aceptan cambios ni devoluciones.
                    </Text>

                    <Text style={{ fontSize: 8 }}>
                        OBSERVACIÓN: ___________________________________________
                    </Text>

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

export default NotaEnvioPDFHalf;
