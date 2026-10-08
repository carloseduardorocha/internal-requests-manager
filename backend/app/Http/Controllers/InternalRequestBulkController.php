<?php

namespace App\Http\Controllers;

use App\Actions\InternalRequests\BulkAssumeInternalRequests;
use App\Actions\InternalRequests\BulkDeleteInternalRequests;
use App\Http\Requests\InternalRequests\BulkInternalRequestRequest;
use Illuminate\Http\JsonResponse;

class InternalRequestBulkController extends Controller
{
    public function delete(BulkInternalRequestRequest $request, BulkDeleteInternalRequests $delete): JsonResponse
    {
        return response()->json(['data' => $delete->handle($this->ids($request), $request->user())->toArray()]);
    }

    public function assign(BulkInternalRequestRequest $request, BulkAssumeInternalRequests $assume): JsonResponse
    {
        return response()->json(['data' => $assume->handle($this->ids($request), $request->user())->toArray()]);
    }

    /**
     * @return list<int>
     */
    private function ids(BulkInternalRequestRequest $request): array
    {
        return array_map('intval', array_values($request->validated('ids')));
    }
}
