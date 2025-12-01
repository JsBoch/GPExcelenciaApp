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

const FOOTER_SPACE = 100; // espacio reservado solo en la última página (ajustado)

const styles = StyleSheet.create({
    page: {
        fontSize: 10,
        paddingTop: 30,
        paddingHorizontal: 30,
        paddingBottom: 30, // sin gran espacio aquí
        fontFamily: "Helvetica",
    },
    title: {
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 4,
    },
    contact: { textAlign: "center", fontSize: 9 },
    row: { flexDirection: "row", justifyContent: "space-between" },
    bold: { fontWeight: "bold" },

    redText: {
        color: "red",
        fontWeight: "bold",
        textAlign: "center",
        marginVertical: 4, // antes 10
    },

    tableRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 2,
        //borderBottomWidth: 0.5,
        //borderBottomColor: "#ccc",
        //borderBottomStyle: "solid",
    },
    tableHeader: {
        marginTop: 10,
        marginBottom: 4,
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        borderBottomStyle: "solid",
        paddingBottom: 2,
    },
    tableHeaderCell: { fontWeight: "bold" },

    line: {
        marginTop: 8, // antes 16
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        borderBottomStyle: "solid",
        width: "100%",
    },

    signatureGroup: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8, // antes 20
    },
    signatureBox: { textAlign: "center", width: "30%" },

    footer: {
        position: "absolute",
        bottom: 30,
        left: 30,
        right: 30,
    },
    footerSpacer: { height: FOOTER_SPACE },

    contactPhonesRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        marginTop: 4,
    },
    contactPhoneText: { fontSize: 10, fontWeight: "bold" },
    whatsappIcon: { width: 10, height: 10, marginRight: 4 },
    whatsappGroup: { flexDirection: "row", alignItems: "center" },

    qtyCol: {
        flex: 0.07,
        textAlign: "right",
        paddingRight: 6,
        //borderRightWidth: 0.5,
        //borderRightColor: "#ccc",
    },
    descCol: { flex: 0.93, paddingLeft: 6 },
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
            <Page size="A4" style={styles.page}>
                {/* Encabezado */}
                <View
                    style={[
                        styles.row,
                        { alignItems: "center", marginBottom: 10 },
                    ]}
                >
                    <View style={{ width: "33%" }}>
                        <Image src={logoBase64} style={{ width: 100 }} />
                    </View>

                    <View style={{ width: "34%" }}>
                        <Text style={[styles.title, { textAlign: "center" }]}>
                            GP Excelencia S.A.
                        </Text>
                        <Text style={styles.contact}>
                            ventas@gpexcelencia.com
                        </Text>
                        <Text style={styles.contact}>www.gpexcelencia.com</Text>
                        <Text style={styles.contact}>
                            11 Calle 41-21 Aldea "El Naranjo" Zona 6 de Mixco,
                            Guatemala
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
                        <Text style={{ fontSize: 14, fontWeight: "bold" }}>
                            NOTA DE ENVÍO
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: "bold" }}>
                            {noCotizacion
                                ? `${noCotizacion} / Envío ${no_envio}`
                                : `Envío ${no_envio}`}
                        </Text>
                    </View>
                </View>

                {/* Datos principales */}
                <View style={{ marginBottom: 10 }}>
                    <Text>
                        <Text style={styles.bold}>EMPRESA:</Text> {cliente}
                    </Text>
                    <Text>
                        <Text style={styles.bold}>DIRECCIÓN:</Text>{" "}
                        {direccion || "-"}
                    </Text>
                    <Text>
                        <Text style={styles.bold}>FECHA:</Text> {fecha}
                    </Text>
                    {/* <Text><Text style={styles.bold}>CONTACTO:</Text> {contacto}</Text>
                    <Text><Text style={styles.bold}>TELÉFONO:</Text> {telefono}</Text> */}
                    <Text>CONTACTO: {data.cabecera.contacto}</Text>
                    <Text>TELÉFONO: {data.cabecera.telefono}</Text>
                </View>

                {/* Tabla */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.qtyCol]}>
                        CANT.
                    </Text>
                    <Text style={[styles.tableHeaderCell, styles.descCol]}>
                        DESCRIPCIÓN
                    </Text>
                </View>

                {productos.length === 0 ? (
                    <Text>No hay registros para este envío.</Text>
                ) : (
                    productos.map((item, index) => (
                        <View key={index} style={styles.tableRow} wrap={false}>
                            <Text style={styles.qtyCol}>{Number(item.cantidad).toFixed(0)}</Text>
                            <Text style={styles.descCol}>
                                {item.descripcion}
                            </Text>
                        </View>
                    ))
                )}

                {/* Reserva SOLO al final */}
                <View style={styles.footerSpacer} />

                {/* Footer compacto */}
                <View style={styles.footer}>
                    <Text style={styles.redText}>
                        Verificar producto, no se aceptan cambios ni
                        devoluciones.
                    </Text>

                    <Text>
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

export default NotaEnvioPDF;
