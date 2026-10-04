<?php

namespace Database\Seeders;

use App\Enums\InternalRequestPriority;
use App\Enums\InternalRequestStatus;
use App\Models\InternalRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;

class InternalRequestSeeder extends Seeder
{
    /**
     * Open example requests from the seed requester, spread over the last days.
     */
    public function run(): void
    {
        $requester = User::where('email', 'solicitante@empresa.com')->firstOrFail();

        $requests = [
            ['Notebook novo para o time', 'Substituir o equipamento atual, que trava com frequência.', InternalRequestPriority::High, 6],
            ['Acesso ao sistema de contratos', 'Preciso de acesso de leitura para conferir os contratos do trimestre.', InternalRequestPriority::Medium, 5],
            ['Reembolso de viagem', 'Reembolso das despesas da visita ao cliente em São Paulo.', InternalRequestPriority::Medium, 4],
            ['Troca de cadeira', 'A cadeira da estação 12 está quebrada.', InternalRequestPriority::Low, 3],
            ['Licença de software de design', 'Licença anual para o time de comunicação.', InternalRequestPriority::High, 2],
            ['Atualização de cadastro de fornecedor', 'Corrigir o endereço do fornecedor no cadastro.', InternalRequestPriority::Low, 1],
        ];

        Model::unguarded(function () use ($requests, $requester) {
            foreach ($requests as [$title, $description, $priority, $daysAgo]) {
                $internalRequest = InternalRequest::firstOrCreate(
                    ['title' => $title, 'requester_id' => $requester->id],
                    [
                        'description' => $description,
                        'priority' => $priority,
                        'status' => InternalRequestStatus::Open,
                        'area_id' => $requester->area_id,
                        'created_at' => now()->subDays($daysAgo),
                        'updated_at' => now()->subDays($daysAgo),
                    ],
                );

                if ($internalRequest->wasRecentlyCreated) {
                    $internalRequest->statusChanges()->create([
                        'from_status' => null,
                        'to_status' => InternalRequestStatus::Open,
                        'changed_by' => $requester->id,
                        'created_at' => now()->subDays($daysAgo),
                    ]);
                }
            }
        });
    }
}
