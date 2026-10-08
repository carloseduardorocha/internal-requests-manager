<?php

namespace App\Actions\InternalRequests;

use App\Actions\BulkResult;
use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Runs a single-request action over a list of IDs. Each request is processed on its own (its own
 * transaction, inside the individual Action), so one that fails does not undo the others.
 */
abstract class BulkInternalRequestAction
{
    /**
     * Policy ability checked for each request.
     */
    abstract protected function ability(): string;

    /**
     * Runs the individual Action on one request.
     *
     * @throws ConflictHttpException
     */
    abstract protected function process(InternalRequest $internalRequest, User $user): void;

    /**
     * @param  list<int>  $ids
     */
    public function handle(array $ids, User $user): BulkResult
    {
        $done = [];
        $skipped = [];

        foreach ($ids as $id) {
            $internalRequest = InternalRequest::query()->find($id);
            // A missing request and one the policy refuses get the same answer.
            $response = $internalRequest === null ? null : Gate::forUser($user)->inspect($this->ability(), $internalRequest);

            if ($response === null || $response->denied()) {
                $skipped[] = $this->skip($id, 'not_found', __('internal_requests.not_found'));

                continue;
            }

            try {
                $this->process($internalRequest, $user);
            } catch (ConflictHttpException $e) {
                $skipped[] = $this->skip($id, 'not_open', $e->getMessage());

                continue;
            }

            $done[] = $id;
        }

        return new BulkResult($done, $skipped);
    }

    /**
     * @return array{id: int, reason: string, message: string}
     */
    private function skip(int $id, string $reason, string $message): array
    {
        return ['id' => $id, 'reason' => $reason, 'message' => $message];
    }
}
