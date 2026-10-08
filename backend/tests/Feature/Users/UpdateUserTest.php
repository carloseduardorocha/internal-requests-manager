<?php

namespace Tests\Feature\Users;

use App\Enums\Role;
use App\Models\Area;
use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UpdateUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_without_session_is_unauthorized(): void
    {
        $user = User::factory()->create();

        $this->patchJson("/api/users/{$user->id}", ['name' => 'Novo'])->assertUnauthorized();
    }

    public function test_requester_and_analyst_cannot_edit(): void
    {
        $target = User::factory()->create(['name' => 'Original']);

        foreach ([User::factory()->create(), User::factory()->analyst()->create()] as $user) {
            $this->actingAs($user)->patchJson("/api/users/{$target->id}", ['name' => 'Novo'])->assertForbidden();
        }

        $this->assertSame('Original', $target->fresh()->name);
    }

    public function test_unknown_account_is_not_found(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->patchJson('/api/users/999999', ['name' => 'Novo'])
            ->assertNotFound();
    }

    public function test_admin_changes_name_role_and_area(): void
    {
        $target = User::factory()->create();
        $area = Area::factory()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->patchJson("/api/users/{$target->id}", ['name' => 'Nome Novo', 'role' => 'analyst', 'area_id' => $area->id])
            ->assertOk()
            ->assertJsonPath('data.id', $target->id)
            ->assertJsonPath('data.name', 'Nome Novo')
            ->assertJsonPath('data.role', 'analyst')
            ->assertJsonPath('data.area.id', $area->id);

        $fresh = $target->fresh();
        $this->assertSame('Nome Novo', $fresh->name);
        $this->assertSame(Role::Analyst, $fresh->role);
        $this->assertSame($area->id, $fresh->area_id);
    }

    public function test_partial_payload_changes_only_the_sent_fields(): void
    {
        $target = User::factory()->create(['name' => 'Original']);

        $this->actingAs(User::factory()->admin()->create())
            ->patchJson("/api/users/{$target->id}", ['role' => 'analyst'])
            ->assertOk();

        $fresh = $target->fresh();
        $this->assertSame('Original', $fresh->name);
        $this->assertSame($target->area_id, $fresh->area_id);
        $this->assertSame(Role::Analyst, $fresh->role);
    }

    public function test_the_email_cannot_be_changed(): void
    {
        $target = User::factory()->create(['email' => 'ana@empresa.com']);

        $this->actingAs(User::factory()->admin()->create())
            ->patchJson("/api/users/{$target->id}", ['name' => 'Ana Nova', 'email' => 'outro@empresa.com'])
            ->assertOk()
            ->assertJsonPath('data.email', 'ana@empresa.com');

        $fresh = $target->fresh();
        $this->assertSame('ana@empresa.com', $fresh->email);
        $this->assertSame('Ana Nova', $fresh->name);
    }

    public function test_invalid_payloads_are_rejected(): void
    {
        $target = User::factory()->create(['name' => 'Original']);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->patchJson("/api/users/{$target->id}", ['name' => ''])
            ->assertUnprocessable()->assertJsonValidationErrors(['name']);
        $this->actingAs($admin)->patchJson("/api/users/{$target->id}", ['role' => 'boss'])
            ->assertUnprocessable()->assertJsonValidationErrors(['role']);
        $this->actingAs($admin)->patchJson("/api/users/{$target->id}", ['role' => ''])
            ->assertUnprocessable()->assertJsonValidationErrors(['role']);
        $this->actingAs($admin)->patchJson("/api/users/{$target->id}", ['area_id' => 999999])
            ->assertUnprocessable()->assertJsonValidationErrors(['area_id']);
        $this->actingAs($admin)->patchJson("/api/users/{$target->id}", ['area_id' => ''])
            ->assertUnprocessable()->assertJsonValidationErrors(['area_id']);

        $this->assertSame('Original', $target->fresh()->name);
    }

    public function test_the_admin_cannot_change_the_own_role(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Ana']);

        $this->actingAs($admin)
            ->patchJson("/api/users/{$admin->id}", ['name' => 'Ana Nova', 'role' => 'analyst'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role'])
            ->assertJsonPath('errors.role.0', 'Você não pode alterar o próprio perfil.');

        $fresh = $admin->fresh();
        $this->assertSame(Role::Admin, $fresh->role);
        $this->assertSame('Ana', $fresh->name);
    }

    public function test_the_admin_edits_own_name_and_area_and_may_resend_the_same_role(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Ana']);
        $area = Area::factory()->create();

        $this->actingAs($admin)
            ->patchJson("/api/users/{$admin->id}", ['name' => 'Ana Nova', 'role' => 'admin', 'area_id' => $area->id])
            ->assertOk()
            ->assertJsonPath('data.name', 'Ana Nova')
            ->assertJsonPath('data.role', 'admin');

        $fresh = $admin->fresh();
        $this->assertSame('Ana Nova', $fresh->name);
        $this->assertSame($area->id, $fresh->area_id);
    }

    public function test_changing_the_area_does_not_change_requests_already_created(): void
    {
        $oldArea = Area::factory()->create();
        $newArea = Area::factory()->create();
        $target = User::factory()->create(['area_id' => $oldArea->id]);
        $existing = InternalRequest::factory()->create(['requester_id' => $target->id]);
        $this->assertSame($oldArea->id, $existing->area_id);

        $this->actingAs(User::factory()->admin()->create())
            ->patchJson("/api/users/{$target->id}", ['area_id' => $newArea->id])
            ->assertOk();

        $this->assertSame($oldArea->id, $existing->fresh()->area_id);

        $newId = $this->actingAs($target->fresh())
            ->postJson('/api/internal-requests', ['title' => 'Novo', 'description' => 'Texto', 'priority' => 'low'])
            ->assertCreated()
            ->json('data.id');

        $this->assertSame($newArea->id, InternalRequest::findOrFail($newId)->area_id);
        $this->assertSame($oldArea->id, $existing->fresh()->area_id);
    }
}
