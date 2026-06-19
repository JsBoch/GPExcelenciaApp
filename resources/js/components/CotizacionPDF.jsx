import "../utils/disableHyphenation"; // Asegúrate de que este archivo exista y desactive la hipenación
import marcaAgua from "../assets/marca_de_agua.jpg";
import whatsapp from "../assets/whatsapp.png";
import React from "react";
import {
    Page,
    Text,
    View,
    Document,
    StyleSheet,
    Image,
    Font,
} from "@react-pdf/renderer";
import { Buffer } from "buffer"; // Importa Buffer

if (typeof window !== "undefined" && typeof window.Buffer === "undefined") {
    window.Buffer = Buffer;
}

// Registrar fuente Roboto
Font.register({
    family: "Roboto",
    fonts: [
        {
            src: "/fonts/Roboto-Italic-VariableFont_wdth,wght.ttf",
            fontStyle: "italic",
        },
        { src: "/fonts/Roboto-VariableFont_wdth,wght.ttf", fontWeight: 700 },
    ],
});

const styles = StyleSheet.create({
    page: {
        padding: 30,
        paddingBottom: 35,
        fontFamily: "Roboto",
        fontSize: 10,
        color: "#0A467C",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 10,
    },
    logo: {
        width: 110,
        height: 110,
        objectFit: "contain",
    },
    headerCenter: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        fontSize: 9,
        color: "#0A467C",
        marginTop: 0,
        lineHeight: 1.2,
    },
    headerRight: {
        width: 140,
        alignItems: "center",
        marginTop: 0,
    },
    cotizacionLabel: {
        fontSize: 10,
        marginBottom: 4,
    },
    fechaEncabezado: {
        backgroundColor: "#0A467C",
        color: "white",
        fontSize: 8,
        textAlign: "center",
        padding: 2,
        width: "100%",
    },
    fechaBox: {
        border: "1px solid black",
        padding: 4,
        textAlign: "center",
        width: "100%",
    },
    customerInfo: {
        marginBottom: 15,
        fontSize: 10,
        lineHeight: 1.2,
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 2,
    },

    label: {
        width: "49%",
    },

    boldText: {
        fontWeight: "bold",
    },
    table: {
        display: "table",
        width: "auto",
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        flexDirection: "row",
        backgroundColor: "#0A467C",
        color: "white",
    },
    tableRowData: {
        flexDirection: "row",
    },
    tableCol: {
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 5,
    },
    tableCell: {
        //margin: "auto",
        //marginTop: 5,
        marginVertical: 2,
        fontSize: 10,
    },
    footer: {
        marginTop: 20,
        alignItems: "flex-end",
    },

    tableCellBlack: {
        fontSize: 10,
        color: "#000000",
    },
});

const formatoMoneda = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

// Encima del componente
const fechaDMY = (valor) => {
    if (!valor) return "N/A";
    const s = String(valor).trim();

    // Caso común: "YYYY-MM-DD" o "YYYY-MM-DD HH:mm:ss"
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const y = s.slice(0, 4);
        const m = s.slice(5, 7);
        const d = s.slice(8, 10);
        return `${d}/${m}/${y}`;
    }

    // Fallback: intentar parsear como Date
    const iso = s.includes(" ") ? s.replace(" ", "T") : s;
    const d = new Date(iso);
    if (!isNaN(d)) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
    }
    return s;
};

