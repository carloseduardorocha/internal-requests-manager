<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\InternalRequestController;
use Illuminate\Support\Facades\Route;

Route::post('login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

    Route::apiResource('internal-requests', InternalRequestController::class);
});
