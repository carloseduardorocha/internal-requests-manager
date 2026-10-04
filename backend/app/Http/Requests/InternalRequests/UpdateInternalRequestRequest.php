<?php

namespace App\Http\Requests\InternalRequests;

use App\Enums\InternalRequestPriority;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateInternalRequestRequest extends FormRequest
{
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('internal_request'));
    }

    /**
     * Partial edit: each field is optional, but never empty when sent.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string', 'max:10000'],
            'priority' => ['sometimes', 'required', Rule::enum(InternalRequestPriority::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'title' => 'título',
            'description' => 'descrição',
            'priority' => 'prioridade',
            'status' => 'status',
        ];
    }
}
