<?php

return [
    'created' => ['title' => 'Novo pedido #:id'],
    'approved' => ['title' => 'Pedido #:id aprovado'],
    'rejected' => ['title' => 'Pedido #:id rejeitado'],
    'fields' => [
        'priority' => 'Prioridade',
        'requester' => 'Solicitante',
        'area' => 'Área',
        'result' => 'Resultado',
        'decided_by' => 'Decidido por',
        'justification' => 'Justificativa',
    ],
    'priority' => [
        'low' => 'Baixa',
        'medium' => 'Média',
        'high' => 'Alta',
    ],
    'result' => [
        'approved' => 'Aprovado',
        'rejected' => 'Rejeitado',
    ],
    'mail' => [
        'greeting' => 'Olá, :name!',
        'action' => 'Ver pedido',
        'assumed' => [
            'subject' => 'Seu pedido #:id está em análise',
            'intro' => 'Seu pedido ":title" está em análise.',
            'assigned_to' => 'Responsável: :name.',
        ],
        'approved' => [
            'subject' => 'Seu pedido #:id foi aprovado',
            'intro' => 'Seu pedido ":title" foi aprovado.',
        ],
        'rejected' => [
            'subject' => 'Seu pedido #:id foi rejeitado',
            'intro' => 'Seu pedido ":title" foi rejeitado.',
        ],
        'decided' => [
            'decided_by' => 'Decidido por: :name.',
            'justification' => 'Justificativa:',
        ],
    ],
];
