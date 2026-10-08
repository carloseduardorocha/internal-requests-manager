<?php

namespace App\Http\Resources;

use App\Actions\InternalRequests\BulkResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BulkResult
 */
class BulkResultResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'done' => $this->done,
            'skipped' => $this->skipped,
        ];
    }
}
