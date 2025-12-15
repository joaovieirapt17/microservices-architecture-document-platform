INSERT INTO notification_templates (
    id,
    organization_id,
    template_name,
    template_type,
    subject,
    body_html,
    body_text,
    variables,
    is_active,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    '46bb211c-04a5-4e7f-93c3-453aef909fc2',
    'invite',
    'email',
    'Convite para {{organizationName}}',
    '<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convite</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.5;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f5f5f5;
            border-radius: 5px;
            padding: 25px;
        }
        .content {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
        }
        .button {
            display: inline-block;
            padding: 10px 25px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 3px;
            margin: 15px 0;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">
            <p>Olá {{recipientName}},</p>
            
            <p>Foste convidado por <strong>{{invitedBy}}</strong> para entrar na organização <strong>{{organizationName}}</strong>.</p>
            
            <p>Vais ter a função de <strong>{{role}}</strong>.</p>
            
            <p>Para aceitar o convite, clica no botão abaixo:</p>
            
            <p style="text-align: center;">
                <a href="{{inviteLink}}" class="button">Aceitar Convite</a>
            </p>
        </div>
        
        <div class="footer">
            <p>Se o botão não funcionar, copia este link:<br>
            {{inviteLink}}</p>
        </div>
    </div>
</body>
</html>',
    'Olá {{recipientName}},

Foste convidado por {{invitedBy}} para entrar na organização {{organizationName}}.

Vais ter a função de {{role}}.

Para aceitar o convite, acede ao seguinte link:
{{inviteLink}}

Este convite expira em 7 dias. Se não pediste este convite, podes ignorar este email.',
    '["recipientName", "organizationName", "invitedBy", "inviterName", "inviteLink", "role"]'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, template_name) 
DO UPDATE SET
    subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    body_text = EXCLUDED.body_text,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Verificar se o template foi criado
SELECT 
    id,
    organization_id,
    template_name,
    subject,
    is_active,
    created_at
FROM notification_templates
WHERE template_name = 'invite'
AND organization_id = '46bb211c-04a5-4e7f-93c3-453aef909fc2';