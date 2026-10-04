<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Only development data exists at this point; the seeder recreates it.
        DB::table('users')->delete();

        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->after('password');
            $table->foreignId('area_id')->after('role')->constrained('areas')->restrictOnDelete();
            $table->dropColumn('email_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('area_id');
            $table->dropColumn('role');
            $table->timestamp('email_verified_at')->nullable()->after('email');
        });
    }
};
