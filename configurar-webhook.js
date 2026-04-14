/**
 * 🛰️ CONFIGURADOR AUTOMÁTICO DE WEBHOOK - SOCIALNEXUS
 * Este script configura o Asaas para avisar o seu site quando um pagamento é feito.
 */

const https = require('https');

async function getConfig() {
    return new Promise((resolve) => {
        const url = 'https://socialnexus-58290-default-rtdb.firebaseio.com/socialnexus_kv/snx_config.json';
        https.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body || '{}')));
        }).on('error', () => resolve({}));
    });
}

async function setup() {
    console.log("🚀 Iniciando configuração do Webhook SocialNexus...");
    
    const config = await getConfig();
    const apiKey = config.asaasKey;

    if (!apiKey) {
        console.error("❌ Erro: Chave ASAAS não encontrada no Firebase. Configure no Admin primeiro!");
        return;
    }

    // URL do seu site no Netlify (Ajuste se for diferente)
    const webhookUrl = "https://socialnexus.netlify.app/.netlify/functions/asaas-webhook";

    const payload = {
        url: webhookUrl,
        email: config.email || "admin@socialnexus.com",
        enabled: true,
        interrupted: false,
        apiVersion: 3
    };

    const options = {
        hostname: 'api.asaas.com',
        port: 443,
        path: '/v3/webhook',
        method: 'POST',
        headers: {
            'access_token': apiKey,
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log("✅ WEBHOOK CONFIGURADO COM SUCESSO!");
                console.log("🔗 URL vinculada:", webhookUrl);
            } else {
                console.error("❌ Erro ao configurar:", body);
                console.log("\n💡 DICA: Se já existir um webhook, você deve editá-lo manualmente no painel do Asaas.");
            }
        });
    });

    req.on('error', (e) => console.error(e));
    req.write(JSON.stringify(payload));
    req.end();
}

setup();
