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
            [self::email('solicitante'), 'Carlos Solicitante', Role::Requester, 'Financeiro'],
            [self::email('analista'), 'Carlos Analista', Role::Analyst, 'Operações'],
            [self::email('admin'), 'Carlos Administrador', Role::Admin, 'Tecnologia'],
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
     * Fixed seed user address: `carlos.dev.rocha+<name>@gmail.com`, so notification e-mails reach the demo owner.
     */
    public static function email(string $name): string
    {
        return "carlos.dev.rocha+{$name}@gmail.com";
    }
}
