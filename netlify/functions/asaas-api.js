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

function asaasRequest(method, path, apiKey, data = null, isSandbox = false) {
    return new Promise((resolve, reject) => {
        const hostname = isSandbox ? 'sandbox.asaas.com' : 'api.asaas.com';
        
        const options = {
            hostname: hostname,
            port: 443,
            path: '/v3' + path,
            method: method,
            headers: {
                'access_token': apiKey,
                'Content-Type': 'application/json',
                'User-Agent': 'SocialNexus/1.0'
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
        const isSandbox = firebaseConfig.asaasEnv === 'sandbox';

        // Fallback para ENV se Firebase falhar
        if (!finalApiKey) finalApiKey = process.env.ASAAS_API_KEY;

        if (!finalApiKey || finalApiKey.length < 10) {
            console.error("❌ ERRO: Chave Asaas não encontrada!");
            return { 
                statusCode: 401, 
                body: JSON.stringify({ success: false, error: "Asaas não configurado no painel Admin!" }) 
            };
        }
        
        let cpfInput = payload.cpf || "00000000000";

        // --- AÇÃO: GERAR PIX ---
        if (action === 'generate_pix') {
            const customerRes = await asaasRequest('POST', '/customers', finalApiKey, {
                name: userName,
                email: userEmail || "cliente@socialnexus.com",
                externalReference: userId,
                cpfCnpj: cpfInput
            }, isSandbox);

            if (customerRes.status !== 200) {
                 const errMsg = customerRes.data && customerRes.data.errors ? customerRes.data.errors[0].description : "Erro do Asaas";
                 return { statusCode: 400, body: JSON.stringify({ success: false, error: "Asaas: " + errMsg }) };
            }

            const customerId = customerRes.data.id;

            const paymentRes = await asaasRequest('POST', '/payments', finalApiKey, {
                customer: customerId,
                billingType: 'PIX',
                value: parseFloat(amount),
                dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                description: `Adicao de Saldo SocialNexus - ${userName}`,
                externalReference: userId
            }, isSandbox);

            if (paymentRes.status !== 200) {
                 const errMsg = paymentRes.data && paymentRes.data.errors ? paymentRes.data.errors[0].description : "Erro ao gerar PIX";
                 return { statusCode: 400, body: JSON.stringify({ success: false, error: "Asaas: " + errMsg }) };
            }

            const qrRes = await asaasRequest('GET', `/payments/${paymentRes.data.id}/pixQrCode`, finalApiKey, null, isSandbox);

            if (qrRes.status !== 200) {
                 const errMsg = qrRes.data && qrRes.data.errors ? qrRes.data.errors[0].description : "O Asaas criou o pagamento, mas não gerou o QR Code. Ative o Pix no seu painel Asaas!";
                 return { statusCode: 400, body: JSON.stringify({ success: false, error: "Asaas QR Error: " + errMsg }) };
            }

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

        // --- AÇÃO: PROCESSAR CARTÃO ---
        if (action === 'generate_card') {
            const { number, name, expiry, cvv } = cardData;
            const [expiryMonth, expiryYear] = expiry.split('/');

            // 1. Criar/Buscar Cliente
            const customerRes = await asaasRequest('POST', '/customers', finalApiKey, {
                name: userName,
                email: userEmail || "cliente@socialnexus.com",
                externalReference: userId,
                cpfCnpj: cpfInput
            }, isSandbox);

            if (customerRes.status !== 200) {
                 const errMsg = customerRes.data && customerRes.data.errors ? customerRes.data.errors[0].description : "Erro do Asaas";
                 return { statusCode: 400, body: JSON.stringify({ success: false, error: "Asaas: " + errMsg }) };
            }

            const customerId = customerRes.data.id;

            // 2. Processar Pagamento Cartão
            const paymentRes = await asaasRequest('POST', '/payments', finalApiKey, {
                customer: customerId,
                billingType: 'CREDIT_CARD',
                value: parseFloat(amount),
                dueDate: new Date().toISOString().split('T')[0],
                description: `Adicao de Saldo SocialNexus - ${userName}`,
                externalReference: userId,
                creditCard: {
                    holderName: name,
                    number: number,
                    expiryMonth: expiryMonth,
                    expiryYear: "20" + expiryYear,
                    cvv: cvv
                },
                creditCardHolderInfo: {
                    name: userName,
                    email: userEmail || "cliente@socialnexus.com",
                    cpfCnpj: cpfInput,
                    postalCode: "00000000",
                    addressNumber: "0",
                    phone: "0000000000"
                }
            }, isSandbox);

            if (paymentRes.status !== 200) {
                 const errMsg = paymentRes.data && paymentRes.data.errors ? paymentRes.data.errors[0].description : "Cartão Recusado";
                 return { statusCode: 400, body: JSON.stringify({ success: false, error: errMsg }) };
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    paymentId: paymentRes.data.id,
                    status: paymentRes.data.status
                })
            };
        }

        return { statusCode: 400, body: "Invalid Action" };

    } catch (error) {
        console.error("❌ ERRO INTERNO:", error.message);
        return { statusCode: 500, body: JSON.stringify({ success: false, error: "Conexão perdida com o gateway." }) };
    }
};


