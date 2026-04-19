/**

 * PROXY PARA A API DO FORNECEDOR (GROWFOLLOWS)

 * Resolve problemas de CORS permitindo que o front-end consulte a API.

 * Adicionado AbortController para timeout explícito.

 */



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



        const postData = new URLSearchParams(params).toString();

        

        const controller = new AbortController();

        const timeoutId = setTimeout(() => controller.abort(), 9000); // 9 segundos max, antes do netlify matar (10s)



        try {

            const response = await fetch(providerUrl, {

                method: 'POST',

                headers: {

                    'Content-Type': 'application/x-www-form-urlencoded',

                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',

                    'Accept': 'application/json'

                },

                body: postData,

                signal: controller.signal

            });

            

            clearTimeout(timeoutId);



            const textBody = await response.text();

            

            let jsonResponse;

            try {

                jsonResponse = JSON.parse(textBody);

            } catch(e) {

                jsonResponse = { raw: textBody };

            }



            return {

                statusCode: 200,

                headers: {

                    "Access-Control-Allow-Origin": "*",

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(jsonResponse)

            };



        } catch(netErr) {

            clearTimeout(timeoutId);

            if (netErr.name === 'AbortError') {

                return { 

                    statusCode: 200, 

                    headers: {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},

                    body: JSON.stringify({ error: "TIMEOUT_PROVIDER", message: "O fornecedor demorou mais de 9 segundos para responder." })

                };

            } else {

                throw netErr;

            }

        }

    } catch (err) {

        console.error("PROXY ERROR:", err);

        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };

    }

};

