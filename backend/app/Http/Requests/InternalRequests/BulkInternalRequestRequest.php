<?php

namespace App\Http\Requests\InternalRequests;

use App\Models\InternalRequest;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class BulkInternalRequestRequest extends FormRequest
{
    public function authorize(): Response
    {
        // The route method (delete or assign) names the ability: bulkDelete or bulkAssign.
        $ability = 'bulk'.ucfirst($this->route()?->getActionMethod() ?? '');

        return Gate::inspect($ability, InternalRequest::class);
    }

    /**
     * IDs are not checked against the database: an unknown one is skipped as not found.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'distinct'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'ids' => 'pedidos',
            'ids.*' => 'pedido',
        ];
    }
}
