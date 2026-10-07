<?php

namespace App\Http\Requests\Users;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('user'));
    }

    /**
     * Partial edit: each field is optional, but never empty when sent. The e-mail is not editable.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'role' => ['sometimes', 'required', Rule::enum(Role::class)],
            'area_id' => ['sometimes', 'required', 'integer', 'exists:areas,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nome',
            'role' => 'perfil',
            'area_id' => 'área',
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                /** @var User $target */
                $target = $this->route('user');

                if (
                    $this->user()?->is($target)
                    && ! $validator->errors()->has('role')
                    && $this->has('role')
                    && $this->input('role') !== $target->role->value
                ) {
                    $validator->errors()->add('role', __('users.cannot_change_own_role'));
                }
            },
        ];
    }
}
