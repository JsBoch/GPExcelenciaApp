// utils/calculosCotizacion.js

export const IVA_FACTOR = 1.12;

export function calcularDetalleConIVA({ cantidad, precio_unitario, descuento }) {
  const cantidadNum = parseFloat(cantidad) || 0;
  const precioUnitario = parseFloat(precio_unitario) || 0;
  const descuentoNum = parseFloat(descuento) || 0;

  const brutoConIva = cantidadNum * precioUnitario;
  const totalConDescuento = brutoConIva - descuentoNum;

  const subtotalSinIva = totalConDescuento / IVA_FACTOR;
  const impuestoIva = subtotalSinIva * 0.12;
  const porcentajeAplicado = descuentoNum > 0 ? (descuentoNum / brutoConIva) * 100 : 0;

  return {
    precio: brutoConIva.toFixed(2),
    total: totalConDescuento.toFixed(2),
    impuesto_iva: impuestoIva.toFixed(2),
    subtotal: subtotalSinIva.toFixed(2),
    porcentaje_aplicado: porcentajeAplicado.toFixed(2),
  };
}

export function calcularCabeceraDesdeTotalConIva(totalConIva, descuentoPorcentaje = 0, descuentoMonto = 0) {
  let descuento_monto = 0;
  let descuento_porcentaje = 0;

  if (descuentoPorcentaje > 0) {
    descuento_porcentaje = descuentoPorcentaje;
    descuento_monto = totalConIva * (descuentoPorcentaje / 100);
  } else if (descuentoMonto > 0) {
    descuento_monto = descuentoMonto;
    descuento_porcentaje = (descuentoMonto / totalConIva) * 100;
  }

  const totalConDescuento = totalConIva - descuento_monto;
  const subtotal = totalConDescuento / IVA_FACTOR;
  const impuesto_iva = subtotal * 0.12;

  return {
    descuento_monto: descuento_monto.toFixed(2),
    descuento_porcentaje: descuento_porcentaje.toFixed(2),
    subtotal: subtotal.toFixed(2),
    impuesto_iva: impuesto_iva.toFixed(2),
    total: totalConDescuento.toFixed(2),
  };
}

export function aplicarDescuentoAGrilla(detalles, descuentoPorcentaje) {
  const porcentaje = parseFloat(descuentoPorcentaje) || 0;
  return detalles.map((item) => {
    const cantidad = parseFloat(item.cantidad) || 0;
    const precio_unitario = parseFloat(item.precio_unitario) || 0;
    const precioBruto = cantidad * precio_unitario;
    const descuento = (porcentaje > 0 ? precioBruto * (porcentaje / 100) : 0);

    return {
      ...item,
      ...calcularDetalleConIVA({
        cantidad,
        precio_unitario,
        descuento,
      }),
      descuento: descuento.toFixed(2),
    };
  });
}
