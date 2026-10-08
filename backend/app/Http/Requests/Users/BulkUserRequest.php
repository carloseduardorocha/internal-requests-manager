<?php

namespace App\Http\Requests\Users;

use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class BulkUserRequest extends FormRequest
{
    /**
     * The ability follows the controller method: deactivate -> bulkDeactivate, reactivate -> bulkReactivate.
     */
    public function authorize(): Response
    {
        return Gate::inspect('bulk'.ucfirst($this->route()?->getActionMethod() ?? ''), User::class);
    }

    /**
     * Unknown IDs are not a validation error: they come back as skipped. The cap matches the list's max per_page.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'distinct'],
        ];
    }

    /**
     * @return list<int>
     */
    public function ids(): array
    {
        return array_values(array_map('intval', $this->validated('ids')));
    }
}
