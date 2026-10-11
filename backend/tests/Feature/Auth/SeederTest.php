<?php

namespace Tests\Feature\Auth;

use App\Enums\Role;
use App\Models\Area;
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

    public function test_seed_creates_exactly_the_three_demo_users(): void
    {
        $this->seed();

        $expected = [
            'carlos.dev.rocha+solicitante@gmail.com' => ['Carlos Solicitante', Role::Requester, 'Financeiro'],
            'carlos.dev.rocha+analista@gmail.com' => ['Carlos Analista', Role::Analyst, 'Operações'],
            'carlos.dev.rocha+admin@gmail.com' => ['Carlos Administrador', Role::Admin, 'Tecnologia'],
        ];

        $this->assertEqualsCanonicalizing(array_keys($expected), User::pluck('email')->all());

        foreach ($expected as $email => [$name, $role, $area]) {
            $user = User::where('email', $email)->firstOrFail();
            $this->assertSame($name, $user->name);
            $this->assertSame($role, $user->role);
            $this->assertSame($area, $user->area->name);

            $this->postJson('/api/login', ['email' => $email, 'password' => 'password'])->assertOk();
        }
    }

    public function test_seeding_in_production_creates_areas_and_no_users(): void
    {
        $this->app['env'] = 'production';

        $this->artisan('db:seed', ['--force' => true])->assertSuccessful();

        $this->assertSame(4, Area::count());
        $this->assertSame(0, User::count());
    }
}
