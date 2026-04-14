/**
 * SocialNexus - Firebase Sync Engine
 * Este script intercepta o localStorage e cria um espelho assíncrono na nuvem
 * permitindo que a aplicação SPA funcione de forma multi-dispositivo (Cross-Device)
 * sem precisar de um backend tradicional dedicado.
 */

const firebaseConfig = {
    apiKey: "AIzaSyBq_1F8_RtrgRus2rEs1rAwnPRwemp6um4",
    authDomain: "socialnexus-58290.firebaseapp.com",
    projectId: "socialnexus-58290",
    storageBucket: "socialnexus-58290.firebasestorage.app",
    messagingSenderId: "458408232322",
    appId: "1:458408232322:web:6bc1030e59c4f78c773b9b",
    databaseURL: "https://socialnexus-58290-default-rtdb.firebaseio.com"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const SYNC_KEYS = ['snx_users', 'snx_custom_services', 'snx_excluded_cats']; // Chaves globais
const originalSetItem = localStorage.setItem;
const originalGetItem = localStorage.getItem;

let isSyncingFromCloud = false;

// 1. Interceptar salvamentos locais para enviar para a nuvem
localStorage.setItem = function(key, value) {
    // Sempre salva localmente primeiro (Resposta Instantânea)
    originalSetItem.apply(this, arguments);
    
    // Se a alteração não veio da nuvem, nós empurramos para a nuvem
    if (!isSyncingFromCloud) {
        if (SYNC_KEYS.includes(key) || key.startsWith('snx_orders_')) {
            // Fazer um 'fire and forget' para não travar a UI
            db.ref('socialnexus_kv/' + key).set(value).catch(console.error);
        }
    }
};

// 2. Ouvinte Global: Sincroniza dados da Nuvem para o PC/Celular do cliente
db.ref('socialnexus_kv').on('value', (snapshot) => {
    const cloudData = snapshot.val();
    if (cloudData) {
        let hasChanges = false;
        
        isSyncingFromCloud = true;
        for (let key in cloudData) {
            const localVal = originalGetItem.apply(localStorage, [key]);
            
            // Se o dado da nuvem for diferente do que está no celular/PC atual
            if (localVal !== cloudData[key]) {
                originalSetItem.apply(localStorage, [key, cloudData[key]]);
                
                // Se o current_user foi afetado, precisa atualizar a "sessão" 
                // para o saldo refletir no header sem F5
                if (key === 'snx_users' && window.currentUser && window.currentUser.role !== 'admin') {
                    try {
                        const parsedUsers = JSON.parse(cloudData[key]);
                        const updatedMe = parsedUsers.find(u => u.id === window.currentUser.id);
                        if (updatedMe) {
                            window.currentUser = updatedMe;
                            originalSetItem.apply(localStorage, ['snx_session', JSON.stringify(updatedMe)]);
                        }
                    } catch(e) {}
                }
                hasChanges = true;
            }
        }
        isSyncingFromCloud = false;

        // Avisa aos componentes da UI para se repintarem com os novos dados invisíveis
        if (hasChanges) {
            triggerUIUpdate();
        }
    }
});

// Atualiza vitrines dinâmicas sem forçar reloads brutais
function triggerUIUpdate() {
    if (typeof loadAdminDashboard === 'function' && document.getElementById('admin-page')?.classList.contains('active')) {
        loadAdminDashboard();
    }
    if (typeof updateLandingPrices === 'function') updateLandingPrices();
    if (typeof loadAdminServicesMgmt === 'function' && document.getElementById('admin-page')?.classList.contains('active')) {
        loadAdminServicesMgmt();
    }
    if (typeof loadDashboard === 'function' && document.getElementById('dashboard-page')?.classList.contains('active')) {
        loadDashboard();
    }
}

// ─── Integração Real com GMAIL (Google Auth) ───
window.handleGoogleAuthReal = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            const email = user.email;
            const name = user.displayName;
            
            // Lógica de Criação ou Login na base restrita do SocialNexus
            const storedUsers = JSON.parse(originalGetItem.apply(localStorage, ['snx_users']) || '[]');
            let snxUser = storedUsers.find(u => u.email === email);
            
            if (!snxUser) {
                // Cria novo cliente usando a conta Google
                snxUser = {
                    id: Date.now(),
                    name: name,
                    username: email.split('@')[0],
                    email: email,
                    whatsapp: '',
                    password: 'google_auth_linked',
                    balance: 0,
                    plan: 'Starter',
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`,
                    joined: new Date().toISOString()
                };
                storedUsers.push(snxUser);
                localStorage.setItem('snx_users', JSON.stringify(storedUsers));
                showToast('Conta Google conectada com sucesso! 🎉', 'success');
            } else {
                showToast(`Bem-vindo de volta, ${name.split(' ')[0]}!`, 'success');
            }
            
            // Define Sessão Atual
            window.currentUser = snxUser;
            originalSetItem.apply(localStorage, ['snx_session', JSON.stringify(snxUser)]);
            
            // Navega
            if (typeof showPage === 'function') {
                showPage('dashboard-page');
                loadDashboard();
            } else {
                location.reload();
            }
        })
        .catch((error) => {
            console.error("Google Auth Erro Completo:", error);
            let errMsg = 'Erro no Google Login: ' + error.message;
            if(window.location.protocol === 'file:') {
                errMsg = 'O Login do Google não funciona abrindo o arquivo direto do PC (file://). Suba para a Netlify ou use um Local Server!';
            }
            showToast(errMsg, 'error');
            alert(errMsg);
        });
};
