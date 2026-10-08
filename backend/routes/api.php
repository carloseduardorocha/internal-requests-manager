<?php

use App\Http\Controllers\AreaController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InternalRequestController;
use App\Http\Controllers\InternalRequestReviewController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\UserBulkController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::post('login', [AuthController::class, 'login']);
Route::post('forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:6,1');
Route::post('reset-password', [PasswordResetController::class, 'reset']);
Route::get('invitations/{token}', [InvitationController::class, 'show']);
Route::post('invitations/{token}/accept', [InvitationController::class, 'accept']);

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

    Route::get('areas', AreaController::class);
    Route::post('invitations', [InvitationController::class, 'store']);

    Route::get('users', [UserController::class, 'index']);
    Route::post('users/bulk/deactivate', [UserBulkController::class, 'deactivate']);
    Route::post('users/bulk/reactivate', [UserBulkController::class, 'reactivate']);
    Route::patch('users/{user}', [UserController::class, 'update']);
    Route::post('users/{user}/deactivate', [UserController::class, 'deactivate']);
    Route::post('users/{user}/reactivate', [UserController::class, 'reactivate']);

    Route::get('dashboard', DashboardController::class);

    Route::post('internal-requests/{internal_request}/assign', [InternalRequestReviewController::class, 'assign']);
    Route::post('internal-requests/{internal_request}/approve', [InternalRequestReviewController::class, 'approve']);
    Route::post('internal-requests/{internal_request}/reject', [InternalRequestReviewController::class, 'reject']);

    Route::apiResource('internal-requests', InternalRequestController::class);
});
