<?php

namespace App\Http\Requests\Planificacion;

use Illuminate\Foundation\Http\FormRequest;

class MoverRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id_planificacion' => 'required|integer',
            'to_area' => 'required|integer',
            'to_fecha' => 'required|date_format:Y-m-d',
            'to_index' => 'required|integer|min:0',
        ];
    }
}