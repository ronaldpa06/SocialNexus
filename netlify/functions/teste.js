const https = require('https');
const URL = 'https://socialnexus-58290-default-rtdb.firebaseio.com/socialnexus_kv/snx_users.json';

exports.handler = async function(event) {
    return new Promise((resolve) => {
        // 1. Puxa os usuários
        https.get(URL, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', async () => {
                try {
                    let users = JSON.parse(body);
                    if (typeof users === 'string') users = JSON.parse(users);
                    
                    // Se for objeto, vira array
                    let list = Array.isArray(users) ? users : Object.values(users);
                    
                    // 2. Acha o Ronald e dá 10 reais
                    let r = list.find(u => u.id == 1776034564983);
                    if (r) {
                        r.balance = 10.00;
                        r.name = "Ronald (VIP)";
                        
                        // 3. Salva de volta
                        const req = https.request(URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' } }, (res2) => {
                            resolve({ statusCode: 200, body: "SISTEMA_OK_SALDO_ENVIADO" });
                        });
                        req.write(JSON.stringify(list));
                        req.end();
                    } else {
                        resolve({ statusCode: 404, body: "RONALD_NAO_ENCONTRADO_NA_LISTA" });
                    }
                } catch (e) {
                    resolve({ statusCode: 500, body: "ERRO: " + e.message });
                }
            });
        });
    });
};
