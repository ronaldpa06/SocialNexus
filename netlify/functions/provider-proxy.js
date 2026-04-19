/**

 * PROXY PARA A API DO FORNECEDOR (GROWFOLLOWS)

 * Resolve problemas de CORS permitindo que o front-end consulte a API.

 * Suporta POST com Form Data para máxima compatibilidade.

 */

const https = require('https');

const url = require('url');



exports.handler = async function(event, context) {

    if (event.httpMethod === "OPTIONS") {

        return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" }, body: "" };

    }



    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };



    try {

        const payload = JSON.parse(event.body);

        const { providerUrl, params } = payload;



        if (!providerUrl || !params || !params.key) {

            return { statusCode: 400, body: JSON.stringify({ error: "Parâmetros inválidos ou API Key ausente." }) };

        }



        // Construi URL parameters para converter em String x-www-form-urlencoded

        const postData = new URLSearchParams(params).toString();

        const parsedUrl = url.parse(providerUrl);



        const response = await new Promise((resolve, reject) => {

            const req = https.request({

                hostname: parsedUrl.hostname,

                port: 443,

                path: parsedUrl.path,

                method: 'POST',

                headers: {

                    'User-Agent': 'SocialNexus-Proxy',

                    'Content-Type': 'application/x-www-form-urlencoded',

                    'Content-Length': Buffer.byteLength(postData)

                }

            }, (res) => {

                let body = '';

                res.on('data', chunk => body += chunk);

                res.on('end', () => resolve({ status: res.statusCode, data: body }));

            });



            req.on('error', (e) => reject(e));

            req.setTimeout(8000, () => {

                req.abort();

                reject(new Error('TIMEOUT_PROVIDER'));

            });

            req.write(postData);

            req.end();

        });



        let jsonResponse = {};

        try {

            jsonResponse = JSON.parse(response.data);

        } catch(e) {

            // Se não for JSON, retorna o corpo bruto como fallback dentro de um objeto

            jsonResponse = { raw: response.data };

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

        console.error("PROXY ERROR:", err);

        return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: err.message }) };

    }

};

