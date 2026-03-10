const GEMINI_API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const buildInstruction = (formData, promptBase) => {
    return [
        'Voce e um especialista em criacao de prompts para agentes de atendimento no WhatsApp e CRM.',
        'Sua tarefa e transformar os dados recebidos em um prompt final, claro, profissional e pronto para uso.',
        'Regras obrigatorias:',
        '- Responda somente com o prompt final.',
        '- Escreva em portugues do Brasil.',
        '- Preserve os fatos enviados pelo usuario.',
        '- Estruture o resultado com titulos, secoes e bullets quando fizer sentido.',
        '- Inclua orientacoes de comportamento, tom, fluxo de atendimento, coleta de dados, resumo e encerramento.',
        '- Nao mencione Gemini, IA generativa, bastidores, sistema, JSON ou instrucoes internas.',
        '',
        'Dados do formulario:',
        JSON.stringify(formData, null, 2),
        '',
        'Prompt base montado localmente:',
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
