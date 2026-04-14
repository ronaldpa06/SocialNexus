/**
 * SocialNexus - Gateway de Pagamentos Real (ASAAS)
 */

const https = require('https');

// Função auxiliar para buscar a chave do Firebase de forma síncrona/async
async function getCredentialsFromFirebase() {
    return new Promise((resolve) => {
        const url = 'https://socialnexus-58290-default-rtdb.firebaseio.com/socialnexus_kv/snx_config.json';
        https.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body || '{}'));
                } catch (e) {
                    resolve({});
                }
            });
        }).on('error', () => resolve({}));
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
        
        // 🔍 BUSCA CHAVE CONFIGURADA NO PAINEL
        const firebaseConfig = await getCredentialsFromFirebase();
        const finalApiKey = firebaseConfig.asaasKey;

        if (!finalApiKey || finalApiKey.length < 10) {
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

            const customerId = customerRes.data.id;

            const paymentRes = await asaasRequest('POST', '/payments', finalApiKey, {
                customer: customerId,
                billingType: 'PIX',
                value: parseFloat(amount),
                dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                description: `Adicao de Saldo SocialNexus - ${userName}`,
                externalReference: userId
            });

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
            const customerRes = await asaasRequest('POST', '/customers', finalApiKey, {
                name: userName,
                email: userEmail,
                externalReference: userId
            });

            const customerId = customerRes.data.id;
            const [expiryMonth, expiryYear] = cardData.expiry.split('/');

            const paymentRes = await asaasRequest('POST', '/payments', finalApiKey, {
                customer: customerId,
                billingType: 'CREDIT_CARD',
                value: parseFloat(amount),
                dueDate: new Date().toISOString().split('T')[0],
                description: `Adicao de Saldo Cartao SocialNexus - ${userName}`,
                externalReference: userId,
                creditCard: {
                    holderName: cardData.name,
                    number: cardData.number,
                    expiryMonth: expiryMonth,
                    expiryYear: '20' + expiryYear,
                    ccv: cardData.cvv
                },
                creditCardHolderInfo: {
                    name: userName,
                    email: userEmail,
                    cpfCnpj: cardData.cpf || '00000000000',
                    postalCode: '69000000',
                    addressNumber: '123',
                    phone: '92999999999'
                }
            });

            if (paymentRes.data.errors) {
                return { statusCode: 400, body: JSON.stringify({ success: false, error: paymentRes.data.errors[0].description }) };
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    status: paymentRes.data.status,
                    message: "Pagamento em processamento ou aprovado!"
                })
            };
        }

        return { statusCode: 400, body: "Invalid Action" };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

