<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Area;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Local development users; all use the password "password".
     */
    public function run(): void
    {
        $users = [
            [self::email('solicitante'), 'Ana Souza', Role::Requester, 'Financeiro'],
            [self::email('analista'), 'Bruno Lima', Role::Analyst, 'Operações'],
            [self::email('admin'), 'Carla Mendes', Role::Admin, 'Tecnologia'],
        ];

        foreach ($users as [$email, $name, $role, $area]) {
            User::updateOrCreate(['email' => $email], [
                'name' => $name,
                'password' => 'password',
                'role' => $role,
                'area_id' => Area::where('name', $area)->firstOrFail()->id,
            ]);
        }
    }

    /**
     * Seed user address: `<name>@empresa.com`, or `<local>+<name>@<domain>` when SEED_USERS_EMAIL is set,
     * so notification e-mails reach whoever is testing.
     */
    public static function email(string $name): string
    {
        $base = config('app.seed_users_email');

        if (! is_string($base) || ! str_contains($base, '@')) {
            return "{$name}@empresa.com";
        }

        [$local, $domain] = explode('@', $base, 2);

        return "{$local}+{$name}@{$domain}";
    }
}
