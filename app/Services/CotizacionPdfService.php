<?php

namespace App\Services;

use App\Models\AdmCotizacion;
use App\Models\AdmDetalleCotizacion;

class CotizacionPdfService
{
    public function obtener(int $id)
    {
        $cotizacion = AdmCotizacion::where('c.idcotizacion', $id)
            ->select(
                'c.idcotizacion',
                'c.nocotizacion',
                'c.fecha_cotizacion',
                't.tipo as tipo_pago',
                'c.total_general',
                'c.costear',
                'cl.nombre as cliente',
                'cl.nit as nit',
                'ct.nombre as contacto',
                'e.nombre as vendedor',
                'e.movil as telefono_vendedor',
                'e.correo_personal as correo_vendedor',
                'c.direccion_entrega',
                'c.observaciones_costeo',
                'c.observaciones_cliente',
                'c.costeo_observaciones',
                'c.trabajo',
                'c.version',
                'c.tipo_facturacion',
                'c.descuento_monto',
                'c.subtotal',
                'c.impuesto_iva',
                'c.total',                
            )
            ->from('adm_cotizacion as c')
            ->join('clientes as cl', 'c.idcliente', '=', 'cl.idcliente')
            ->join('contacto_cliente as ct', 'c.idcontacto', '=', 'ct.id_contactocliente')
            ->join('adm_empleados as e', 'c.idusuario', '=', 'e.iduser')
            ->join('adm_tipo_pago as t', 'c.idtipopago', '=', 't.idtipopago')
            ->first();

        if (!$cotizacion) {
            return null;
        }

        $cotizacion->detalles = AdmDetalleCotizacion::where(
            'idcotizacion',
            $id
        )->get();

        $cotizacion->numero_interno = 'GP-' . str_pad((string) $cotizacion->nocotizacion, 6, '0', STR_PAD_LEFT);

        return $cotizacion;
    }
}