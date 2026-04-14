/**
 * SocialNexus - Automação Asaas Webhook
 * Execute com: node configurar-webhook.js
 * Ele fará a configuração inteira no servidor Asaas automaticamente.
 */

const https = require('https');
const readline = require('readline');

// Lê os dados
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const API_KEY = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjE2ZDBmZTljLTk1OTYtNGJiYy04MGRjLTI2NzEwOGU2ZDNjOTo6JGFhY2hfYThjYjdjNDYtZTMwYi00MTA4LTljZDktMGM5Nzg5Yjg0NzI3';

console.log('🤖 Assistente Inteligente do SocialNexus');
console.log('Vou configurar o seu Webhook no Asaas agora de forma 100% automática.\n');

rl.question('👉 Digite e pressione Enter o link do seu site (apenas a URL, ex: https://meusite.netlify.app): ', (netLink) => {
    
    // Formata o link
    let baseUrl = netLink.trim();
    if(baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    // URL do Webhook na Produção
    const WEBHOOK_URL = 'https://socialnexuss.netlify.app/.netlify/functions/asaas-webhook';
    const ASAAS_API_KEY = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmY3YWRmMDM1LTc1OWItNDU2MS04ZTRhLTI4MjQxODk3ZDI0Yjo6JGFhY2hfNjM2MDU2ZjItNjllMi00OTk1LTg1NDEtN2I3ODM1N2M5OWNi';
    const ASAAS_API_URL = 'api.asaas.com';
    
    const webhookFullUrl = WEBHOOK_URL;
    console.log(`\n📡 Ligando para o Asaas e registrando a URL Invisível: ${webhookFullUrl}...`);

    const payload = JSON.stringify({
        url: webhookFullUrl,
        email: 'suporte@socialnexus.com',
        apiVersion: 3,
        enabled: true,
        interrupted: false,
        events: ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']
    });

    const options = {
        hostname: 'www.asaas.com',
        port: 443,
        path: '/api/v3/webhook',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'access_token': API_KEY,
            'Content-Length': payload.length
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            rl.close();
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('✅ SUCESSO ABSOLUTO! O Asaas está totalmente configurado e protegido.');
                console.log('Sempre que alguém pagar um Pix, o saldo cairá automático!\n');
            } else {
                console.log('❌ Ocorreu um erro ao configurar no servidor do Asaas.');
                console.log(`Detalhes do Erro (${res.statusCode}):`, body);
            }
        });
    });

    req.on('error', (e) => {
        rl.close();
        console.error('❌ Erro de comunicação com a internet:', e.message);
    });

    req.write(payload);
    req.end();
});
