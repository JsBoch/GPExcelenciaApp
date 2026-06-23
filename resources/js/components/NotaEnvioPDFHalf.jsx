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

const BLUE = "#005B8F";

const logoSrc = "/images/LogoGPv3.jpg";
const watermarkSrc = "/images/marcagua_gp.png";
const whatsappSrc = "/images/whatsapp.png";

const FOOTER_SPACE = 30;

const styles = StyleSheet.create({
    page: {
        fontSize: 8,
        paddingTop: 0,
        paddingHorizontal: 18,
        paddingBottom: 12,
        fontFamily: "Helvetica",
        position: "relative",
    },

    watermark: {
        position: "absolute",
        width: 150,
        top: 135,
        left: 220,
        opacity: 0.12,
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    logo: {
        width: 65,
    },

    contactBlue: {
        color: BLUE,
        textAlign: "center",
        fontSize: 6,
        fontWeight: "bold",
        marginBottom: 1,
    },

    noteTitle: {
        color: BLUE,
        fontWeight: "bold",
        fontSize: 11,
    },

    noteNumber: {
        color: BLUE,
        fontWeight: "bold",
        fontSize: 8,
        marginTop: 2,
    },

    labelBlue: {
        color: BLUE,
        fontWeight: "bold",
    },

    tableHeader: {
        marginTop: 4,
        marginBottom: 3,
        flexDirection: "row",
        borderBottomWidth: 2,
        borderBottomColor: BLUE,
        paddingBottom: 2,
    },

    tableHeaderText: {
        color: BLUE,
        fontWeight: "bold",
        fontSize: 8,
    },

    tableRow: {
        flexDirection: "row",
        paddingVertical: 1,
    },

    qtyCol: {
        flex: 0.12,
        paddingRight: 5,
        color: "#000",
    },

    descCol: {
        flex: 0.88,
        color: "#000",
    },

    redText: {
        color: "red",
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 6,
        fontSize: 7,
    },

    obsText: {
        color: BLUE,
        fontWeight: "bold",
        fontSize: 7,
    },

    line: {
        borderBottomWidth: 1,
        borderBottomColor: BLUE,
        width: "100%",
        marginBottom: 3,
    },

    signatureGroup: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 7,
    },

    signatureBox: {
        width: "30%",
        textAlign: "center",
    },

    signatureText: {
        color: BLUE,
        fontWeight: "bold",
        fontSize: 7,
    },

    footer: {
        position: "absolute",
        bottom: 25,
        left: 18,
        right: 18,
    },

    footerSpacer: {
        height: FOOTER_SPACE,
    },

    whatsappRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 1,
        marginBottom: 1,
    },

    whatsappIcon: {
        width: 7,
        height: 7,
        marginRight: 3,
    },

    whatsappText: {
        color: BLUE,
        fontSize: 7,
        fontWeight: "bold",
    },

    halfContainer: {
        height: 378,
        overflow: "hidden",
        position: "relative",
        paddingTop: 18,
    },

    cutLineContainer: {
        marginTop: 0,
        alignItems: "center",
    },

    cutLine: {
        width: "100%",
        borderTopWidth: 1,
        borderTopColor: "#999",
        borderStyle: "dashed",
    },

    cutText: {
        marginTop: 5,
        fontSize: 8,
        color: "#777",
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
            <Page size="LETTER" style={styles.page}>
                <View style={styles.halfContainer}>
                    <Image src={watermarkSrc} style={styles.watermark} fixed />

                    <View style={[styles.row, { marginBottom: 6 }]}>
                        <View style={{ width: "28%" }}>
                            <Image src={logoSrc} style={styles.logo} />
                        </View>

                        <View style={{ width: "44%" }}>
                            <Text style={styles.contactBlue}>
                                11 calle, 41-20 Aldea "El Naranjito"
                            </Text>
                            <Text style={styles.contactBlue}>
                                Zona 6 de Mixco, Guatemala
                            </Text>
                            <Text style={styles.contactBlue}>
                                Tel: 2309-9419 2294-9257
                            </Text>

                            <View style={styles.whatsappRow}>
                                <Image
                                    src={whatsappSrc}
                                    style={styles.whatsappIcon}
                                />
                                <Text style={styles.whatsappText}>
                                    3595-5875
                                </Text>
                            </View>

                            <Text style={styles.contactBlue}>
                                Ventas: servicioalcliente@gpexcelencia.com
                            </Text>
                            <Text style={styles.contactBlue}>
                                Contabilidad: creditos@gpexcelencia.com
                            </Text>
                        </View>

                        <View
                            style={{
                                width: "28%",
                                alignItems: "flex-end",
                                paddingTop: 10,
                            }}
                        >
                            <Text style={styles.noteTitle}>NOTA DE ENVÍO</Text>

                            <Text style={styles.noteNumber}>
                                {cabecera?.nocotizacion
                                    ? `${cabecera.nocotizacion} / Envío ${no_envio}`
                                    : `Envío ${no_envio}`}
                            </Text>
                        </View>
                    </View>

                    <View style={{ marginBottom: 6 }}>
                        <Text>
                            <Text style={styles.labelBlue}>EMPRESA:</Text>{" "}
                            {cabecera?.cliente || "-"}
                        </Text>

                        <Text>
                            <Text style={styles.labelBlue}>DIRECCIÓN:</Text>{" "}
                            {direccion || "-"}
                        </Text>

                        <Text>
                            <Text style={styles.labelBlue}>FECHA:</Text> {fecha}
                        </Text>

                        <Text>
                            <Text style={styles.labelBlue}>CONTACTO:</Text>{" "}
                            {cabecera?.contacto || "-"}
                        </Text>

                        <Text>
                            <Text style={styles.labelBlue}>TELÉFONO:</Text>{" "}
                            {cabecera?.telefono || "-"}
                        </Text>
                    </View>

                    <View style={styles.tableHeader}>
                        <Text style={[styles.qtyCol, styles.tableHeaderText]}>
                            CANT.
                        </Text>

                        <Text style={[styles.descCol, styles.tableHeaderText]}>
                            DESCRIPCIÓN
                        </Text>
                    </View>

                    {productos.length === 0 ? (
                        <Text style={styles.descCol}>
                            No hay registros para este envío.
                        </Text>
                    ) : (
                        productos.map((item, index) => (
                            <View
                                key={index}
                                style={styles.tableRow}
                                wrap={false}
                            >
                                <Text style={styles.qtyCol}>
                                    {Number(item.cantidad || 0).toFixed(0)}
                                </Text>

                                <Text style={styles.descCol}>
                                    {item.descripcion}
                                </Text>
                            </View>
                        ))
                    )}

                    <View style={styles.footerSpacer} />

                    <View style={styles.footer}>
                        <Text style={styles.redText}>
                            Verificar producto, no se aceptan cambios ni
                            devoluciones.
                        </Text>

                        <Text style={styles.obsText}>
                            OBSERVACIÓN:
                            ________________________________________________
                        </Text>

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
                </View>

                {/* <View style={styles.cutLineContainer}>
                    <View style={styles.cutLine} />

                    <Text style={styles.cutText}>
                        ---------------- CORTAR AQUÍ ----------------
                    </Text>
                </View> */}
            </Page>
        </Document>
    );
};

export default NotaEnvioPDFHalf;
