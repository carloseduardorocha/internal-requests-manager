<?php

namespace App\Http\Controllers;

use App\Actions\InternalRequests\BulkAssumeInternalRequests;
use App\Actions\InternalRequests\BulkDeleteInternalRequests;
use App\Http\Requests\InternalRequests\BulkInternalRequestRequest;
use App\Http\Resources\BulkResultResource;

class InternalRequestBulkController extends Controller
{
    public function delete(BulkInternalRequestRequest $request, BulkDeleteInternalRequests $delete): BulkResultResource
    {
        return new BulkResultResource($delete->handle($request->ids(), $request->user()));
    }

    public function assign(BulkInternalRequestRequest $request, BulkAssumeInternalRequests $assume): BulkResultResource
    {
        return new BulkResultResource($assume->handle($request->ids(), $request->user()));
    }
}
