<?php

namespace App\Http\Controllers;

use App\Actions\InternalRequests\CreateInternalRequest;
use App\Actions\InternalRequests\DeleteInternalRequest;
use App\Actions\InternalRequests\UpdateInternalRequest;
use App\Enums\InternalRequestPriority;
use App\Http\Requests\InternalRequests\IndexInternalRequestRequest;
use App\Http\Requests\InternalRequests\StoreInternalRequestRequest;
use App\Http\Requests\InternalRequests\UpdateInternalRequestRequest;
use App\Http\Resources\InternalRequestResource;
use App\Models\InternalRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class InternalRequestController extends Controller
{
    private const WITH = ['requester', 'area', 'assignedTo', 'decidedBy'];

    public function index(IndexInternalRequestRequest $request): AnonymousResourceCollection
    {
        $descending = ($request->input('sort') ?? '-created_at') === '-created_at';
        $direction = $descending ? 'desc' : 'asc';

        $query = InternalRequest::query()
            ->with(self::WITH)
            ->visibleTo($request->user())
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('priority'), fn ($q) => $q->where('priority', $request->input('priority')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.addcslashes($request->string('search')->toString(), '%_\\').'%';

                $q->where(fn ($inner) => $inner->where('title', 'like', $term)->orWhere('description', 'like', $term));
            })
            ->orderBy('created_at', $direction)
            ->orderBy('id', $direction);

        return InternalRequestResource::collection(
            $query->paginate($request->integer('per_page') ?: 15)->withQueryString(),
        );
    }

    public function store(StoreInternalRequestRequest $request, CreateInternalRequest $create): JsonResponse
    {
        $internalRequest = $create->handle(
            $request->user(),
            $request->string('title')->toString(),
            $request->string('description')->toString(),
            InternalRequestPriority::from($request->string('priority')->toString()),
        );

        return (new InternalRequestResource($internalRequest->load(self::WITH)))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(InternalRequest $internalRequest): InternalRequestResource
    {
        Gate::authorize('view', $internalRequest);

        return new InternalRequestResource(
            $internalRequest->load([...self::WITH, 'statusChanges.changedBy']),
        );
    }

    public function update(
        UpdateInternalRequestRequest $request,
        InternalRequest $internalRequest,
        UpdateInternalRequest $update,
    ): InternalRequestResource {
        $internalRequest = $update->handle($internalRequest, $request->validated());

        return new InternalRequestResource($internalRequest->load(self::WITH));
    }

    public function destroy(Request $request, InternalRequest $internalRequest, DeleteInternalRequest $delete): Response
    {
        Gate::authorize('delete', $internalRequest);

        $delete->handle($internalRequest, $request->user());

        return response()->noContent();
    }
}
