/**
 * SocialNexus - Gateway de Pagamentos Real (ASAAS)
 * Este servidor invisível protege sua API Key e gera cobranças reais de Pix e Cartão.
 */

const https = require('https');

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmY3YWRmMDM1LTc1OWItNDU2MS04ZTRhLTI4MjQxODk3ZDI0Yjo6JGFhY2hfNjM2MDU2ZjItNjllMi00OTk1LTg1NDEtN2I3ODM1N2M5OWNi';
const ASAAS_URL = 'api.asaas.com';

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
        const { action, amount, userId, userName, userEmail, cardData, apiKey } = payload;
        const finalApiKey = apiKey || process.env.ASAAS_API_KEY || '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmY3YWRmMDM1LTc1OWItNDU2MS04ZTRhLTI4MjQxODk3ZDI0Yjo6JGFhY2hfNjM2MDU2ZjItNjllMi00OTk1LTg1NDEtN2I3ODM1N2M5OWNi';

        // --- AÇÃO: GERAR PIX ---
        if (action === 'generate_pix') {
            // 1. Primeiro criamos/buscamos o cliente (Simplificado: Usando um cliente genérico ou id fixo para agilizar)
            // Para ser 100% profissional, criamos o cliente no Asaas
            const customerRes = await asaasRequest('POST', '/customers', finalApiKey, {
                name: userName,
                email: userEmail,
                externalReference: userId
            });

            const customerId = customerRes.data.id;

            // 2. Criar a cobrança PIX
            const paymentRes = await asaasRequest('POST', '/payments', finalApiKey, {
                customer: customerId,
                billingType: 'PIX',
                value: parseFloat(amount),
                dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // 24h
                description: `Adicao de Saldo SocialNexus - ${userName}`,
                externalReference: userId
            });

            // 3. Buscar o QR Code
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
            
            // Quebrar validade (MM/AA)
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
                    cpfCnpj: cardData.cpf || '00000000000', // Necessário CPF para cartão no Asaas
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
