<?php

namespace App\Http\Requests\InternalRequests;

use App\Enums\InternalRequestPriority;
use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class IndexInternalRequestRequest extends FormRequest
{
    public function authorize(): Response
    {
        return Gate::inspect('viewAny', InternalRequest::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'nullable', Rule::enum(InternalRequestStatus::class)],
            'priority' => ['sometimes', 'nullable', Rule::enum(InternalRequestPriority::class)],
            'sort' => ['sometimes', 'nullable', Rule::in(['created_at', '-created_at'])],
            'per_page' => ['sometimes', 'nullable', 'integer', 'between:1,100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'search' => 'pesquisa',
            'status' => 'status',
            'priority' => 'prioridade',
            'sort' => 'ordenação',
            'per_page' => 'itens por página',
        ];
    }
}
