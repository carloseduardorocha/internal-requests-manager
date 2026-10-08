<?php

namespace App\Http\Requests\InternalRequests;

use App\Http\Requests\BulkIdsRequest;
use App\Models\InternalRequest;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

class BulkInternalRequestRequest extends BulkIdsRequest
{
    public function authorize(): Response
    {
        $ability = match ($this->route()?->getActionMethod()) {
            'delete' => 'bulkDelete',
            'assign' => 'bulkAssign',
            default => null,
        };

        if ($ability === null) {
            return Response::deny();
        }

        return Gate::inspect($ability, InternalRequest::class);
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
