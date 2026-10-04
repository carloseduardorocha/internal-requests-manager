<?php

namespace Tests\Unit\InternalRequests;

use App\Actions\InternalRequests\DeleteInternalRequest;
use App\Actions\InternalRequests\UpdateInternalRequest;
use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

class StatusChangeRaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_update_conflicts_when_status_changed_after_loading(): void
    {
        $request = InternalRequest::factory()->create(['title' => 'Original']);
        $stale = InternalRequest::findOrFail($request->id);
        InternalRequest::whereKey($request->id)->update(['status' => InternalRequestStatus::InReview]);

        try {
            app(UpdateInternalRequest::class)->handle($stale, ['title' => 'Alterado']);
            $this->fail('Expected ConflictHttpException.');
        } catch (ConflictHttpException) {
            $this->assertSame('Original', $request->fresh()->title);
        }
    }

    public function test_delete_conflicts_when_status_changed_after_loading(): void
    {
        $request = InternalRequest::factory()->create();
        $stale = InternalRequest::findOrFail($request->id);
        InternalRequest::whereKey($request->id)->update(['status' => InternalRequestStatus::InReview]);

        try {
            app(DeleteInternalRequest::class)->handle($stale, User::factory()->admin()->create());
            $this->fail('Expected ConflictHttpException.');
        } catch (ConflictHttpException) {
            $this->assertNotSoftDeleted($request);
            $this->assertNull($request->fresh()->deleted_by);
        }
    }
}
