<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Etapa 62: aplica exclusivamente notas FEL certificadas a una CxC GTQ.
 * No invocar desde rutas de usuario ni desde la preparación/transmisión FEL.
 * La aplicación se integrará al flujo fiscal después de completar sus pruebas.
 */
final class AplicadorNotasFELCxC
{
    private static function milis($valor): int
    {
        if (!is_numeric($valor)) {
            throw new RuntimeException('Importe no numérico en CxC.');
        }
        return (int) round(((float) $valor) * 1000);
    }

    private static function importe(int $milis): string
    {
        return number_format($milis / 1000, 3, '.', '');
    }

    public function aplicar(int $idnota, ?int $idusuario = null): array
    {
        return DB::transaction(function () use ($idnota, $idusuario) {
            // Nota: lectura sin lock para localizar la CxC. Su validez se confirma
            // nuevamente tras bloquear la cuenta. No se modifica aquí la nota.
            $referencia = DB::table('adm_notas_fel')->where('idnota', $idnota)->first();
            if (!$referencia) {
                throw new RuntimeException('La nota FEL no existe.');
            }

            // Una sola CxC por cotización, según UNIQUE(idcotizacion).
            $cxc = DB::table('adm_cuentas_porcobrar')
                ->where('idcotizacion', $referencia->idcotizacion)
                ->lockForUpdate()->first();

            if (!$cxc) {
                throw new RuntimeException('No existe CxC asociada a esta nota; requiere revisión contable.');
            }

            // Releer los datos fiscales dentro de la transacción.
            $nota = DB::table('adm_notas_fel')->where('idnota', $idnota)->first();
            if (!$nota || (int) $nota->idcotizacion !== (int) $cxc->idcotizacion) {
                throw new RuntimeException('La nota FEL cambió durante la operación.');
            }

            $existente = DB::table('adm_cxc_movimientos_fel')->where('idnota', $idnota)->first();
            if ($existente) {
                if ((int) $existente->idcuentaporcobrar !== (int) $cxc->idcuentaporcobrar) {
                    throw new RuntimeException('Movimiento FEL existente vinculado a otra cuenta.');
                }
                return [
                    'valido' => true,
                    'ya_existia' => true,
                    'idmovimiento' => (int) $existente->idmovimiento,
                    'saldo_nuevo' => (string) $existente->saldo_nuevo,
                    'excedente' => (string) $existente->excedente,
                ];
            }

            if (!in_array((string) $nota->tipo, ['NCRE', 'NDEB'], true)
                || (string) $nota->resultado !== 'S'
                || trim((string) $nota->uuid_nota) === ''
                || trim((string) $nota->identificador) === '') {
                throw new RuntimeException('Nota FEL sin certificación confirmada.');
            }

            $intento = DB::table('adm_fel_intentos')
                ->where('identificador', $nota->identificador)
                ->where('tipo_documento', $nota->tipo)
                ->where('idnota', $nota->idnota)
                ->where('estado', 'CERTIFICADO')
                ->where('uuid', $nota->uuid_nota)
                ->where('uuid_origen', $nota->uuid_origen)
                ->first(['idintento']);
            if (!$intento) {
                throw new RuntimeException('No hay intento FEL certificado y coincidente con la nota.');
            }

            if ((int) $cxc->estado !== 1
                || (int) $cxc->idcliente !== (int) $nota->idcliente
                || (string) $cxc->moneda !== 'GTQ'
                || (int) $cxc->idfactura !== (int) $nota->idfactura_origen) {
                throw new RuntimeException('CxC inactiva, de otro cliente, moneda o factura.');
            }

            $factura = DB::table('adm_facturacion')
                ->where('idfactura', $nota->idfactura_origen)
                ->where('idcotizacion', $nota->idcotizacion)
                ->where('uuid', $nota->uuid_origen)
                ->where('resultado', 'S')
                ->where('estado', 1)
                ->first(['idfactura']);
            if (!$factura) {
                throw new RuntimeException('Factura original no certificada o no vigente.');
            }

            $monto = self::milis($nota->monto_total);
            $anterior = self::milis($cxc->saldo_pendiente);
            if ($monto <= 0 || $anterior < 0) {
                throw new RuntimeException('Monto de nota o saldo CxC inválido.');
            }

            if ($nota->tipo === 'NCRE') {
                $aplicado = min($monto, $anterior);
                $nuevo = $anterior - $aplicado;
                $excedente = $monto - $aplicado;
            } else {
                $aplicado = $monto;
                $nuevo = $anterior + $monto;
                $excedente = 0;
            }

            // La clave UNIQUE(idnota) impide aplicar dos veces la misma nota,
            // incluso si otros procesos intentan hacerlo simultáneamente.
            $idmovimiento = DB::table('adm_cxc_movimientos_fel')->insertGetId([
                'idcuentaporcobrar' => $cxc->idcuentaporcobrar,
                'idnota' => $idnota,
                'tipo' => $nota->tipo,
                'monto_nota' => self::importe($monto),
                'monto_aplicado' => self::importe($aplicado),
                'excedente' => self::importe($excedente),
                'saldo_anterior' => self::importe($anterior),
                'saldo_nuevo' => self::importe($nuevo),
                'fecha_registro' => now(),
                'idusuario_registro' => $idusuario,
                'observaciones' => 'Aplicación única de nota FEL certificada',
            ]);

            DB::table('adm_cuentas_porcobrar')
                ->where('idcuentaporcobrar', $cxc->idcuentaporcobrar)
                ->update([
                    'saldo_pendiente' => self::importe($nuevo),
                    'fecha_modificacion' => now(),
                    // No modificar monto_original, monto_pagado ni recibos.
                ]);

            return [
                'valido' => true,
                'ya_existia' => false,
                'idmovimiento' => (int) $idmovimiento,
                'idcuentaporcobrar' => (int) $cxc->idcuentaporcobrar,
                'tipo' => (string) $nota->tipo,
                'saldo_anterior' => self::importe($anterior),
                'saldo_nuevo' => self::importe($nuevo),
                'excedente' => self::importe($excedente),
            ];
        }, 3);
    }
}
