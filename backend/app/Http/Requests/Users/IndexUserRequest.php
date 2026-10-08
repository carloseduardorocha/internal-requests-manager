<?php

namespace App\Http\Requests\Users;

use App\Enums\AccountStatus;
use App\Enums\Role;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class IndexUserRequest extends FormRequest
{
    public function authorize(): Response
    {
        return Gate::inspect('viewAny', User::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'role' => ['sometimes', 'nullable', Rule::enum(Role::class)],
            'area_id' => ['sometimes', 'nullable', 'integer', 'exists:areas,id'],
            'status' => ['sometimes', 'nullable', Rule::enum(AccountStatus::class)],
            'per_page' => ['sometimes', 'nullable', 'integer', 'between:1,100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'search' => 'pesquisa',
            'role' => 'perfil',
            'area_id' => 'área',
            'status' => 'situação',
            'per_page' => 'itens por página',
        ];
    }
}
