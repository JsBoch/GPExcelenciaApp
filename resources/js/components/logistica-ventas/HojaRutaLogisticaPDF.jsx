import React from "react";

import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
} from "@react-pdf/renderer";

const BLUE = "#0e4f84";
const GREEN = "#39b54a";
const DARK = "#0f172a";
const GRAY = "#64748b";
const BORDER = "#d9e1e8";
const LIGHT = "#f5f7fa";

const styles = StyleSheet.create({
    page: {
        paddingTop: 22,
        paddingBottom: 22,
        paddingHorizontal: 24,
        fontFamily: "Helvetica",
        fontSize: 8,
        color: DARK,
    },

    header: {
        marginBottom: 14,
    },

    company: {
        fontSize: 15,
        fontWeight: "bold",
        color: BLUE,
    },

    subtitle: {
        marginTop: 2,
        fontSize: 7.5,
        color: GRAY,
    },

    accent: {
        marginTop: 7,
        width: "100%",
        height: 3,
        flexDirection: "row",
    },

    accentBlue: {
        width: 90,
        backgroundColor: BLUE,
    },

    accentGreen: {
        width: 40,
        backgroundColor: GREEN,
    },

    accentRest: {
        flex: 1,
        backgroundColor: "#e7edf2",
    },

    titleRow: {
        marginTop: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },

    title: {
        fontSize: 14,
        fontWeight: "bold",
    },

    status: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        backgroundColor: LIGHT,
        color: BLUE,
        fontSize: 7,
        fontWeight: "bold",
    },

    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 12,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderColor: BORDER,
    },

    infoCell: {
        width: "33.333%",
        minHeight: 39,
        padding: 7,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: BORDER,
    },

    infoLabel: {
        fontSize: 6.5,
        color: GRAY,
        marginBottom: 3,
    },

    infoValue: {
        fontSize: 8,
        fontWeight: "bold",
    },

    sectionTitle: {
        marginTop: 15,
        marginBottom: 6,
        fontSize: 9,
        fontWeight: "bold",
        color: BLUE,
    },

    table: {
        width: "100%",
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderColor: BORDER,
    },

    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#eef3f7",
    },

    tableRow: {
        flexDirection: "row",
        minHeight: 32,
    },

    th: {
        paddingVertical: 5,
        paddingHorizontal: 4,
        fontSize: 6.5,
        fontWeight: "bold",
        color: "#334155",
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: BORDER,
    },

    td: {
        paddingVertical: 5,
        paddingHorizontal: 4,
        fontSize: 6.5,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: BORDER,
    },

    colOrden: {
        width: "6%",
        textAlign: "center",
    },

    colPedido: {
        width: "10%",
    },

    colHora: {
        width: "9%",
        textAlign: "center",
    },

    colCliente: {
        width: "18%",
    },

    colDireccion: {
        width: "27%",
    },

    colObservaciones: {
        width: "18%",
    },

    colEstado: {
        width: "12%",
    },

    observationsBox: {
        marginTop: 12,
        padding: 8,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: "#fafbfc",
    },

    observationsLabel: {
        fontSize: 6.5,
        color: GRAY,
        marginBottom: 4,
    },

    observationsText: {
        fontSize: 7.5,
    },

    footer: {
        position: "absolute",
        left: 24,
        right: 24,
        bottom: 12,

        paddingTop: 5,

        borderTopWidth: 1,
        borderColor: "#e4e9ee",

        flexDirection: "row",
        justifyContent: "space-between",

        color: "#8491a0",
        fontSize: 6,
    },
});

