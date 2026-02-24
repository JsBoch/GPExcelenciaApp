<?php

namespace App\Http\Requests\Planificacion;

use Illuminate\Foundation\Http\FormRequest;

class AsignarRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'iddetallepedidoproduccion' => 'required|integer',
            'id_areatrabajo' => 'required|integer',
            'fecha_programada' => 'required|date_format:Y-m-d',
            'to_index' => 'nullable|integer|min:0',
        ];
    }
}