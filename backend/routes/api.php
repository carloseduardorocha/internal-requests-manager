<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\InternalRequestController;
use App\Http\Controllers\InternalRequestReviewController;
use Illuminate\Support\Facades\Route;

Route::post('login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

    Route::post('internal-requests/{internal_request}/assign', [InternalRequestReviewController::class, 'assign']);
    Route::post('internal-requests/{internal_request}/approve', [InternalRequestReviewController::class, 'approve']);
    Route::post('internal-requests/{internal_request}/reject', [InternalRequestReviewController::class, 'reject']);

    Route::apiResource('internal-requests', InternalRequestController::class);
});
