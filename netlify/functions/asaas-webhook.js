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
            const amountPaid = parseFloat(paymentInfo.netValue || paymentInfo.value); 
            const userId = paymentInfo.externalReference; // O 'RG' do cliente que botamos no app.js!

            if (!userId) {
                console.warn("⚠️ Pagamento sem ID de cliente. Ignorando...");
                return { statusCode: 200, body: "Ignorado - Sem ID" };
            }

            console.log(`💰 Pix / Cartão aprovado! Valor: R$${amountPaid} para Usuário ID: ${userId}`);

            // 3. Resgata todos os usuários do Firebase DB
            let rawUsers = await fetchFirebaseData('GET');
            let users = [];
            
            // Desenbrulha a String (como o site salva no Firebase)
            if (typeof rawUsers === 'string') {
                users = JSON.parse(rawUsers);
            } else if (Array.isArray(rawUsers)) {
                users = rawUsers;
            }
            
            // 4. Encontra o usuário específico
            let orderFoundAndUpdated = false;
            for (let i = 0; i < users.length; i++) {
                if (users[i] && users[i].id.toString() === userId.toString()) {
                    
                    // 5. Adiciona o saldo na conta dele!
                    users[i].balance = parseFloat(users[i].balance || 0) + amountPaid;
                    console.log(`✅ Saldo atualizado com sucesso. Novo saldo: R$ ${users[i].balance}`);
                    
                    orderFoundAndUpdated = true;
                    break;
                }
            }

            // 6. Atualiza e Salva o banco de dados inteiro no Firebase
            if (orderFoundAndUpdated) {
                 // Embrulha de volta em String para manter a compatibilidade com o site
                 await fetchFirebaseData('PUT', JSON.stringify(users));
                 console.log("☁️ Firebase sincronizado com sucesso!");
                 return { statusCode: 200, body: "Saldo creditado com sucesso!" };
            } else {
                 console.error("❌ Usuário não encontrado no banco de dados.");
                 return { statusCode: 404, body: "Usuário não encontrado" };
            }

        } else {
            console.log("ℹ️ Evento ignorado (Não é recebimento de dinheiro):", payload.event);
            return { statusCode: 200, body: "Evento ignorado" };
        }

    } catch (error) {
        console.error("❌ ERRO GRAVE NO WEBHOOK:", error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                success: false, 
                message: "Erro interno no servidor do Webhook",
                error: error.message 
            }) 
        };
    }
};
