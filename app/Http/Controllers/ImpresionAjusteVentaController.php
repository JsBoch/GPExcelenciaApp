<?php

namespace App\Http\Controllers;

use Barryvdh\DomPDF\Facade\Pdf;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ImpresionAjusteVentaController extends Controller
{
    public function imprimir(int $id)
    {
        Gate::authorize('ajustes-ventas.consultar');

        $ajuste = DB::table('adm_ajustes_venta as a')
            ->join('adm_cotizacion as c', 'c.idcotizacion', '=', 'a.idcotizacion')
            ->leftJoin('clientes as cl', 'cl.idcliente', '=', 'a.idcliente')
            ->leftJoin('users as us', 'us.id', '=', 'a.idusuario_solicita')
            ->leftJoin('users as ua', 'ua.id', '=', 'a.idusuario_aprueba')
            ->where('a.idajuste', $id)
            ->select(
                'a.*',
                'c.nocotizacion',
                'cl.nombre as cliente',
                'us.name as solicitante',
                'ua.name as autorizador'
            )
            ->first();

        abort_if(!$ajuste, 404, 'El ajuste no existe.');
        abort_unless($ajuste->estado === 'APROBADO', 422,
            'Solo se pueden imprimir ajustes comerciales aprobados.');

        $detalles = DB::table('adm_ajustes_venta_detalle')
            ->where('idajuste', $id)
            ->orderBy('iddetalleajuste')
            ->get([
                'iddetallecotizacion',
                'descripcion',
                'cantidad_anterior',
                'cantidad_nueva',
                'total_anterior',
                'total_nuevo',
                'diferencia',
            ]);

        abort_if($detalles->isEmpty(), 422, 'El ajuste no tiene renglones.');

        // El logo se incorpora como Data URI: no necesita habilitar acceso remoto en DomPDF.
        $logo = null;
        $rutaLogo = public_path('images/LogoGPv3.jpg');
        if (is_file($rutaLogo) && is_readable($rutaLogo)) {
            $contenido = file_get_contents($rutaLogo);
            if ($contenido !== false) {
                $logo = 'data:image/jpeg;base64,' . base64_encode($contenido);
            }
        }

        $pdf = Pdf::loadView('pdf.ajuste-venta', [
            'ajuste' => $ajuste,
            'detalles' => $detalles,
            'logo' => $logo,
        ])->setPaper('letter', 'portrait');

        $nombre = sprintf('AJ-%05d_CT%s.pdf', $ajuste->idajuste, $ajuste->nocotizacion);

        return $pdf->stream($nombre);
    }
}
