<?php

namespace App\Http\Requests\Planificacion;

use Illuminate\Foundation\Http\FormRequest;

class ReordenarRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'id_area' => 'required|integer',
            'fecha' => 'required|date_format:Y-m-d',
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ];
    }
}