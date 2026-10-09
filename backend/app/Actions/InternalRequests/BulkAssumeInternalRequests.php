<?php

namespace App\Actions\InternalRequests;

use App\Models\InternalRequest;
use App\Models\User;

class BulkAssumeInternalRequests extends BulkInternalRequestAction
{
    public function __construct(private readonly AssumeInternalRequest $assume) {}

    protected function ability(): string
    {
        return 'assign';
    }

    protected function process(InternalRequest $internalRequest, User $user): void
    {
        $this->assume->handle($internalRequest, $user);
    }
}
