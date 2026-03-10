const GEMINI_API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_INSTRUCTION = [
    'Voce e um especialista senior em engenharia de prompt para agentes de atendimento automatizado de WhatsApp.',
    'Seu trabalho e escrever prompts finais completos, operacionais e prontos para uso em producao.',
    'Nao resuma. Nao responda com perfil curto. Nao entregue rascunho.',
    'Sempre transforme os dados recebidos em um prompt robusto, com contexto, regras, fluxo, perguntas, resumo, acao final e encerramento.',
    'Se um campo estiver preenchido, esse conteudo deve ser aproveitado no resultado final.',
    'A resposta final deve ser apenas o prompt final em texto puro, sem comentarios sobre o processo.'
].join('\n');

const buildUserPrompt = (formData, promptBase) => {
    const pedidoLivreIa = typeof formData?.pedidoLivreIa === 'string' ? formData.pedidoLivreIa.trim() : '';

    return [
        'Crie um prompt completo para uma IA de atendimento automatizado de WhatsApp.',
        'A resposta precisa ser mais completa e mais util do que o prompt base de referencia.',
        'Escreva em portugues do Brasil.',
        'Preserve os fatos enviados.',
        'Nao responda com versao resumida.',
        'Produza um texto longo, detalhado e pronto para colar no campo de instrucoes do agente.',
        '',
        'Use obrigatoriamente esta estrutura de saida:',
        'TITULO',
        '1. Identidade do agente',
        '2. Objetivo principal do atendimento',
        '3. Tom de voz e comportamento',
        '4. Fluxo detalhado do atendimento',
        '5. Perguntas obrigatorias para coleta de informacoes',
        '6. Estrutura do resumo final para o cliente',
        '7. Acao final esperada e quando usar links',
        '8. Informacoes da empresa para consulta durante a conversa',
        '9. Mensagem de encerramento',
        '10. Regras obrigatorias que o agente deve seguir',
        '',
        'Regras adicionais de qualidade:',
        '- Cada secao deve ter conteudo util e pratico.',
        '- O item 4 deve descrever passo a passo como conduzir a conversa.',
        '- O item 5 deve listar todas as perguntas preenchidas no formulario.',
        '- O item 6 deve usar todos os campos de resumo informados.',
        '- O item 7 deve explicar com clareza qual e a conversao ou encaminhamento esperado.',
        '- O item 10 deve trazer regras claras de conduta, limites e boas praticas.',
        '- Quando houver informacoes extras do usuario, incorpore isso ao resultado.',
        '- O resultado precisa ter densidade de conteudo; evite respostas curtas.',
        '- Mire em algo significativamente mais completo do que um simples resumo do agente.',
        '',
        'Dados do formulario:',
        JSON.stringify(formData, null, 2),
        '',
        'Pedido livre do usuario para a IA:',
        pedidoLivreIa || 'Nenhum pedido adicional informado.',
        '',
        'Prompt base montado localmente como referencia minima. Sua resposta deve ser melhor, mais completa e mais detalhada do que essa base:',
        promptBase
    ].join('\n');
};

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method not allowed.' })
        };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'GEMINI_API_KEY nao configurada.' })
        };
    }

    try {
        const { formData = {}, promptBase = '' } = JSON.parse(event.body || '{}');
        const userPrompt = buildUserPrompt(formData, promptBase);

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [
                        {
                            text: SYSTEM_INSTRUCTION
                        }
                    ]
                },
                contents: [
                    {
                        parts: [
                            {
                                text: userPrompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.45,
                    topP: 0.9,
                    maxOutputTokens: 3200,
                    responseMimeType: 'text/plain'
                }
            })
        });

        const data = await response.json();
        const prompt =
            data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim() || '';

        if (!response.ok || !prompt) {
            return {
                statusCode: 502,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: data?.error?.message || 'Resposta invalida do Gemini.'
                })
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: error instanceof Error ? error.message : 'Erro interno ao gerar prompt.'
            })
        };
    }
};
