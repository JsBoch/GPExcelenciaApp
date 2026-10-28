<?php

namespace Tests\Feature;

use Tests\TestCase;

class NotaFELPdfFrase922Test extends TestCase
{
    private const ADVERTENCIA =
        'Documento emitido posterior a los dos meses de la factura,';

    private function renderizarNota(
        bool $esCredito,
        bool $mostrarFrase922
    ): string {
        $empresa = [
            'nombre' => 'GP EXCELENCIA PRUEBAS',
            'nit' => 'TEST',
            'direccion' => 'DIRECCION FICTICIA',
            'telefonos' => '00000000',
            'email' => 'test@example.invalid',
            'web' => 'example.invalid',
        ];

        $nota = (object) [
            'tipo' => $esCredito ? 'NCRE' : 'NDEB',
            'serie_nota' => 'TEST',
            'numero_nota' => '100',
            'uuid_nota' => 'UUID-NOTA-FICTICIO',
            'fecha_nota' => '2026-10-29',
            'cliente' => 'CLIENTE DE PRUEBA',
            'direccion' => 'DIRECCION FICTICIA',
            'receptor_numero' => 'TEST',
            'motivo' => 'AJUSTE DE PRUEBA',
            'monto_gravable' => 89.29,
            'monto_impuesto' => 10.71,
            'monto' => 100.00,
            'exento_iva' => 'N',
            'serie_factura' => 'FAC',
            'numero_factura' => '200',
            'uuid_factura' => 'UUID-ORIGEN-FICTICIO',
            'fecha_factura' => '2026-08-28',
        ];

        return view('pdf.nota_fel', [
            'nota' => $nota,
            'empresa' => $empresa,
            'esCredito' => $esCredito,
            'mostrarFrase922' => $mostrarFrase922,
        ])->render();
    }

    public function test_ncre_con_frase_922_muestra_advertencia(): void
    {
        $html = $this->renderizarNota(true, true);

        $this->assertStringContainsString(
            self::ADVERTENCIA,
            $html
        );

        $this->assertStringContainsString(
            'según Art. 17 Ley del IVA.',
            $html
        );

        $this->assertStringContainsString(
            'NOTA DE CRÉDITO',
            $html
        );

        $this->assertStringContainsString(
            'UUID-NOTA-FICTICIO',
            $html
        );

        $this->assertStringContainsString(
            'UUID-ORIGEN-FICTICIO',
            $html
        );
    }

    public function test_ncre_sin_frase_922_no_muestra_advertencia(): void
    {
        $html = $this->renderizarNota(true, false);

        $this->assertStringNotContainsString(
            self::ADVERTENCIA,
            $html
        );

        $this->assertStringContainsString(
            'NOTA DE CRÉDITO',
            $html
        );
    }

    public function test_ndeb_no_muestra_advertencia_aunque_reciba_indicador(): void
    {
        $html = $this->renderizarNota(false, true);

        $this->assertStringNotContainsString(
            self::ADVERTENCIA,
            $html
        );

        $this->assertStringContainsString(
            'NOTA DE DÉBITO',
            $html
        );
    }

    public function test_pdf_conserva_importes_y_referencia(): void
    {
        $html = $this->renderizarNota(true, true);

        $this->assertStringContainsString('89.29', $html);
        $this->assertStringContainsString('10.71', $html);
        $this->assertStringContainsString('100.00', $html);
        $this->assertStringContainsString('FAC', $html);
        $this->assertStringContainsString('200', $html);
        $this->assertStringContainsString('2026-08-28', $html);
    }
}
