<?php

namespace Tests\Feature\Auth;

use App\Enums\Role;
use App\Models\Area;
use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeding_twice_keeps_four_areas_and_one_user_per_role(): void
    {
        $this->seed();
        $this->seed();

        $this->assertSame(4, Area::count());
        $this->assertEqualsCanonicalizing(
            ['Financeiro', 'Recursos Humanos', 'Tecnologia', 'Operações'],
            Area::pluck('name')->all(),
        );

        $this->assertSame(3, User::count());
        foreach (Role::cases() as $role) {
            $this->assertSame(1, User::where('role', $role)->count(), "role {$role->value}");
        }
        $this->assertSame(0, User::whereNull('area_id')->count());
    }

    public function test_seeded_users_can_log_in_with_the_local_password(): void
    {
        $this->seed();

        foreach (['solicitante', 'analista', 'admin'] as $name) {
            $this->postJson('/api/login', ['email' => "{$name}@empresa.com", 'password' => 'password'])
                ->assertOk();
        }
    }

    public function test_seed_users_email_turns_the_seed_users_into_plus_addresses(): void
    {
        config(['app.seed_users_email' => 'pessoa@exemplo.com']);

        $this->seed();

        $this->assertEqualsCanonicalizing(
            ['pessoa+solicitante@exemplo.com', 'pessoa+analista@exemplo.com', 'pessoa+admin@exemplo.com'],
            User::pluck('email')->all(),
        );
        $requester = User::where('email', 'pessoa+solicitante@exemplo.com')->firstOrFail();
        $this->assertGreaterThan(0, InternalRequest::count());
        $this->assertSame(InternalRequest::count(), InternalRequest::where('requester_id', $requester->id)->count());

        $this->postJson('/api/login', ['email' => 'pessoa+analista@exemplo.com', 'password' => 'password'])->assertOk();
    }

    public function test_seeding_in_production_creates_areas_and_no_users(): void
    {
        $this->app['env'] = 'production';

        $this->artisan('db:seed', ['--force' => true])->assertSuccessful();

        $this->assertSame(4, Area::count());
        $this->assertSame(0, User::count());
    }
}
