<?php

namespace App\Http\Controllers;

use App\Enums\InternalRequestPriority;
use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        Gate::authorize('viewDashboard', InternalRequest::class);

        $byStatus = array_fill_keys(array_column(InternalRequestStatus::cases(), 'value'), 0);
        $byPriority = array_fill_keys(array_column(InternalRequestPriority::cases(), 'value'), 0);

        $rows = InternalRequest::query()
            ->select('status', 'priority')
            ->selectRaw('count(*) as aggregate')
            ->groupBy('status', 'priority')
            ->get();

        foreach ($rows as $row) {
            $count = (int) $row->getAttribute('aggregate');

            $byStatus[$row->status->value] += $count;
            $byPriority[$row->priority->value] += $count;
        }

        return response()->json([
            'total' => array_sum($byStatus),
            'by_status' => $byStatus,
            'by_priority' => $byPriority,
        ]);
    }
}
