import "../utils/disableHyphenation"; // Asegúrate de que este archivo exista y desactive la hipenación
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
        paddingBottom: 60,
        fontFamily: "Roboto",
        fontSize: 9, // ← más pequeño (antes 10)
    },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 10,
    },
    logo: { width: 100, height: "auto" },
    headerCenter: {
        flex: 1,
        textAlign: "center",
        fontSize: 9,
        marginTop: 5,
        marginLeft: 10,
        marginRight: 10,
    }, // ← un punto menos
    headerRight: { width: 120, alignItems: "flex-start", fontSize: 9 },
    cotizacionLabel: { fontSize: 10, marginBottom: 4 },

    fechaEncabezado: {
        backgroundColor: "rgb(39,50,56)",
        color: "white",
        fontSize: 8,
        textAlign: "center",
        padding: 2,
        width: "100%",
    },
    fechaBox: {
        // border: "1px solid black",     // ✗ shorthand no soportado
        borderWidth: 1, // ← usa propiedades explícitas
        borderColor: "#000",
        borderStyle: "solid",
        padding: 4,
        textAlign: "center",
        width: "100%",
    },

    customerInfo: { marginBottom: 15, fontSize: 9, lineHeight: 1.2 }, // ← un punto menos
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 2,
    },
    label: { width: "49%" },
    boldText: { fontWeight: "bold" },

    table: {
        flexDirection: "column",
        width: "auto",
    },

    // Cabecera de la tabla
    tableRow: {
        flexDirection: "row",
        backgroundColor: "rgb(39,50,56)",
        color: "white",
    },

    // FILA DE DATOS con línea inferior
    tableRowData: {
        flexDirection: "row",
        paddingVertical: 4,
        borderBottomWidth: 0.8, // ← línea por fila
        borderBottomColor: "#c9c9c9",
        borderBottomStyle: "solid",
    },

    tableCol: { padding: 5 },

    tableCell: {
        marginVertical: 0, // ← menos aire
        fontSize: 9, // ← acompaña tamaño general
    },

    footer: { marginTop: 20, alignItems: "flex-end" },
});

