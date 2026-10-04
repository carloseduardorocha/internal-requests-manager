<?php

namespace Database\Seeders;

use App\Models\Area;
use Illuminate\Database\Seeder;

class AreaSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['Financeiro', 'Recursos Humanos', 'Tecnologia', 'Operações'] as $name) {
            Area::updateOrCreate(['name' => $name]);
        }
    }
}
