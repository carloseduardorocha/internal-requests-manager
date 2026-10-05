<?php

namespace App\Http\Controllers;

use App\Actions\InternalRequests\AssumeInternalRequest;
use App\Actions\InternalRequests\DecideInternalRequest;
use App\Enums\InternalRequestStatus;
use App\Http\Requests\InternalRequests\DecideInternalRequestRequest;
use App\Http\Resources\InternalRequestResource;
use App\Models\InternalRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class InternalRequestReviewController extends Controller
{
    private const WITH = ['requester', 'area', 'assignedTo', 'decidedBy', 'statusChanges.changedBy'];

    public function assign(Request $request, InternalRequest $internalRequest, AssumeInternalRequest $assume): InternalRequestResource
    {
        Gate::authorize('assign', $internalRequest);

        $internalRequest = $assume->handle($internalRequest, $request->user());

        return new InternalRequestResource($internalRequest->load(self::WITH));
    }

    public function approve(
        DecideInternalRequestRequest $request,
        InternalRequest $internalRequest,
        DecideInternalRequest $decide,
    ): InternalRequestResource {
        return $this->decide($request, $internalRequest, $decide, InternalRequestStatus::Approved);
    }

    public function reject(
        DecideInternalRequestRequest $request,
        InternalRequest $internalRequest,
        DecideInternalRequest $decide,
    ): InternalRequestResource {
        return $this->decide($request, $internalRequest, $decide, InternalRequestStatus::Rejected);
    }

    private function decide(
        DecideInternalRequestRequest $request,
        InternalRequest $internalRequest,
        DecideInternalRequest $decide,
        InternalRequestStatus $decision,
    ): InternalRequestResource {
        $internalRequest = $decide->handle(
            $internalRequest,
            $request->user(),
            $decision,
            $request->string('justification')->toString(),
        );

        return new InternalRequestResource($internalRequest->load(self::WITH));
    }
}