const formatoMoneda = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const PedidoPDF = ({ pedido, totalEnLetras, logoSrc }) => (
    <Document>
        <Page style={styles.page}>
            {/* Encabezado */}
            <View style={styles.header}>
                <Image style={styles.logo} src={logoSrc} />

                <View style={styles.headerCenter}>
                    <Text style={{ fontSize: 12, fontWeight: 700 }}>
                        GP EXCELENCIA, S.A.
                    </Text>
                    <Text>Tel: 2309-9419 / 2294-9257</Text>
                    <Text>11 calle 41-20 Aldea "El Naranjito"</Text>
                    <Text>Zona 6 de Mixco Guatemala</Text>
                    <Text>Ventas: servicioalcliente@gpexcelencia.com</Text>
                    <Text>Contabilidad: creditos@gpexcelencia.com</Text>
                    <Text>www.gpexcelencia.com</Text>
                </View>

                <View style={styles.headerRight}>
                    <Text style={styles.cotizacionLabel}>
                        PEDIDO: {pedido.nopedido}
                    </Text>
                    <View style={styles.fechaEncabezado}>
                        <Text>FECHA PEDIDO</Text>
                    </View>
                    <View style={styles.fechaBox}>
                        <Text>
                            {pedido.fecha_pedido
                                ? new Date(
                                      pedido.fecha_pedido
                                  ).toLocaleDateString("es-GT", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                  })
                                : "N/A"}
                        </Text>
                    </View>
                    <View style={styles.fechaEncabezado}>
                        <Text>FECHA ENTREGA</Text>
                    </View>
                    <View style={styles.fechaBox}>
                        <Text>
                            {pedido.fecha_entrega
                                ? new Date(
                                      pedido.fecha_entrega
                                  ).toLocaleDateString("es-GT", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                  })
                                : "N/A"}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Info cliente */}
            <View style={styles.customerInfo}>
                <View style={styles.row}>
                    <Text style={styles.label}>
                        <Text style={styles.boldText}>CLIENTE:</Text>{" "}
                        {pedido.cliente}
                    </Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>
                        <Text style={styles.boldText}>ASESOR:</Text>{" "}
                        {pedido.asesor || "N/A"}
                    </Text>
                    <Text style={styles.label}>
                        <Text style={styles.boldText}>TRABAJO:</Text>{" "}
                        {pedido.trabajo || "N/A"}
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
                            { width: "12%", fontWeight: 700 },
                        ]}
                    >
                        <Text
                            style={[styles.tableCell, { textAlign: "center" }]}
                        >
                            MATERIAL
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.tableCol,
                            { width: "8%", fontWeight: 700 },
                        ]}
                    >
                        <Text
                            style={[styles.tableCell, { textAlign: "center" }]}
                        >
                            CARAS
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.tableCol,
                            { width: "8%", fontWeight: 700 },
                        ]}
                    >
                        <Text
                            style={[styles.tableCell, { textAlign: "center" }]}
                        >
                            ANCHO
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.tableCol,
                            { width: "8%", fontWeight: 700 },
                        ]}
                    >
                        <Text
                            style={[styles.tableCell, { textAlign: "center" }]}
                        >
                            ALTO
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.tableCol,
                            { width: "8%", fontWeight: 700 },
                        ]}
                    >
                        <Text
                            style={[styles.tableCell, { textAlign: "center" }]}
                        >
                            UM
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.tableCol,
                            { width: "12%", fontWeight: 700 },
                        ]}
                    >
                        <Text
                            style={[styles.tableCell, { textAlign: "center" }]}
                        >
                            MAQUINA
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.tableCol,
                            { width: "10%", fontWeight: 700 },
                        ]}
                    >
                        <Text
                            style={[styles.tableCell, { textAlign: "center" }]}
                        >
                            VERSIÓN
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.tableCol,
                            { width: "26%", fontWeight: 700 },
                        ]}
                    >
                        <Text
                            style={[styles.tableCell, { textAlign: "center" }]}
                        >
                            ACABADOS
                        </Text>
                    </View>
                </View>
                {pedido.detalles.map((detalle, index) => (
                    // <View style={styles.tableRowData} key={index}>
                    <View style={styles.tableRowData} key={index} wrap={false}>
                        <View style={[styles.tableCol, { width: "8%" }]}>
                            <Text style={styles.tableCell}>
                                {detalle.cantidad}
                            </Text>
                        </View>
                        <View style={[styles.tableCol, { width: "12%" }]}>
                            <Text
                                style={[
                                    styles.tableCell,
                                    {
                                        textAlign: "left",
                                        margin: 0, //elimina el centrado
                                        paddingRight: 2, //para que no se pegue al borde
                                    },
                                ]}
                            >
                                {detalle.material}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.tableCol,
                                { width: "8%", textAlign: "center" },
                            ]}
                        >
                            <Text style={styles.tableCell}>
                                {detalle.caras}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.tableCol,
                                { width: "8%", textAlign: "center" },
                            ]}
                        >
                            <Text style={styles.tableCell}>
                                {detalle.ancho}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.tableCol,
                                { width: "8%", textAlign: "center" },
                            ]}
                        >
                            <Text style={styles.tableCell}>{detalle.alto}</Text>
                        </View>
                        <View
                            style={[
                                styles.tableCol,
                                { width: "8%", textAlign: "left" },
                            ]}
                        >
                            <Text style={styles.tableCell}>
                                {detalle.unidad_medida}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.tableCol,
                                { width: "12%", textAlign: "left" },
                            ]}
                        >
                            <Text style={styles.tableCell}>
                                {detalle.maquina}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.tableCol,
                                {
                                    width: "10%",
                                    textAlign: "left",
                                    alignItems: "center",
                                },
                            ]}
                        >
                            <Text style={styles.tableCell}>
                                {detalle.version}
                            </Text>

                            {detalle.imagen && detalle.imagen.trim() !== "" && (
                                <Image
                                    //src={`http://localhost:8000/images_pedidosproduccion/${detalle.imagen}`}
                                    src={`https://sistemagpe.app/images_pedidosproduccion/${detalle.imagen}`}
                                    style={{
                                        width: 60,
                                        height: 60,
                                        marginTop: 4,
                                    }}
                                />
                            )}
                        </View>
                        <View
                            style={[
                                styles.tableCol,
                                { width: "26%", textAlign: "left" },
                            ]}
                        >
                            <Text style={styles.tableCell}>
                                {detalle.acabados}
                            </Text>
                        </View>
                    </View>
                ))}
                {/* {cotizacion.detalles.map((detalle, index) => (
                    <React.Fragment key={index}>
                        {index % 20 === 0 && (
                            <View style={styles.tableRow} break>
                                <View
                                    style={[styles.tableCol, { width: "8%" }]}
                                >
                                    <Text style={styles.tableCell}>CANT.</Text>
                                </View>
                                <View
                                    style={[styles.tableCol, { width: "62%" }]}
                                >
                                    <Text
                                        style={[
                                            styles.tableCell,
                                            { textAlign: "center" },
                                        ]}
                                    >
                                        DESCRIPCIÓN
                                    </Text>
                                </View>
                                <View
                                    style={[styles.tableCol, { width: "15%" }]}
                                >
                                    <Text
                                        style={[
                                            styles.tableCell,
                                            { textAlign: "center" },
                                        ]}
                                    >
                                        PRECIO
                                    </Text>
                                </View>
                                <View
                                    style={[styles.tableCol, { width: "15%" }]}
                                >
                                    <Text
                                        style={[
                                            styles.tableCell,
                                            { textAlign: "center" },
                                        ]}
                                    >
                                        TOTAL
                                    </Text>
                                </View>
                            </View>
                        )}
                        <View style={styles.tableRowData}>
                            <View style={[styles.tableCol, { width: "8%" }]}>
                                <Text style={styles.tableCell}>
                                    {detalle.cantidad}
                                </Text>
                            </View>
                            <View style={[styles.tableCol, { width: "62%" }]}>
                                <Text
                                    style={[
                                        styles.tableCell,
                                        {
                                            textAlign: "left",
                                            margin: 0,
                                            paddingRight: 2,
                                        },
                                    ]}
                                >
                                    {detalle.descripcion}
                                </Text>
                            </View>
                            <View style={[styles.tableCol, { width: "15%" }]}>
                                <Text
                                    style={[
                                        styles.tableCell,
                                        { textAlign: "right" },
                                    ]}
                                >
                                    {formatoMoneda.format(detalle.precio)}
                                </Text>
                            </View>
                            <View style={[styles.tableCol, { width: "15%" }]}>
                                <Text
                                    style={[
                                        styles.tableCell,
                                        { textAlign: "right" },
                                    ]}
                                >
                                    {formatoMoneda.format(detalle.total)}
                                </Text>
                            </View>
                        </View>
                    </React.Fragment>
                ))} */}
            </View>

            {/* Total General */}
            {/* <View
                style={{
                    marginTop: 40,
                    backgroundColor: "rgb(39,50,56)",
                    color: "white",
                    padding: 2,
                    width: "100%",
                    marginBottom: 5,
                }}
            >
                <Text style={{ fontSize: 10 }}>TOTAL GENERAL</Text>
            </View>
            <View
                style={{
                    borderBottom: "2px solid rgb(39,50,56)",
                    marginBottom: 5,
                }}
            />
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                }}
            >
                <View>
                    {totalEnLetras && (
                        <>
                            <Text style={{ fontSize: 10 }}>
                                TOTAL EN LETRAS
                            </Text>
                            <Text style={{ fontSize: 10 }}>
                                {totalEnLetras}
                            </Text>
                        </>
                    )}
                </View>
                <View>
                    <Text style={{ fontSize: 14 }}>
                        Total: {formatoMoneda.format(pedido.total_general)}
                    </Text>
                </View>
            </View>
            <View style={{ marginTop: 5, marginBottom: 5, width: "100%" }}>
                <Text>
                    <Text style={{ fontWeight: 700 }}>OBSERVACIONES:</Text>{" "}
                    {pedido.observaciones_cliente || ""}
                </Text>
            </View> */}
            <View
                fixed
                style={{
                    position: "absolute",
                    bottom: 10,
                    left: 30, // igual al padding del `page`
                    right: 30,
                    height: 30,
                    backgroundColor: "rgb(39,50,56)",
                    paddingHorizontal: 10,
                    paddingTop: 8,
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    alignItems: "center",
                }}
            >
                <Text
                    style={{ color: "white", fontSize: 10 }}
                    render={({ pageNumber, totalPages }) =>
                        `Página ${pageNumber} de ${totalPages}`
                    }
                />
            </View>
        </Page>
    </Document>
);

export default PedidoPDF;
