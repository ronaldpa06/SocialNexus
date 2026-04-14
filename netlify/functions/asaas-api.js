/**
 * SocialNexus - Gateway de Pagamentos Real (ASAAS)
 */

const https = require('https');

// Função de busca com detecção de erro e timeout
async function getCredentialsFromFirebase() {
    return new Promise((resolve) => {
        const url = 'https://socialnexus-58290-default-rtdb.firebaseio.com/socialnexus_kv/snx_config.json';
        const req = https.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body || '{}');
                    resolve(data);
                } catch (e) {
                    console.error("Erro no Parse Firebase:", e.message);
                    resolve({});
                }
            });
        });

        req.on('error', (e) => {
            console.error("Erro ao conectar no Firebase:", e.message);
            resolve({});
        });

        req.setTimeout(5000, () => {
            req.abort();
            console.error("Timeout ao buscar config no Firebase");
            resolve({});
        });
    });
}

function asaasRequest(method, path, apiKey, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.asaas.com',
            port: 443,
            path: '/v3' + path,
            method: method,
            headers: {
                'access_token': apiKey,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body || '{}');
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', e => reject(e));
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body);
        const { action, amount, userId, userName, userEmail, cardData } = payload;
        
        console.log(`🤖 Processando ${action} para ${userName}...`);

        // 🔍 BUSCA CHAVE CONFIGURADA
        const firebaseConfig = await getCredentialsFromFirebase();
        let finalApiKey = firebaseConfig.asaasKey;

        // Fallback para ENV se Firebase falhar
        if (!finalApiKey) finalApiKey = process.env.ASAAS_API_KEY;

        if (!finalApiKey || finalApiKey.length < 10) {
            console.error("❌ ERRO: Chave Asaas não encontrada!");
            return { 
                statusCode: 401, 
                body: JSON.stringify({ success: false, error: "Asaas não configurado no painel Admin!" }) 
            };
        }

        // --- AÇÃO: GERAR PIX ---
        if (action === 'generate_pix') {
            const customerRes = await asaasRequest('POST', '/customers', finalApiKey, {
                name: userName,
                email: userEmail,
                externalReference: userId
            });

            if (customerRes.status !== 200) {
                 return { statusCode: customerRes.status, body: JSON.stringify({ success: false, error: "Erro ao criar cliente no Asaas" }) };
            }

            const customerId = customerRes.data.id;

            const paymentRes = await asaasRequest('POST', '/payments', finalApiKey, {
                customer: customerId,
                billingType: 'PIX',
                value: parseFloat(amount),
                dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                description: `Adicao de Saldo SocialNexus - ${userName}`,
                externalReference: userId
            });

            if (paymentRes.status !== 200) {
                 return { statusCode: paymentRes.status, body: JSON.stringify({ success: false, error: "Erro ao criar pagamento" }) };
            }

            const qrRes = await asaasRequest('GET', `/payments/${paymentRes.data.id}/pixQrCode`, finalApiKey);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    paymentId: paymentRes.data.id,
                    payload: qrRes.data.payload,
                    image: qrRes.data.encodedImage
                })
            };
        }

        if (action === 'generate_card') {
            // Lógica de cartão aqui... (Igual, mas com tratamento de erro melhor)
            return { statusCode: 400, body: JSON.stringify({ success: false, error: "Pagamento por cartão em atualização." }) };
        }

        return { statusCode: 400, body: "Invalid Action" };

    } catch (error) {
        console.error("❌ ERRO INTERNO:", error.message);
        return { statusCode: 500, body: JSON.stringify({ error: "Erro interno no servidor de pagamentos." }) };
    }
};


