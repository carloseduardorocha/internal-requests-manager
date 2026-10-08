<?php

namespace App\Http\Resources;

use App\Actions\BulkResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property BulkResult $resource
 */
class BulkResultResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'done' => $this->resource->done,
            'skipped' => $this->resource->skipped,
        ];
    }
}
