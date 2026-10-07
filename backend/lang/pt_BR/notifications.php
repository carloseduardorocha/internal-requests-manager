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
    'role' => [
        'requester' => 'Solicitante',
        'analyst' => 'Analista',
        'admin' => 'Administrador',
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
        'invitation' => [
            'subject' => 'Convite para a Gestão de Solicitações Internas',
            'intro' => 'Você foi convidado para acessar o sistema de solicitações internas.',
            'profile' => 'Seu perfil: :role. Sua área: :area.',
            'action' => 'Criar conta',
            'expires' => 'Este convite vale até :date.',
        ],
        'password_reset' => [
            'subject' => 'Redefinição de senha',
            'intro' => 'Recebemos um pedido para redefinir a senha da sua conta.',
            'action' => 'Criar nova senha',
            'expires' => 'Este link vale por :minutes minutos e só pode ser usado uma vez.',
            'ignore' => 'Se você não fez esse pedido, ignore este e-mail: sua senha continua a mesma.',
        ],
        'decided' => [
            'decided_by' => 'Decidido por: :name.',
            'justification' => 'Justificativa:',
        ],
    ],
];
