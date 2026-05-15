import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
    page: {
        padding: 20,
        fontSize: 9,
    },

    header: {
        marginBottom: 10,
        borderBottom: 1,
        paddingBottom: 8,
    },

    title: {
        fontSize: 16,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 5,
    },

    section: {
        marginBottom: 10,
    },

    row: {
        flexDirection: "row",
        marginBottom: 4,
    },

    col: {
        flex: 1,
        paddingRight: 8,
    },

    label: {
        fontWeight: "bold",
    },

    tableHeader: {
        flexDirection: "row",
        borderBottom: 1,
        borderTop: 1,
        paddingVertical: 4,
        fontWeight: "bold",
        backgroundColor: "#f2f2f2",
    },

    tableRow: {
        flexDirection: "row",
        borderBottom: 1,
        paddingVertical: 4,
        alignItems: "center",
    },

    cellSmall: {
        width: 35,
    },

    cellMedium: {
        width: 55,
    },

    cellLarge: {
        flex: 1,
    },

    image: {
        width: 45,
        height: 45,
        objectFit: "contain",
    },
});

const formatDate = (fecha) => {
    if (!fecha) return "";

    const f = fecha.split(" ")[0];
    const p = f.split("-");

    if (p.length !== 3) return fecha;

    return `${p[2]}/${p[1]}/${p[0]}`;
};

const PedidoProduccionPDF = ({ pedido, logoSrc }) => {
    const baseUrl = window.location.origin;

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                <View style={styles.header}>
                    {logoSrc && (
                        <Image
                            src={logoSrc}
                            style={{
                                width: 120,
                                height: 50,
                                objectFit: "contain",
                                marginBottom: 10,
                            }}
                        />
                    )}

                    <Text style={styles.title}>
                        PEDIDO A PRODUCCIÓN
                    </Text>
                </View>

                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text>
                                <Text style={styles.label}>No. Pedido:</Text>{" "}
                                {pedido.nopedido}
                            </Text>
                        </View>

                        <View style={styles.col}>
                            <Text>
                                <Text style={styles.label}>Cotización:</Text>{" "}
                                {pedido.nocotizacion || "N/A"}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text>
                                <Text style={styles.label}>Fecha Pedido:</Text>{" "}
                                {formatDate(pedido.fecha_pedido)}
                            </Text>
                        </View>

                        <View style={styles.col}>
                            <Text>
                                <Text style={styles.label}>Fecha Entrega:</Text>{" "}
                                {formatDate(pedido.fecha_entrega)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text>
                                <Text style={styles.label}>Cliente:</Text>{" "}
                                {pedido.cliente}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text>
                                <Text style={styles.label}>Contacto:</Text>{" "}
                                {pedido.contacto}
                            </Text>
                        </View>

                        <View style={styles.col}>
                            <Text>
                                <Text style={styles.label}>Asesor:</Text>{" "}
                                {pedido.asesor}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text>
                                <Text style={styles.label}>Trabajo:</Text>{" "}
                                {pedido.trabajo}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text>
                                <Text style={styles.label}>Dirección:</Text>{" "}
                                {pedido.direccion_entrega}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={{ fontWeight: "bold", marginBottom: 5 }}>
                        ÁREAS ASIGNADAS
                    </Text>

                    {pedido.areas?.map((area, i) => (
                        <Text key={i}>
                            {i + 1}. {area.nombre} ({formatDate(area.fecha_programada)})
                        </Text>
                    ))}
                </View>

                <View style={styles.section}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.cellSmall}>Cant</Text>
                        <Text style={styles.cellLarge}>Material</Text>
                        <Text style={styles.cellSmall}>Caras</Text>
                        <Text style={styles.cellMedium}>Ancho</Text>
                        <Text style={styles.cellMedium}>Alto</Text>
                        <Text style={styles.cellMedium}>Unidad</Text>
                        <Text style={styles.cellLarge}>Acabados</Text>
                        <Text style={styles.cellMedium}>Img</Text>
                    </View>

                    {pedido.detalles?.map((item, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.cellSmall}>
                                {item.cantidad}
                            </Text>

                            <Text style={styles.cellLarge}>
                                {item.material}
                            </Text>

                            <Text style={styles.cellSmall}>
                                {item.caras}
                            </Text>

                            <Text style={styles.cellMedium}>
                                {item.ancho}
                            </Text>

                            <Text style={styles.cellMedium}>
                                {item.alto}
                            </Text>

                            <Text style={styles.cellMedium}>
                                {item.unidad_medida}
                            </Text>

                            <Text style={styles.cellLarge}>
                                {item.acabados}
                            </Text>

                            <View style={styles.cellMedium}>
                                {item.imagen ? (
                                    <Image
                                        src={`${baseUrl}/images_pedidosproduccion/${item.imagen}`}
                                        style={styles.image}
                                    />
                                ) : null}
                            </View>
                        </View>
                    ))}
                </View>

            </Page>
        </Document>
    );
};

export default PedidoProduccionPDF;