/**
 * SocialNexus - Webhook de Pagamento ASAAS
 * Este servidor invisível escuta as notificações do ASAAS 24/7.
 * Quando um Pix é pago, ele adiciona o saldo no Firebase automaticamente.
 */

const https = require('https');

// URL do nosso Banco de Dados Firebase (Realtime Database -> API REST)
const FIREBASE_DB_URL = 'https://socialnexus-58290-default-rtdb.firebaseio.com/socialnexus_kv/snx_users.json';

// Função auxiliar para fazer chamadas HTTP GET/PUT facilmente no Node puro
function fetchFirebaseData(method, data = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(FIREBASE_DB_URL);
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body || 'null'));
                } else {
                    reject(new Error(`Firebase Erro ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', e => reject(e));
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

exports.handler = async function(event, context) {
    // 1. Apenas aceitar requisições do tipo POST do Asaas
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        console.log("🔔 Webhook do ASAAS acionado!");
        
        // 2. Lendo o "Telegrama" (Mensagem) do Asaas
        const payload = JSON.parse(event.body);

        // Verificamos se o evento é "Pagamento Recebido" ou "Confirmado"
        if (payload.event === 'PAYMENT_RECEIVED' || payload.event === 'PAYMENT_CONFIRMED') {
            
            const paymentInfo = payload.payment;
            const amountPaid = parseFloat(paymentInfo.value); 
            const userId = paymentInfo.externalReference;

            if (!userId) {
                console.warn("⚠️ Pagamento sem ID de cliente (externalReference).");
                return { statusCode: 200, body: "Ignorado - Sem ID" };
            }

            console.log(`💰 Pix/Cartão Confirmado! Valor: R$${amountPaid} para Usuário ID: ${userId}`);

            // 3. Resgata todos os usuários do Firebase DB
            let usersRaw = await fetchFirebaseData('GET');
            
            // Corrige "Double Encoding" (Texto dentro de Texto)
            if (typeof usersRaw === 'string') {
                try { usersRaw = JSON.parse(usersRaw); } catch(e) {}
            }
            if (typeof usersRaw === 'string') {
                try { usersRaw = JSON.parse(usersRaw); } catch(e) {}
            }

            let users = [];
            // Normaliza para Array
            if (Array.isArray(usersRaw)) {
                users = usersRaw;
            } else if (usersRaw && typeof usersRaw === 'object') {
                users = Object.values(usersRaw);
            }
            
            // 4. Encontra o usuário específico
            let updated = false;
            for (let i = 0; i < users.length; i++) {
                if (!users[i]) continue;
                
                const dbId = users[i].id ? users[i].id.toString().trim() : "";
                const targetId = userId.toString().trim();
                const dbEmail = users[i].email ? users[i].email.toLowerCase().trim() : "";
                const targetEmail = (payload.payment.customerEmail || "").toLowerCase().trim();

                // Tenta pelo ID ou pelo Email (como plano B)
                if (dbId === targetId || (targetEmail && dbEmail === targetEmail)) {
                    
                    // 5. Soma o Saldo
                    const oldBalance = parseFloat(users[i].balance || 0);
                    users[i].balance = oldBalance + amountPaid;

                    // 6. ADICIONA NOTIFICAÇÃO REAL 🔔
                    if (!users[i].notifications) users[i].notifications = [];
                    
                    const newNotif = {
                        id: Date.now(),
                        text: `Depósito de R$ ${amountPaid.toFixed(2)} via Pix confirmado! 💸`,
                        time: new Date().toISOString(),
                        unread: true,
                        icon: 'fas fa-wallet'
                    };
                    
                    // Adiciona no topo (início do array)
                    users[i].notifications.unshift(newNotif);
                    
                    // Mantém apenas as últimas 10 notificações para não pesar
                    if (users[i].notifications.length > 10) {
                        users[i].notifications = users[i].notifications.slice(0, 10);
                    }

                    console.log(`✅ Saldo: R$ ${oldBalance} -> R$ ${users[i].balance}`);
                    console.log(`✅ Notificação adicionada para ${users[i].name}`);
                    
                    updated = true;
                    break;
                }
            }

            // 7. Atualiza o banco de dados
            if (updated) {
                 await fetchFirebaseData('PUT', users);
                 console.log("☁️ Firebase sincronizado e saldo creditado!");
                 return { statusCode: 200, body: "OK - Saldo e Notificação processados" };
            } else {
                 const debugInfo = `Total: ${users.length}, PrimeiroID: ${users[0] ? users[0].id : 'N/A'}, Tipo: ${typeof usersRaw}`;
                 console.error(`❌ Usuário ${userId} não encontrado. Info: ${debugInfo}`);
                 return { statusCode: 404, body: `Usuário ${userId} não encontrado. Debug: ${debugInfo}` };
            }

        } else {
            console.log("ℹ️ Evento ignorado:", payload.event);
            return { statusCode: 200, body: "Evento ignorado" };
        }

    } catch (error) {
        console.error("❌ ERRO GRAVE NO WEBHOOK:", error);
        return { statusCode: 500, body: "Erro interno do servidor Webhook" };
    }
};
