<?php

namespace App\Http\Requests\Invitations;

use App\Enums\Role;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreInvitationRequest extends FormRequest
{
    public function authorize(): Response
    {
        return Gate::inspect('create', Invitation::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', Rule::enum(Role::class)],
            'area_id' => ['required', 'integer', 'exists:areas,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nome',
            'email' => 'e-mail',
            'role' => 'perfil',
            'area_id' => 'área',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => User::where('email', $this->input('email'))->whereNotNull('deactivated_at')->exists()
                ? __('invitations.email_deactivated')
                : __('invitations.email_taken'),
        ];
    }
}
