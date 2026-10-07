<?php

namespace Tests\Unit\Invitations;

use App\Actions\Invitations\AcceptInvitation;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

class AcceptInvitationActionTest extends TestCase
{
    use RefreshDatabase;

    private function requestWithSession(): Request
    {
        $request = Request::create('/');
        $request->setLaravelSession(new Store('test', new ArraySessionHandler(10)));

        return $request;
    }

    public function test_an_invitation_already_accepted_does_not_create_a_second_user(): void
    {
        [, $token] = Invitation::factory()->accepted()->createWithToken(['email' => 'maria@empresa.com']);

        try {
            app(AcceptInvitation::class)->handle($this->requestWithSession(), $token, 'segredo123');
            $this->fail('Expected NotFoundHttpException.');
        } catch (NotFoundHttpException) {
            // expected
        }

        $this->assertSame(0, User::where('email', 'maria@empresa.com')->count());
    }

    public function test_it_creates_the_user_once_and_marks_the_invitation_as_accepted(): void
    {
        [$invitation, $token] = Invitation::factory()->createWithToken(['email' => 'maria@empresa.com']);
        $action = app(AcceptInvitation::class);

        $user = $action->handle($this->requestWithSession(), $token, 'segredo123');

        $this->assertSame('maria@empresa.com', $user->email);
        $this->assertNotNull($invitation->fresh()->accepted_at);

        $this->expectException(NotFoundHttpException::class);
        $action->handle($this->requestWithSession(), $token, 'segredo123');
    }

    public function test_the_invitation_is_read_with_a_row_lock_inside_the_transaction(): void
    {
        [, $token] = Invitation::factory()->createWithToken();
        $locked = [];
        DB::listen(function ($query) use (&$locked) {
            if (str_contains($query->sql, 'from `invitations`') || str_contains($query->sql, 'from "invitations"')) {
                $locked[] = str_contains(strtolower($query->sql), 'for update');
            }
        });

        app(AcceptInvitation::class)->handle($this->requestWithSession(), $token, 'segredo123');

        $this->assertNotEmpty($locked);
        $this->assertNotContains(false, $locked, 'The invitation must be read with lockForUpdate().');
    }

    public function test_it_requires_a_session(): void
    {
        [, $token] = Invitation::factory()->createWithToken();

        $this->expectException(TokenMismatchException::class);

        app(AcceptInvitation::class)->handle(Request::create('/'), $token, 'segredo123');
    }
}
