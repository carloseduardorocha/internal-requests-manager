<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('internal_request_id')->constrained('internal_requests')->restrictOnDelete();
            $table->string('channel');
            $table->string('event');
            $table->unsignedInteger('attempt');
            $table->string('status');
            $table->text('error')->nullable();
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
    }
};
