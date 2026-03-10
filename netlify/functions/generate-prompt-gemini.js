const GEMINI_API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const buildInstruction = (formData, promptBase) => {
    const pedidoLivreIa = typeof formData?.pedidoLivreIa === 'string' ? formData.pedidoLivreIa.trim() : '';

    return [
        'Voce e um especialista em criacao de prompts para agentes de atendimento no WhatsApp e CRM.',
        'Sua tarefa e transformar os dados recebidos em um prompt final, claro, profissional, completo e pronto para uso.',
        'Crie um prompt para uma IA de atendimento automatizado de WhatsApp usando todos os dados preenchidos pela pessoa nos campos do formulario.',
        'Use as informacoes extras do usuario para personalizar o resultado, sem perder clareza operacional.',
        'Regras obrigatorias:',
        '- Responda somente com o prompt final.',
        '- Escreva em portugues do Brasil.',
        '- Preserve os fatos enviados pelo usuario.',
        '- Nao resuma demais e nao devolva apenas um perfil curto do agente.',
        '- O resultado deve ser extenso, operacional e pronto para colar em um sistema de agente.',
        '- Estruture o resultado com titulos, secoes e bullets.',
        '- Inclua orientacoes de comportamento, tom, fluxo de atendimento, coleta de dados, resumo, acao final e encerramento.',
        '- Sempre aproveite todos os campos preenchidos. Se um campo estiver preenchido, ele deve aparecer de forma util no prompt final.',
        '- Se houver perguntas, liste todas as perguntas.',
        '- Se houver campos de resumo, liste todos os campos de resumo.',
        '- Se houver link final, inclua uma orientacao clara de quando usar esse link.',
        '- Nao mencione Gemini, IA generativa, bastidores, sistema, JSON ou instrucoes internas.',
        '',
        'A estrutura de saida deve seguir este formato:',
        'TITULO',
        '1. Identidade do agente',
        '2. Objetivo principal do atendimento',
        '3. Tom de voz e comportamento',
        '4. Fluxo do atendimento',
        '5. Perguntas obrigatorias para coleta',
        '6. Estrutura do resumo final',
        '7. Acao final esperada',
        '8. Informacoes da empresa para consulta',
        '9. Mensagem de encerramento',
        '10. Regras que o agente deve seguir',
        '',
        'Se algum bloco tiver dados suficientes, detalhe esse bloco com instrucoes praticas. Nao pule blocos importantes quando houver informacao para eles.',
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
        const instruction = buildInstruction(formData, promptBase);

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: instruction
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxOutputTokens: 1800
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
