/**
 * SOCIALNEXUS - ASAAS API SERVICE (Zero-Dep Edition)
 * Build: 2026-04-15_19:00
 */
const https = require('https');

function asaasRequest(method, endpoint, apiKey, data = null, isSandbox = false) {
    return new Promise((resolve, reject) => {
        const baseUrl = isSandbox ? 'sandbox.asaas.com' : 'www.asaas.com';
        const options = {
            hostname: baseUrl,
            port: 443,
            path: '/api/v3' + endpoint,
            method: method,
            headers: {
                'access_token': apiKey.trim(),
                'Content-Type': 'application/json',
                'User-Agent': 'SocialNexus-App'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body || '{}');
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: 500, data: { errors: [{ description: "Erro ao processar resposta do Asaas: " + e.message }] } });
                }
            });
        });

        req.on('error', (e) => {
            resolve({ status: 500, data: { errors: [{ description: "Erro de conexão: " + e.message }] } });
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST Required" };

    try {
        const payload = JSON.parse(event.body);
        const { amount, userName, email, cpf, userId } = payload;

        // 1. Busca Config no Firebase
        const configUrl = 'https://socialnexus-58290-default-rtdb.firebaseio.com/socialnexus_kv/snx_config.json';
        const configRaw = await new Promise((resolve) => {
            https.get(configUrl, (res) => {
                let body = '';
                res.on('data', d => body += d);
                res.on('end', () => {
                   try {
                       let json = JSON.parse(body);
                       if (typeof json === 'string') json = JSON.parse(json);
                       resolve(json);
                   } catch(e) { resolve(null); }
                });
            }).on('error', () => resolve(null));
        });

        const finalApiKey = (configRaw && (configRaw.asaasKey || configRaw.asaas_key)) || 'aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjA0ZDAzYzExLTJkYWQtNGRlOC05NTY0LWMxYmMwNmU0MGE4OTo6JGFhY2hfZjEwYmJlNTctNjFhMS00NmE0LWIxYzAtNWY0ZDdiOWZkMmM4';
        const isSandbox = finalApiKey.includes('sandbox');

        // 2. Cadastro/Busca de Cliente
        const cpfClean = cpf ? cpf.replace(/\D/g, '') : '';
        if (!cpfClean) return { statusCode: 400, body: JSON.stringify({ success: false, error: "CPF é obrigatório para gerar Pix." }) };

        const customerRes = await asaasRequest('POST', '/customers', finalApiKey, {
            name: (userName || "Cliente").trim().substring(0, 60),
            cpfCnpj: cpfClean,
            email: (email || "").trim(),
            notificationDisabled: true
        }, isSandbox);

        if (customerRes.status !== 200 && customerRes.status !== 201) {
            const errors = customerRes.data && customerRes.data.errors ? customerRes.data.errors : [];
            const msg = errors.length > 0 ? errors.map(e => e.description).join(", ") : "Erro status " + customerRes.status;
            console.error("❌ Erro Asaas (Customers):", msg, customerRes.data);
            return { statusCode: 400, body: JSON.stringify({ success: false, error: "Asaas: " + msg }) };
        }

        const customerId = customerRes.data.id;
        const { action, cardData } = payload;

        if (action === 'generate_card' && cardData) {
            // --- FLUXO CARTÃO DE CRÉDITO ---
            const [expiryMonth, expiryYear] = cardData.expiry.split('/');
            const paymentData = {
                customer: customerId,
                billingType: 'CREDIT_CARD',
                value: parseFloat(amount),
                dueDate: new Date().toISOString().split('T')[0],
                description: `Recarga SocialNexus - ${userName}`,
                externalReference: userId,
                creditCard: {
                    holderName: cardData.name,
                    number: cardData.number,
                    expiryMonth: expiryMonth.trim(),
                    expiryYear: '20' + expiryYear.trim(),
                    ccv: cardData.cvv // Na Asaas é ccv e não cvv
                },
                creditCardHolderInfo: {
                    name: userName || "Cliente",
                    email: email || "email@padrao.com",
                    cpfCnpj: cpfClean,
                    postalCode: '01001000', // CEP Genérico para viabilizar cadastro simples
                    addressNumber: '100',
                    phone: '11999999999'
                }
            };

            const paymentRes = await asaasRequest('POST', '/payments', finalApiKey, paymentData, isSandbox);
            
            if (paymentRes.status === 200 || paymentRes.status === 201) {
                return { 
                    statusCode: 200, 
                    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type"},
                    body: JSON.stringify({ 
                        success: true, 
                        status: paymentRes.data.status,
                        id: paymentRes.data.id 
                    }) 
                };
            } else {
                const errors = paymentRes.data && paymentRes.data.errors ? paymentRes.data.errors : [];
                return { 
                    statusCode: 400, 
                    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type"},
                    body: JSON.stringify({ 
                        success: false, 
                        error: errors.length > 0 ? errors[0].description : "Cartão recusado. Verifique os dados inseridos." 
                    }) 
                };
            }
        } else {
            // --- FLUXO PIX (PADRÃO) ---
            const paymentRes = await asaasRequest('POST', '/payments', finalApiKey, {
                customer: customerId,
                billingType: 'PIX',
                value: parseFloat(amount),
                dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                description: `Depósito SocialNexus - ${userName}`,
                externalReference: userId
            }, isSandbox);

            if (paymentRes.status !== 200 && paymentRes.status !== 201) {
                const errors = paymentRes.data && paymentRes.data.errors ? paymentRes.data.errors : [];
                const msg = errors.length > 0 ? errors.map(e => e.description).join(", ") : "Erro status " + paymentRes.status;
                return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type"}, body: JSON.stringify({ success: false, error: "Asaas: " + msg }) };
            }

            const paymentId = paymentRes.data.id;
            const qrRes = await asaasRequest('GET', `/payments/${paymentId}/pixQrCode`, finalApiKey, null, isSandbox);

            return {
                statusCode: 200,
                headers: { 
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                body: JSON.stringify({
                    success: true,
                    paymentId: paymentId,
                    payload: qrRes.data?.payload || "",
                    encodedImage: qrRes.data?.encodedImage || ""
                })
            };
        }

    } catch (err) {
        return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type"}, body: JSON.stringify({ success: false, error: err.message }) };
    }
};
