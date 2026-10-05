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
     * Example requests from the seed requester, spread over the last days: open, in review and decided.
     */
    public function run(): void
    {
        $requester = User::where('email', 'solicitante@empresa.com')->firstOrFail();
        $analyst = User::where('email', 'analista@empresa.com')->firstOrFail();

        $open = [
            ['Notebook novo para o time', 'Substituir o equipamento atual, que trava com frequência.', InternalRequestPriority::High, 6],
            ['Acesso ao sistema de contratos', 'Preciso de acesso de leitura para conferir os contratos do trimestre.', InternalRequestPriority::Medium, 5],
            ['Reembolso de viagem', 'Reembolso das despesas da visita ao cliente em São Paulo.', InternalRequestPriority::Medium, 4],
            ['Troca de cadeira', 'A cadeira da estação 12 está quebrada.', InternalRequestPriority::Low, 3],
            ['Licença de software de design', 'Licença anual para o time de comunicação.', InternalRequestPriority::High, 2],
            ['Atualização de cadastro de fornecedor', 'Corrigir o endereço do fornecedor no cadastro.', InternalRequestPriority::Low, 1],
        ];

        // The last item is the decision justification; null leaves the request in review.
        $reviewed = [
            ['Monitor adicional para a estação', 'Segundo monitor para acompanhar os painéis de atendimento.', InternalRequestPriority::Medium, 8, InternalRequestStatus::InReview, null],
            ['Treinamento de segurança da informação', 'Inscrição da equipe no treinamento anual obrigatório.', InternalRequestPriority::High, 7, InternalRequestStatus::InReview, null],
            ['Compra de cafeteira para a copa', 'Cafeteira nova para o andar, pois a atual quebrou.', InternalRequestPriority::Low, 10, InternalRequestStatus::Approved, 'Aprovado dentro do orçamento de facilities do trimestre.'],
            ['Viagem internacional para conferência', 'Participação em conferência do setor no exterior.', InternalRequestPriority::High, 9, InternalRequestStatus::Rejected, 'Fora do orçamento de viagens deste ano. Reenvie no próximo ciclo.'],
        ];

        Model::unguarded(function () use ($open, $reviewed, $requester, $analyst) {
            foreach ($open as [$title, $description, $priority, $daysAgo]) {
                $this->seed($requester, $analyst, $title, $description, $priority, $daysAgo, InternalRequestStatus::Open, null);
            }

            foreach ($reviewed as [$title, $description, $priority, $daysAgo, $status, $justification]) {
                $this->seed($requester, $analyst, $title, $description, $priority, $daysAgo, $status, $justification);
            }
        });
    }

    /**
     * Creates the request with a coherent history (assumed 3h after creation, decided 3h after that).
     */
    private function seed(
        User $requester,
        User $analyst,
        string $title,
        string $description,
        InternalRequestPriority $priority,
        int $daysAgo,
        InternalRequestStatus $status,
        ?string $justification,
    ): void {
        $createdAt = now()->subDays($daysAgo);
        $assignedAt = $createdAt->copy()->addHours(3);
        $decidedAt = $assignedAt->copy()->addHours(3);
        $isDecided = $status === InternalRequestStatus::Approved || $status === InternalRequestStatus::Rejected;
        $isAssigned = $status !== InternalRequestStatus::Open;

        $internalRequest = InternalRequest::firstOrCreate(
            ['title' => $title, 'requester_id' => $requester->id],
            [
                'description' => $description,
                'priority' => $priority,
                'status' => $status,
                'area_id' => $requester->area_id,
                'assigned_to' => $isAssigned ? $analyst->id : null,
                'assigned_at' => $isAssigned ? $assignedAt : null,
                'decided_by' => $isDecided ? $analyst->id : null,
                'decided_at' => $isDecided ? $decidedAt : null,
                'decision_justification' => $isDecided ? $justification : null,
                'created_at' => $createdAt,
                'updated_at' => $isDecided ? $decidedAt : ($isAssigned ? $assignedAt : $createdAt),
            ],
        );

        if (! $internalRequest->wasRecentlyCreated) {
            return;
        }

        $history = [[null, InternalRequestStatus::Open, $requester, $createdAt]];

        if ($isAssigned) {
            $history[] = [InternalRequestStatus::Open, InternalRequestStatus::InReview, $analyst, $assignedAt];
        }

        if ($isDecided) {
            $history[] = [InternalRequestStatus::InReview, $status, $analyst, $decidedAt];
        }

        foreach ($history as [$from, $to, $user, $at]) {
            $internalRequest->statusChanges()->create([
                'from_status' => $from,
                'to_status' => $to,
                'changed_by' => $user->id,
                'created_at' => $at,
            ]);
        }
    }
}
