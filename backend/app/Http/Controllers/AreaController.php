<?php

namespace App\Http\Controllers;

use App\Http\Resources\AreaResource;
use App\Models\Area;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class AreaController extends Controller
{
    public function __invoke(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Area::class);

        return AreaResource::collection(Area::query()->orderBy('name')->get());
    }
}
