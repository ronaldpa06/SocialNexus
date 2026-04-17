/**
 * PROXY PARA A API DO FORNECEDOR (GROWFOLLOWS)
 * Resolve problemas de CORS permitindo que o front-end consulte a API.
 */
const https = require('https');
const url = require('url');

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const payload = JSON.parse(event.body);
        const { providerUrl, params } = payload; // params é um objeto com key, action, etc.

        if (!providerUrl || !params || !params.key) {
            return { statusCode: 400, body: JSON.stringify({ error: "Parâmetros inválidos ou API Key ausente." }) };
        }

        // Construi URL parameters
        const formParams = new URLSearchParams(params).toString();
        const fullUrl = `${providerUrl}?${formParams}`;

        const parsedUrl = url.parse(fullUrl);

        const response = await new Promise((resolve, reject) => {
            const req = https.request({
                hostname: parsedUrl.hostname,
                port: 443,
                path: parsedUrl.path,
                method: 'POST',
                headers: {
                    'User-Agent': 'SocialNexus-Proxy'
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ status: res.statusCode, data: body }));
            });

            req.on('error', (e) => reject(e));
            req.end();
        });

        // Tentar prever JSON
        let jsonResponse = {};
        try {
            jsonResponse = JSON.parse(response.data);
        } catch(e) {
            return { statusCode: 200, body: JSON.stringify({ raw_fallback: response.data }) };
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(jsonResponse)
        };

    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
