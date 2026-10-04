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
            ['solicitante@empresa.com', 'Ana Souza', Role::Requester, 'Financeiro'],
            ['analista@empresa.com', 'Bruno Lima', Role::Analyst, 'Operações'],
            ['admin@empresa.com', 'Carla Mendes', Role::Admin, 'Tecnologia'],
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
}
