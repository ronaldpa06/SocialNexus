/** 
 * SOCIALNEXUS - WEBHOOK DETETIVE V3 (Bypass Cache)
 * Build: 2026-04-15_16:30
 */
const https = require('https');
const FIREBASE_DB_URL = 'https://socialnexus-58290-default-rtdb.firebaseio.com/socialnexus_kv/snx_users.json';

function fetchFirebaseData(method, data = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(FIREBASE_DB_URL);
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    let json = JSON.parse(body || 'null');
                    if (typeof json === 'string') json = JSON.parse(json);
                    resolve(json);
                } catch (e) { resolve(null); }
            });
        });
        req.on('error', e => resolve(null));
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST Required" };

    try {
        const payload = JSON.parse(event.body);
        if (payload.event === 'PAYMENT_RECEIVED' || payload.event === 'PAYMENT_CONFIRMED') {
            
            const paymentInfo = payload.payment;
            const amountPaid = parseFloat(paymentInfo.value); 
            const userId = paymentInfo.externalReference;
            const targetEmail = (paymentInfo.customerEmail || "").toLowerCase().trim();

            if (!userId && !targetEmail) return { statusCode: 200, body: "Ignorado - Sem Identificador" };

            let usersRaw = await fetchFirebaseData('GET');
            
            // Unwrapping
            if (typeof usersRaw === 'string') try { usersRaw = JSON.parse(usersRaw); } catch(e) {}
            if (typeof usersRaw === 'string') try { usersRaw = JSON.parse(usersRaw); } catch(e) {}

            let users = [];
            if (Array.isArray(usersRaw)) users = usersRaw;
            else if (usersRaw && typeof usersRaw === 'object') users = Object.values(usersRaw);

            let updated = false;
            for (let i = 0; i < users.length; i++) {
                if (!users[i]) continue;
                
                const dbId = users[i].id ? users[i].id.toString().trim() : "";
                const dbEmail = users[i].email ? users[i].email.toLowerCase().trim() : "";

                if (dbId === userId.toString().trim() || (targetEmail && dbEmail === targetEmail)) {
                    users[i].balance = parseFloat(users[i].balance || 0) + amountPaid;
                    
                    if (!users[i].notifications) users[i].notifications = [];
                    users[i].notifications.unshift({
                        id: Date.now(),
                        text: `Depósito de R$ ${amountPaid.toFixed(2)} via Pix confirmado! 💸`,
                        time: new Date().toISOString(),
                        unread: true,
                        icon: 'fas fa-wallet'
                    });
                    if (users[i].notifications.length > 10) users[i].notifications = users[i].notifications.slice(0, 10);
                    
                    updated = true;
                    break;
                }
            }

            if (updated) {
                 await fetchFirebaseData('PUT', users);
                 return { statusCode: 200, body: "OK - Saldo e Notificação processados" };
            } else {
                 const debug = `Total: ${users.length}, ID: ${userId}, Email: ${targetEmail}, DB1: ${users[0] ? users[0].id : 'N/A'}`;
                 return { statusCode: 404, body: `ERRO_FINAL_SINCRONIZADO|${debug}` };
            }

        }
        return { statusCode: 200, body: "Evento ignorado" };
    } catch (err) {
        return { statusCode: 500, body: "ERRO_INTERNO|" + err.message };
    }
};
