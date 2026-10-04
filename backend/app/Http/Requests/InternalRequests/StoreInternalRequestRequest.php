<?php

namespace App\Http\Requests\InternalRequests;

use App\Enums\InternalRequestPriority;
use App\Models\InternalRequest;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreInternalRequestRequest extends FormRequest
{
    public function authorize(): Response
    {
        return Gate::inspect('create', InternalRequest::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:10000'],
            'priority' => ['required', Rule::enum(InternalRequestPriority::class)],
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
