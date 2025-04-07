import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Buffer } from 'buffer'; // Importa Buffer

// Configura Buffer para el navegador
if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
    window.Buffer = Buffer;
}

// Registrar fuente (Asegúrate de tener la fuente Roboto en tu proyecto)
Font.register({
    family: 'Roboto',
    fonts: [
        { src: '/fonts/Roboto-Italic-VariableFont_wdth,wght.ttf', fontStyle: 'italic' }, // Normal
        { src: '/fonts/Roboto-VariableFont_wdth,wght.ttf', fontWeight: 700 } // Bold
    ]
});

// Estilos para el PDF
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Roboto',
        fontSize: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    logo: {
        width: 100,
        marginRight: 20,
    },
    headerText: {
        fontSize: 12,
    },
    customerInfo: {
        marginBottom: 20,
    },
    table: {
        display: 'table',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
        backgroundColor: 'rgb(39,50,56)',
        color: 'white',
    },
    tableRowData: {
        margin: 'auto',
        flexDirection: 'row',
    },
    tableCol: {
        width: '25%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 5,
    },
    tableCell: {
        margin: 'auto',
        marginTop: 5,
        fontSize: 10,
    },
    footer: {
        marginTop: 20,
        alignItems: 'flex-end',
    },
});

const CotizacionPDF = ({ cotizacion, totalEnLetras, logoSrc }) => (
    <Document>
        <Page style={styles.page}>
            <View style={styles.header}>
                <Image style={styles.logo} src={logoSrc} />
                <View style={styles.headerText}>
                    <Text>GP EXCELENCIA, S.A.</Text>
                    <Text>Tel: 2309-9419 / 2294-9257</Text>
                    <Text>11 calle 41-20 Aldea "El Naranjito"</Text>
                    <Text>Zona 6 de Mixco Guatemala</Text>
                    <Text>Ventas: servicioalcliente@gpexcelencia.com</Text>
                    <Text>Contabilidad: creditos@gpexcelencia.com</Text>
                    <Text>www.gpexcelencia.com</Text>
                </View>
                <View style={{ position: 'absolute', top: 30, right: 30, width: 100, paddingLeft: 5, alignItems: 'flex-start' }}>
                    <Text style={{fontSize:10}}>COTIZACION: {cotizacion.nocotizacion}</Text>
                    <View style={{
                        marginTop:4,
                        backgroundColor: 'rgb(39,50,56)',
                        color: 'white',
                        padding: 2,  // Ajusta el padding según necesites
                        marginBottom: 2 // Espacio entre "DIA MES AÑO" y la fecha
                    }}>
                        <Text style={{ fontSize: 8 }}>DIA  MES  AÑO</Text>
                    </View>
                    <Text style={{ fontSize: 10 }}>
                        {cotizacion.fecha_cotizacion ?
                            new Date(cotizacion.fecha_cotizacion).toLocaleDateString('es-GT', { // 'es-GT' para formato de Guatemala
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            })
                            : 'N/A' // Maneja el caso en que fecha_cotizacion sea null o undefined
                        }
                    </Text>
                </View>
            </View>

            <View style={styles.customerInfo}>
                <Text>NOMBRE: {cotizacion.cliente}</Text>
                <Text>Nit: {cotizacion.nit || 'N/A'}</Text>
                <Text>CONTACTO: {cotizacion.contacto}</Text>
                <Text>Tel: {cotizacion.telefono_vendedor || 'N/A'}</Text>
                <Text>VENDEDOR: {cotizacion.vendedor || 'N/A'}</Text>
                <Text>Correo: {cotizacion.correo_vendedor || 'N/A'}</Text>
                <Text>FORMA DE PAGO: {cotizacion.tipo_pago}</Text>
            </View>

            <View style={styles.table}>
                <View style={styles.tableRow}>
                    <View style={[styles.tableCol, { fontWeight: 700 }]}><Text style={styles.tableCell}>CANTIDAD</Text></View>
                    <View style={[styles.tableCol, { fontWeight: 700 }]}><Text style={styles.tableCell}>DESCRIPCIÓN</Text></View>
                    <View style={[styles.tableCol, { fontWeight: 700 }]}><Text style={styles.tableCell}>PRECIO</Text></View>
                    <View style={[styles.tableCol, { fontWeight: 700 }]}><Text style={styles.tableCell}>TOTAL</Text></View>
                </View>
                {cotizacion.detalles.map((detalle, index) => (
                    <View style={styles.tableRowData} key={index}>
                        <View style={styles.tableCol}><Text style={styles.tableCell}>{detalle.cantidad}</Text></View>
                        <View style={styles.tableCol}><Text style={styles.tableCell}>{detalle.descripcion}</Text></View>
                        <View style={styles.tableCol}><Text style={styles.tableCell}>{detalle.precio}</Text></View>
                        <View style={styles.tableCol}><Text style={styles.tableCell}>{detalle.total}</Text></View>
                    </View>
                ))}
            </View>
            <View style={{
                marginTop:40,
                backgroundColor: 'rgb(39,50,56)',
                color: 'white',
                padding: 2,
                width: '100%',     // Ancho completo
                alignItems: 'left',// Centrar el título horizontalmente
                marginBottom: 5
            }}>
                <Text style={{ fontSize: 10, color: 'white' }}>TOTAL GENERAL</Text>
            </View>
            <View style={{ borderBottom: '2px solid rgb(39,50,56)', marginBottom: 5 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ alignItems: 'flex-start' }}>
                    {totalEnLetras && <Text style={{ fontSize: 12 }}>Total en Letras: {totalEnLetras}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 14, marginRight: 10 }}>Total: {cotizacion.total_general}</Text>
                </View>
            </View>
        </Page>
    </Document>
);

export default CotizacionPDF;