<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Runs on every start of the environment, so every seeder must be idempotent
     * (updateOrCreate / firstOrCreate).
     */
    public function run(): void
    {
        $this->call([
            AreaSeeder::class,
            UserSeeder::class,
        ]);
    }
}
