<?php

namespace App\Http\Requests\InternalRequests;

use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class DecideInternalRequestRequest extends FormRequest
{
    public function authorize(): Response
    {
        return Gate::inspect('decide', $this->route('internal_request'));
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'justification' => ['required', 'string', 'max:10000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'justification' => 'justificativa',
        ];
    }
}
