<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class PedidosProduccionExcel implements WithMultipleSheets
{
    protected $idPedido;
    protected $user;

    public function __construct($idPedido, $user)
    {
        $this->idPedido = $idPedido;
        $this->user     = $user;
    }

    public function sheets(): array
    {
        return [
            new Sheets\PedidosResumenSheet($this->idPedido, $this->user),
            new Sheets\PedidosDetalleSheet($this->idPedido, $this->user),
        ];
    }
}