const formatearFecha = (valor) => {
    if (!valor) {
        return "—";
    }

    const fecha = String(valor).substring(0, 10);
    const partes = fecha.split("-");

    if (partes.length !== 3) {
        return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const formatearHora = (valor) => {
    if (!valor) {
        return "—";
    }

    return String(valor).substring(0, 5);
};

const obtenerEstadoPedido = (pedido) => {
    return (
        pedido.estado_entrega ||
        pedido.estado ||
        "—"
    );
};

function HojaRutaLogisticaPDF({ detalle }) {
    const pedidos = Array.isArray(detalle?.pedidos)
        ? detalle.pedidos
        : [];

    return (
        <Document>
            <Page
                size="LETTER"
                orientation="landscape"
                style={styles.page}
            >
                {/* =====================================
                    ENCABEZADO
                ====================================== */}

                <View style={styles.header}>
                    <Text style={styles.company}>
                        GP EXCELENCIA
                    </Text>

                    <Text style={styles.subtitle}>
                        Logística de Ventas · Hoja de Ruta
                    </Text>

                    <View style={styles.accent}>
                        <View style={styles.accentBlue} />
                        <View style={styles.accentGreen} />
                        <View style={styles.accentRest} />
                    </View>

                    <View style={styles.titleRow}>
                        <Text style={styles.title}>
                            {detalle?.ruta || "Ruta"}
                        </Text>

                        <Text style={styles.status}>
                            {detalle?.estado || "—"}
                        </Text>
                    </View>
                </View>


                {/* =====================================
                    DATOS DE LA PROGRAMACIÓN
                ====================================== */}

                <View style={styles.infoGrid}>
                    <View style={styles.infoCell}>
                        <Text style={styles.infoLabel}>
                            Fecha
                        </Text>

                        <Text style={styles.infoValue}>
                            {formatearFecha(
                                detalle?.fecha,
                            )}
                        </Text>
                    </View>

                    <View style={styles.infoCell}>
                        <Text style={styles.infoLabel}>
                            Hora de salida
                        </Text>

                        <Text style={styles.infoValue}>
                            {formatearHora(
                                detalle?.hora_salida,
                            )}
                        </Text>
                    </View>

                    <View style={styles.infoCell}>
                        <Text style={styles.infoLabel}>
                            Piloto
                        </Text>

                        <Text style={styles.infoValue}>
                            {detalle?.piloto || "—"}
                        </Text>
                    </View>

                    <View style={styles.infoCell}>
                        <Text style={styles.infoLabel}>
                            Vehículo
                        </Text>

                        <Text style={styles.infoValue}>
                            {detalle?.vehiculo || "—"}
                        </Text>
                    </View>

                    <View style={styles.infoCell}>
                        <Text style={styles.infoLabel}>
                            Placa
                        </Text>

                        <Text style={styles.infoValue}>
                            {detalle?.placa || "—"}
                        </Text>
                    </View>

                    <View style={styles.infoCell}>
                        <Text style={styles.infoLabel}>
                            Encargado
                        </Text>

                        <Text style={styles.infoValue}>
                            {detalle?.encargado || "—"}
                        </Text>
                    </View>
                </View>


                {/* =====================================
                    ENTREGAS
                ====================================== */}

                <Text style={styles.sectionTitle}>
                    Entregas programadas ({pedidos.length})
                </Text>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text
                            style={[
                                styles.th,
                                styles.colOrden,
                            ]}
                        >
                            Orden
                        </Text>

                        <Text
                            style={[
                                styles.th,
                                styles.colPedido,
                            ]}
                        >
                            Pedido
                        </Text>

                        <Text
                            style={[
                                styles.th,
                                styles.colHora,
                            ]}
                        >
                            Hora
                        </Text>

                        <Text
                            style={[
                                styles.th,
                                styles.colCliente,
                            ]}
                        >
                            Cliente
                        </Text>

                        <Text
                            style={[
                                styles.th,
                                styles.colDireccion,
                            ]}
                        >
                            Dirección
                        </Text>

                        <Text
                            style={[
                                styles.th,
                                styles.colObservaciones,
                            ]}
                        >
                            Observaciones
                        </Text>

                        <Text
                            style={[
                                styles.th,
                                styles.colEstado,
                            ]}
                        >
                            Estado
                        </Text>
                    </View>

                    {pedidos.map((pedido, index) => (
                        <View
                            key={pedido.id || index}
                            style={styles.tableRow}
                            wrap={false}
                        >
                            <Text
                                style={[
                                    styles.td,
                                    styles.colOrden,
                                ]}
                            >
                                {pedido.orden_entrega ||
                                    index + 1}
                            </Text>

                            <Text
                                style={[
                                    styles.td,
                                    styles.colPedido,
                                ]}
                            >
                                P-{pedido.nopedido || "—"}
                            </Text>

                            <Text
                                style={[
                                    styles.td,
                                    styles.colHora,
                                ]}
                            >
                                {formatearHora(
                                    pedido.hora_entrega,
                                )}
                            </Text>

                            <Text
                                style={[
                                    styles.td,
                                    styles.colCliente,
                                ]}
                            >
                                {pedido.cliente || "—"}
                            </Text>

                            <Text
                                style={[
                                    styles.td,
                                    styles.colDireccion,
                                ]}
                            >
                                {pedido.direccion_entrega ||
                                    "—"}
                            </Text>

                            <Text
                                style={[
                                    styles.td,
                                    styles.colObservaciones,
                                ]}
                            >
                                {pedido.observaciones ||
                                    "—"}
                            </Text>

                            <Text
                                style={[
                                    styles.td,
                                    styles.colEstado,
                                ]}
                            >
                                {obtenerEstadoPedido(
                                    pedido,
                                )}
                            </Text>
                        </View>
                    ))}
                </View>


                {/* =====================================
                    OBSERVACIONES DE RUTA
                ====================================== */}

                <View style={styles.observationsBox}>
                    <Text style={styles.observationsLabel}>
                        Observaciones de la ruta
                    </Text>

                    <Text style={styles.observationsText}>
                        {detalle?.observaciones || "Sin observaciones."}
                    </Text>
                </View>


                {/* =====================================
                    PIE
                ====================================== */}

                <View
                    style={styles.footer}
                    fixed
                >
                    <Text>
                        GP EXCELENCIA · Logística de Ventas
                    </Text>

                    <Text
                        render={({ pageNumber, totalPages }) =>
                            `Página ${pageNumber} de ${totalPages}`
                        }
                    />
                </View>
            </Page>
        </Document>
    );
}

export default HojaRutaLogisticaPDF;