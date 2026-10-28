<?php

namespace Tests\Unit;

use App\Services\Fel\ReglaFrase922;
use Carbon\CarbonImmutable;
use DOMDocument;
use DOMXPath;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class NCREFrase922XMLTest extends TestCase
{
    public static function escenarios(): array
    {
        return [
    'NCRE vencida' => [
        'NCRE',
        '2026-08-28',
        '2026-11-10T10:00:00',
        true,
    ],
    'NCRE ultimo dia' => [
        'NCRE',
        '2026-10-05',
        '2026-12-05T10:00:00',
        false,
    ],
    'NCRE antes de vigencia' => [
        'NCRE',
        '2026-08-28',
        '2026-11-09T10:00:00',
        false,
    ],
    'NDEB no aplica' => [
        'NDEB',
        '2026-08-28',
        '2026-11-10T10:00:00',
        false,
    ],
];
    }

    #[DataProvider('escenarios')]
    public function test_frase_922_en_xml(
        string $tipo,
        string $fechaOrigen,
        string $fechaNota,
        bool $esperado
    ): void {
        $aplica = ReglaFrase922::aplica(
            $tipo,
            $fechaOrigen,
            $fechaNota
        );

        $doc = new DOMDocument('1.0', 'UTF-8');

        $raiz = $doc->createElementNS(
            'http://www.sat.gob.gt/dte/fel/0.2.0',
            'dte:DatosEmision'
        );

        $doc->appendChild($raiz);

        
$namespaceSAT = 'http://www.sat.gob.gt/dte/fel/0.2.0';

// Contenedor de frases.
$frases = $doc->createElementNS(
    $namespaceSAT,
    'dte:Frases'
);

// Frase habitual: Tipo 1, Escenario 1.
$habitual = $doc->createElementNS(
    $namespaceSAT,
    'dte:Frase'
);

$habitual->setAttribute('TipoFrase', '1');
$habitual->setAttribute('CodigoEscenario', '1');

$frases->appendChild($habitual);

// Frase SAT 9-22 cuando corresponde.
if ($aplica) {
    $extemporanea = $doc->createElementNS(
        $namespaceSAT,
        'dte:Frase'
    );

    $extemporanea->setAttribute('TipoFrase', '9');
    $extemporanea->setAttribute('CodigoEscenario', '22');

    $frases->appendChild($extemporanea);
}

$raiz->appendChild($frases);


        $xpath = new DOMXPath($doc);

        $xpath->registerNamespace(
            'dte',
            'http://www.sat.gob.gt/dte/fel/0.2.0'
        );

        $cantidadHabitual = $xpath->query(
            '//dte:Frase[@TipoFrase="1"][@CodigoEscenario="1"]'
        )->length;

        $cantidad922 = $xpath->query(
            '//dte:Frase[@TipoFrase="9"][@CodigoEscenario="22"]'
        )->length;

        $this->assertSame(1, $cantidadHabitual);

        $this->assertSame(
            $esperado ? 1 : 0,
            $cantidad922
        );

        $this->assertSame(
            $esperado,
            $aplica
        );
    }
}
