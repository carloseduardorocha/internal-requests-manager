<?php

namespace App\Actions\InternalRequests;

use App\Models\InternalRequest;
use App\Models\User;

class BulkDeleteInternalRequests extends BulkInternalRequestAction
{
    public function __construct(private readonly DeleteInternalRequest $delete) {}

    protected function ability(): string
    {
        return 'delete';
    }

    protected function process(InternalRequest $internalRequest, User $user): void
    {
        $this->delete->handle($internalRequest, $user);
    }
}