const CotizacionPDF = ({ cotizacion, totalEnLetras, logoSrc }) => (
    <Document>
        <Page style={styles.page}>
            <Image
                fixed
                src={marcaAgua}
                style={{
                    position: "absolute",
                    top: 260,
                    left: 150,
                    width: 260,
                    height: 260,
                    opacity: 1,
                }}
            />

            {/* Encabezado */}
            <View style={styles.header}>
                <Image style={styles.logo} src={logoSrc} />

                <View style={styles.headerCenter}>
                    <Text>11 calle, 41-20 Aldea “El Naranjito”</Text>

                    <Text>Zona 6 de Mixco, Guatemala</Text>

                    <Text>Tel: 2309-9419 &nbsp; 2294-9257</Text>

                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 2,
                        }}
                    >
                        <Image
                            src={whatsapp}
                            style={{
                                width: 10,
                                height: 10,
                                marginRight: 3,
                            }}
                        />

                        <Text>3595-5875</Text>
                    </View>

                    <Text>Ventas: servicioalcliente@gpexcelencia.com</Text>

                    <Text>Contabilidad: creditos@gpexcelencia.com</Text>
                   
                </View>

                <View style={styles.headerRight}>
                    <Text
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            marginBottom: 4,
                        }}
                    >
                        COTIZACIÓN: {cotizacion.nocotizacion}
                    </Text>

                    <View
                        style={{
                            backgroundColor: "#0A467C",
                            width: "100%",
                            padding: 2,
                            alignItems: "center",
                        }}
                    >
                        <Text
                            style={{
                                color: "#FFF",
                                fontSize: 8,
                            }}
                        >
                            DIA MES AÑO
                        </Text>
                    </View>

                    <View
                        style={{
                            border: "1px solid #0A467C",
                            width: "100%",
                            padding: 6,
                            alignItems: "center",
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 12,
                            }}
                        >
                            {fechaDMY(cotizacion.fecha_cotizacion)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Info cliente */}
            <View style={styles.customerInfo}>
                <View style={styles.row}>
                    <Text style={styles.label}>
                        <Text style={styles.boldText}>NOMBRE:</Text>{" "}
                        {cotizacion.cliente}
                    </Text>
                    <Text style={styles.label}>
                        <Text style={styles.boldText}>Nit:</Text>{" "}
                        {cotizacion.nit || "N/A"}
                    </Text>
                </View>
                <View style={{ flexDirection: "row", marginBottom: 2 }}>
                    <Text
                        style={{
                            width: "30%",
                            fontSize: 10,
                            fontWeight: "bold",
                        }}
                    >
                        Tipo Facturación:
                    </Text>
                    <Text style={{ width: "70%", fontSize: 10 }}>
                        {cotizacion.tipo_facturacion || "BIEN"}
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>
                        <Text style={styles.boldText}>CONTACTO:</Text>{" "}
                        {cotizacion.contacto}
                    </Text>
                    <Text style={styles.label}></Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>
                        <Text style={styles.boldText}>VENDEDOR:</Text>{" "}
                        {cotizacion.vendedor || "N/A"}
                    </Text>
                    <Text style={styles.label}>
                        <Text style={styles.boldText}>Tel:</Text>{" "}
                        {cotizacion.telefono_vendedor || "N/A"}
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>
                        <Text style={styles.boldText}>Correo:</Text>{" "}
                        {cotizacion.correo_vendedor || "N/A"}
                    </Text>
                    <Text style={styles.label}>
                        <Text style={styles.boldText}>FORMA DE PAGO:</Text>{" "}
                        {cotizacion.tipo_pago}
                    </Text>
                </View>
            </View>

            {/* Tabla de productos */}
            {/* <View style={styles.table}> */}
            <View style={{ ...styles.table, flexDirection: "column" }}>
                <View style={styles.tableRow}>
                    <View
                        style={[
                            styles.tableCol,
                            { width: "8%", fontWeight: 700 },
                        ]}
                    >
                        <Text style={styles.tableCell}>CANT.</Text>
                    </View>
                    <View
                        style={[
                            styles.tableCol,
                            { width: "62%", fontWeight: 700 },
                        ]}
                    >
                        <Text
                            style={[styles.tableCell, { textAlign: "center" }]}
                        >
                            DESCRIPCIÓN
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.tableCol,
                            { width: "15%", fontWeight: 700 },
                        ]}
                    >
                        <Text
                            style={[styles.tableCell, { textAlign: "center" }]}
                        >
                            PRECIO
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.tableCol,
                            { width: "15%", fontWeight: 700 },
                        ]}
                    >
                        <Text
                            style={[styles.tableCell, { textAlign: "center" }]}
                        >
                            TOTAL
                        </Text>
                    </View>
                </View>
                {cotizacion.detalles.map((detalle, index) => (
                    // <View style={styles.tableRowData} key={index}>
                    <View
                        style={[styles.tableRowData, { flexDirection: "row" }]}
                        key={index}
                        wrap={false}
                    >
                        <View style={[styles.tableCol, { width: "8%" }]}>
                            <Text style={styles.tableCellBlack}>
                                {detalle.cantidad}
                            </Text>
                        </View>
                        <View style={[styles.tableCol, { width: "62%" }]}>
                            <Text
                                style={[
                                    styles.tableCellBlack,
                                    {
                                        textAlign: "left",
                                        margin: 0, //elimina el centrado
                                        paddingRight: 2, //para que no se pegue al borde
                                    },
                                ]}
                            >
                                {detalle.descripcion}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.tableCol,
                                { width: "15%", textAlign: "right" },
                            ]}
                        >
                            <Text style={styles.tableCellBlack}>
                                {formatoMoneda.format(detalle.precio_unitario)}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.tableCol,
                                { width: "15%", textAlign: "right" },
                            ]}
                        >
                            <Text style={styles.tableCellBlack}>
                                {formatoMoneda.format(detalle.precio)}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            <View
                style={{
                    marginTop: "auto",
                    paddingTop: 10,
                }}
            >
                <View
                    style={{
                        backgroundColor: "#0A467C",
                        padding: 3,
                        width: "100%",
                    }}
                >
                    <Text
                        style={{
                            color: "#FFF",
                            fontSize: 10,
                        }}
                    >
                        TOTAL GENERAL
                    </Text>
                </View>

                <View
                    style={{
                        borderBottom: "2px solid #0A467C",
                        marginBottom: 8,
                    }}
                />

                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                    }}
                >
                    <View style={{ width: "70%" }}>
                        <Text
                            style={{
                                color: "#000",
                                fontWeight: 700,
                                fontSize: 10,
                            }}
                        >
                            TOTAL EN LETRAS
                        </Text>

                        <Text
                            style={{
                                color: "#000",
                                fontSize: 10,
                            }}
                        >
                            {totalEnLetras}
                        </Text>

                        <Text
                            style={{
                                marginTop: 10,
                                color: "#000",
                                fontWeight: 700,
                            }}
                        >
                            OBSERVACIONES:
                        </Text>

                        <Text style={{ color: "#000" }}>
                            {cotizacion.observaciones_cliente || ""}
                        </Text>
                    </View>

                    <View
                        style={{
                            width: "30%",
                            alignItems: "flex-end",
                        }}
                    >
                        <Text
                            style={{
                                color: "#000",
                                fontSize: 11,
                            }}
                        >
                            Subtotal:{" "}
                            {formatoMoneda.format(cotizacion.total_general)}
                        </Text>

                        <Text
                            style={{
                                color: "#000",
                                fontSize: 11,
                            }}
                        >
                            Descuento:{" "}
                            {formatoMoneda.format(cotizacion.descuento_monto)}
                        </Text>

                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "#000",
                                marginTop: 6,
                            }}
                        >
                            TOTAL{" "}
                            {formatoMoneda.format(
                                cotizacion.total_general -
                                    cotizacion.descuento_monto,
                            )}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Pie azul con número de página */}
            <View
                fixed
                style={{
                    position: "absolute",
                    bottom: 10,
                    left: 30,
                    right: 30,
                    height: 22,
                    backgroundColor: "#0A467C",
                    paddingHorizontal: 10,
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    alignItems: "center",
                }}
            >
                <Text
                    style={{
                        color: "white",
                        fontSize: 10,
                    }}
                    render={({ pageNumber, totalPages }) =>
                        `Página ${pageNumber} de ${totalPages}`
                    }
                />
            </View>
        </Page>
    </Document>
);

export default CotizacionPDF;
