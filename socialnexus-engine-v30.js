/* ============================================

   SocialNexus — JavaScript Engine (v30.0)

   ============================================ */

console.log("SocialNexus Engine v30.0 loaded.");

window.SNX_V = '29.0';

// ─── Services Database ───

// Usamos window.servicesDB para garantir que o services-data.js e o app.js compartilhem os mesmos dados

if (typeof window.servicesDB === 'undefined') window.servicesDB = {};

const servicesDB = window.servicesDB;





// ─── App State & Internationalization ───

let currentUser = null;

window.currentUser = null; // Exposição para o Sincronizador de Nuvem



// Funcao de limpeza de encoding corrompido (aplicada globalmente)

function fixEncoding(str) {

    if (!str || typeof str !== 'string') return str;

    

    // Normalize Unicode Bold/Italic characters to standard ASCII

    let res = str.replace(/[\u1D400-\u1D7FF]/g, (char) => {

        const code = char.codePointAt(0);

        if (code >= 0x1D400 && code <= 0x1D419) return String.fromCharCode(code - 0x1D400 + 65); // Bold A-Z

        if (code >= 0x1D5EE && code <= 0x1D607) return String.fromCharCode(code - 0x1D5EE + 97); // Bold a-z

        if (code >= 0x1D5D4 && code <= 0x1D5ED) return String.fromCharCode(code - 0x1D5D4 + 65); // Sans-bold A-Z

        if (code >= 0x1D516 && code <= 0x1D52F) return String.fromCharCode(code - 0x1D516 + 65); // Fraktur A-Z?

        return char;

    });



    // Specific mapping for common bold fonts in SMM

    const boldMap = {'𝗥':'R','𝗘':'E','𝗙':'F','𝗜':'I','𝗟':'L','𝗗':'D'};

    for(let b in boldMap) { res = res.split(b).join(boldMap[b]); }



        // 1. Mojibake Fix
    res = res
        .replace(/INSTANTÂNEOâneo/g, 'INSTANTÂNEO')
        .replace(/INSTANTÃ‚NEO/g, 'INSTANTÂNEO')
        .replace(/Â/g, '');

// 2. Tradução de Termos Comuns

    const map = {

        'LIKES': 'CURTIDAS', 'FOLLOWERS': 'SEGUIDORES', 'VIEWS': 'VISUALIZAÇÕES',

        'COMMENTS': 'COMENTÁRIOS', 'MEMBERS': 'MEMBROS', 'PLAYS': 'REPRODUÇÕES',

        'WATCH TIME': 'TEMPO DE EXIBIÇÃO', 'SERVICES': 'SERVIÇOS', 'BEST': 'MELHOR',

        'REAL': 'REAIS', 'MIXED': 'MISTOS', 'INSTANT': 'INSTANTÂNEO'

    };

    

    for (let eng in map) {

        const reg = new RegExp('\\b' + eng + '\\b', 'gi');

        res = res.replace(reg, map[eng]);

    }

    

    return res;

}



function checkRefillSupport(name) {

    if (!name) return false;

    const normalized = fixEncoding(name).toUpperCase();

    if (normalized.includes('NO REFILL')) return false;

    // REFILL seguido de número e D/DIA/DAYS (considerando espaços ou não)

    return /REFILL.*\d+\s*(D|DIA|DAY)/i.test(normalized);

}



function cleanText(str) {

    return fixEncoding(str);

}





let orders = [];

let selectedPaymentMethod = null;



// Multi-language configuration

const i18n = {

    pt: {

        nav_features: "Recursos",

        nav_services: "Serviços",

        nav_stats: "Estatísticas",

        nav_faq: "FAQ",

        btn_login: "Entrar",

        btn_register: "Cadastrar",

        hero_title: "Impulsione suas Redes Sociais com resultados reais",

        hero_subtitle: "Seguidores, curtidas, visualizações e engajamento para Instagram, TikTok, YouTube, Twitter e mais.",

        btn_start: "Começar Agora — Grátis",

        btn_view_services: "Ver Serviços",

        dash_welcome: "Bem-vindo de volta",

        dash_balance: "Saldo disponível",

        dash_new_order: "Novo Pedido",

        dash_my_orders: "Meus Pedidos",

        dash_add_funds: "Adicionar Saldo",

        dash_api: "API",

        dash_support: "Suporte",

        label_category: "Categoria",

        label_service: "Serviço",

        label_link: "Link do Perfil/Post",

        label_quantity: "Quantidade",

        label_total: "Total a Pagar",

        btn_place_order: "Confirmar Pedido",

        toast_success: "Sucesso!",

        toast_error: "Erro!",

        // Add more as needed

    },

    en: {

        nav_features: "Features",

        nav_services: "Services",

        nav_stats: "Stats",

        nav_faq: "FAQ",

        btn_login: "Login",

        btn_register: "Sign Up",

        hero_title: "Boost your Social Media with real results",

        hero_subtitle: "Followers, likes, views and engagement for Instagram, TikTok, YouTube, Twitter and more.",

        btn_start: "Start Now — Free",

        btn_view_services: "View Services",

        dash_welcome: "Welcome back",

        dash_balance: "Available Balance",

        dash_new_order: "New Order",

        dash_my_orders: "My Orders",

        dash_add_funds: "Add Funds",

        dash_api: "API",

        dash_support: "Support",

        label_category: "Category",

        label_service: "Service",

        label_link: "Profile/Post Link",

        label_quantity: "Quantity",

        label_total: "Total Cost",

        btn_place_order: "Place Order",

        toast_success: "Success!",

        toast_error: "Error!",

    }

};



// Currency configuration

const currencies = {

    BRL: { symbol: "R$", rate: 1, name: "Real" },

    USD: { symbol: "$", rate: 5.20, name: "Dollar" } // --- SIMULAÇÃO DE TESTE (SEM DINHEIRO REAL) ---

};





let currentLang = localStorage.getItem('snx_lang') || 'pt';

let currentCurrency = localStorage.getItem('snx_currency') || 'BRL';



// ─── Internationalization Functions ───

function setLanguage(lang) {

    currentLang = lang;

    localStorage.setItem('snx_lang', lang);

    applyTranslations();

    updateServices(); // Refresh prices in dropdowns

    loadServicesList(); // Refresh table

    if (currentUser) loadDashboard();

}



function setCurrency(curr) {

    currentCurrency = curr;

    localStorage.setItem('snx_currency', curr);

    applyTranslations();

    updateServices();

    loadServicesList();

    if (currentUser) loadDashboard();

    if (currentUser?.email === 'admin@socialnexus.com') loadAdminDashboard();

}



function applyTranslations() {

    const langData = i18n[currentLang];

    document.querySelectorAll('[data-i18n]').forEach(el => {

        const key = el.getAttribute('data-i18n');

        if (langData[key]) {

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {

                el.placeholder = langData[key];

            } else {

                el.textContent = langData[key];

            }

        }

    });

}



function formatValue(valueBRL) {

    const config = currencies[currentCurrency];

    const converted = valueBRL / (currentCurrency === 'USD' ? config.rate : 1);

    return `${config.symbol} ${converted.toFixed(2)}`;

}



// ─── Page Navigation ───

function showPage(pageId) {

    const pages = document.querySelectorAll('.page');

    pages.forEach(p => p.classList.remove('active'));

    

    const targetPage = document.getElementById(pageId);

    if (targetPage) {

        targetPage.classList.add('active');

        window.scrollTo(0, 0);

        // Persistência

        localStorage.setItem('snx_active_page', pageId);

    }

}



/**

 * Logotipo Inteligente: Volta para Home ou Dashboard

 */

function handleLogoClick() {

    if (currentUser) {

        if (currentUser.role === 'admin') {

            showPage('admin-page');

            loadAdminDashboard();

        } else {

            showPage('dashboard-page');

            showDashTab('dash-overview', document.getElementById('sidebar-overview'));

        }

    } else {

        showPage('landing-page');

    }

}



/**

 * Simulação/Realidade de Recuperação de Senha

 */

function handleForgotPassword() {

    const email = document.getElementById('login-email').value || prompt('Digite o e-mail cadastrado para redefinir a senha:');

    if (email) {

        // Envio real Firebase (opcional no futuro) / Feedback local

        showToast(`Link de recuperação enviado para ${email}! Verifique o lixo eletrônico.`, 'success');

    }

}



/**

 * Simulação de Termos e Privacidade

 */

/**

 * Sistema de Políticas Legais (Termos, Privacidade e Reembolso)

 */

function showPolicy(type) {

    const modal = document.getElementById('policy-modal');

    const title = document.getElementById('policy-title');

    const body = document.getElementById('policy-body');



    if (!modal || !title || !body) return;



    let content = '';

    

    if (type === 'terms') {

        title.innerHTML = '<i class="fas fa-file-contract"></i> Termos de Uso';

        content = `

            <h4>1. Aceitação dos Termos</h4>

            <p>Ao acessar e se cadastrar no SocialNexus, você concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis. Se você não concordar com algum destes termos, está proibido de usar ou acessar este site.</p>

            <h4>2. Uso de Serviços</h4>

            <p>Os serviços oferecidos pelo SocialNexus destinam-se exclusivamente à promoção de perfis em redes sociais. Não garantimos que os novos seguidores interajam com você, apenas garantimos a entrega da quantidade contratada.</p>

            <p>Você não deve usar o SocialNexus para qualquer finalidade ilícita ou proibida pelas redes sociais (Instagram, TikTok, etc).</p>

            <h4>3. Responsabilidade</h4>

            <p>Não somos responsáveis por qualquer suspensão de conta ou exclusão de imagem feita pelo Instagram, Facebook, Twitter, YouTube ou outras redes sociais.</p>

        `;

    } else if (type === 'privacy') {

        title.innerHTML = '<i class="fas fa-user-shield"></i> Política de Privacidade';

        content = `

            <h4>1. Coleta de Dados</h4>

            <p>Coletamos apenas as informações necessárias para o seu login e processamento de pedidos (Nome, Email e WhatsApp). Suas senhas são criptografadas e nunca compartilhadas.</p>

            <h4>2. Segurança</h4>

            <p>Tomamos medidas de segurança para proteger suas informações pessoais contra acesso não autorizado ou alteração. Seus dados financeiros são processados diretamente pelo gateway Asaas, não armazenamos dados de cartão de crédito em nossos servidores.</p>

        `;

    } else if (type === 'refund') {

        title.innerHTML = '<i class="fas fa-undo"></i> Política de Reembolso';

        content = `

            <h4>1. Condições de Reembolso</h4>

            <p>Reembolsos serão realizados integralmente apenas se o pedido não puder ser iniciado pelo sistema em até 72 horas após a confirmação do pagamento.</p>

            <p>Não haverá reembolso para pedidos enviados para perfis "Privados" ou com links incorretos fornecidos pelo cliente.</p>

            <h4>2. Saldo no Painel</h4>

            <p>Uma vez adicionado saldo ao painel SocialNexus, este valor deve ser utilizado para a contratação de serviços dentro da plataforma. Não realizamos estorno de saldo depositado para conta bancária após o uso parcial.</p>

        `;

    }



    body.innerHTML = content;

    modal.classList.add('active');

    document.body.style.overflow = 'hidden'; // Trava o scroll do fundo

}



function closePolicy() {

    const modal = document.getElementById('policy-modal');

    if (modal) {

        modal.classList.remove('active');

        document.body.style.overflow = ''; // Destrava o scroll

    }

}



// ─── Mobile Menu Toggle ───

function toggleMobileMenu() {

    const links = document.getElementById('nav-links');

    links.classList.toggle('active');

}



// ─── Navbar Scroll Effect ───

window.addEventListener('scroll', () => {

    const navbar = document.getElementById('navbar');

    if (navbar) {

        navbar.classList.toggle('scrolled', window.scrollY > 50);

    }

});



// ─── FAQ Toggle ───

function toggleFaq(element) {

    const isActive = element.classList.contains('active');

    document.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));

    if (!isActive) element.classList.add('active');

}



// ─── Password Toggle ───

function togglePassword(inputId, btn) {

    const input = document.getElementById(inputId);

    const icon = btn.querySelector('i');

    if (input.type === 'password') {

        input.type = 'text';

        icon.classList.replace('fa-eye', 'fa-eye-slash');

    } else {

        input.type = 'password';

        icon.classList.replace('fa-eye-slash', 'fa-eye');

    }

}



/* ============================================

   SocialNexus — Automation & API Configuration

   ============================================ */

const SNX_CONFIG = {

    // Provedor (GrowFollows API v2 padrão SMM)

    PROVIDER_API_URL: 'https://growfollows.com/api/v2',

    PROVIDER_API_KEY: 'c1c3eac23e812939dedefdc9ac4bfb1c', 



    // Gateway de Pagamento (Asaas API v3)

    ASAAS_API_URL: 'https://www.asaas.com/api/v3',

    ASAAS_API_KEY: 'aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmY3YWRmMDM1LTc1OWItNDU2MS04ZTRhLTI4MjQxODk3ZDI0Yjo6JGFhY2hfNjM2MDU2ZjItNjllMi00OTk1LTg1NDEtN2I3ODM1N2M5OWNi', 

    

    // Configurações Globais

    MIN_DEPOSIT: 1.00    // Depósito mínimo em Real

};



const AutomationEngine = {

    /**

     * Envia o pedido automaticamente para o fornecedor (GrowFollows) proxy 

     */

    async sendToProvider(order) {

        if (!SNX_CONFIG.PROVIDER_API_KEY) {

            console.warn('SocialNexus: API Key faltante.');

            return { success: false, error: 'API Key missing' };

        }

        try {

            console.log(`[Automação] Enviando pedido #${order.id} via proxy...`);

            const response = await fetch('/.netlify/functions/provider-proxy', {

                method: 'POST',

                body: JSON.stringify({

                    providerUrl: SNX_CONFIG.PROVIDER_API_URL,

                    params: {

                        key: SNX_CONFIG.PROVIDER_API_KEY,

                        action: 'add',

                        service: Number(order.serviceId),

                        link: order.link,

                        quantity: Number(order.quantity)

                    }

                })

            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`[SocialNexus] Falha no Proxy: ${response.status} - ${errText}`);
                return { success: false, error: `Proxy Error (${response.status})` };
            }

            const data = await response.json();

            if (data.order) {

                return { success: true, externalId: data.order };

            } else {

                return { success: false, error: data.error || 'Erro desconhecido.' };

            }

        } catch (err) {
            console.error('[SocialNexus] Erro de Conexão Proxy:', err);
            return { success: false, error: `Proxy Connection failed (${err.message})` };
        }

    },



    async requestRefill(externalId) {

        if (!SNX_CONFIG.PROVIDER_API_KEY) return { success: false, error: 'API Key missing' };

        try {

            const response = await fetch('/.netlify/functions/provider-proxy', {

                method: 'POST',

                body: JSON.stringify({

                    providerUrl: SNX_CONFIG.PROVIDER_API_URL,

                    params: { key: SNX_CONFIG.PROVIDER_API_KEY, action: 'refill', order: externalId }

                })

            });

            const data = await response.json();

            if (data.refill) return { success: true, refillId: data.refill };

            return { success: false, error: data.error || 'Erro na reposição' };

        } catch (err) {

            return { success: false, error: 'Falha de conexão' };

        }

    },



    async syncOrderStatus(externalId) {

        if (!SNX_CONFIG.PROVIDER_API_KEY) return null;

        try {

            const response = await fetch('/.netlify/functions/provider-proxy', {

                method: 'POST',

                body: JSON.stringify({

                    providerUrl: SNX_CONFIG.PROVIDER_API_URL,

                    params: { key: SNX_CONFIG.PROVIDER_API_KEY, action: 'status', order: externalId }

                })

            });

            const data = await response.json();

            return data;

        } catch (err) {

            return null;

        }

    },



    /**

     * Gera uma cobrança PIX no Asaas

     */

    async generatePayment(amount) {

        if (!SNX_CONFIG.ASAAS_API_KEY) {

            return { success: false, method: 'manual', error: 'Configuração pendente' };

        }



        try {

            console.log(`[Pagamento] Gerando cobrança de R$ ${amount}...`);

            

            // Simulando resposta positiva imediata para evitar bloqueio de CORS no navegador

            // Em um servidor backend, aqui seria a chamada real de API v3 do Asaas

            return new Promise((resolve) => {

                setTimeout(() => {

                    resolve({

                        success: true,

                        pixCode: "00020101021226850014BR.GOV.BCB.PIX011112345678901520400005303986540510.005802BR5913SOCIALNEXUES6009SAO%20PAULO62070503***6304E2D5"

                    });

                }, 1200);

            });

        } catch (err) {

            console.error('[Pagamento] Erro no processamento:', err);

            return { success: false, error: err.message };

        }

    }

};



// ─── Toast Notifications ───

function showToast(message, type = 'info') {

    const container = document.getElementById('toast-container');

    const icons = {

        success: 'fas fa-check-circle',

        error: 'fas fa-exclamation-circle',

        info: 'fas fa-info-circle',

        warning: 'fas fa-exclamation-triangle'

    };



    const toast = document.createElement('div');

    toast.className = `toast ${type}`;

    toast.innerHTML = `

        <i class="${icons[type]}"></i>

        <span class="toast-message">${message}</span>

    `;

    container.appendChild(toast);



    setTimeout(() => toast.remove(), 4000);

}



// ─── Auth Handlers ───

function handleLogin(e) {

    if (e) e.preventDefault();

    const email = document.getElementById('login-email').value;

    const pass = document.getElementById('login-password').value;



    // Admin Login Check

    if (email === 'admin@socialnexus.com' && pass === 'admin123') {

        currentUser = { name: 'Admin', email: email, role: 'admin', balance: 0 };

        localStorage.setItem('snx_session', JSON.stringify(currentUser));

        showPage('admin-page');

        loadAdminDashboard();

        return;

    }



    const storedUsers = JSON.parse(localStorage.getItem('snx_users') || '[]');

    const user = storedUsers.find(u => u.email === email && u.password === pass);



    if (user) {

        currentUser = user;

        localStorage.setItem('snx_session', JSON.stringify(currentUser));

        loadDashboard();

        showPage('dashboard-page');

        showToast(`Bem-vindo de volta, ${user.name}!`, 'success');

    } else {

        showToast('E-mail ou senha incorretos.', 'error');

    }

}



function handleRegister(e) {

    e.preventDefault();

    const name = document.getElementById('reg-name').value;

    const username = document.getElementById('reg-username').value;

    const email = document.getElementById('reg-email').value;

    const whatsapp = document.getElementById('reg-whatsapp').value;

    const password = document.getElementById('reg-password').value;

    const confirm = document.getElementById('reg-confirm').value;



    if (password !== confirm) {

        showToast('As senhas não coincidem!', 'error');

        return;

    }



    if (password.length < 6) {

        showToast('A senha deve ter pelo menos 6 caracteres', 'error');

        return;

    }



    const storedUsers = JSON.parse(localStorage.getItem('snx_users') || '[]');

    

    if (storedUsers.find(u => u.email === email)) {

        showToast('E-mail já cadastrado!', 'error');

        return;

    }



    currentUser = {

        id: Date.now(),

        name,

        username,

        email,

        whatsapp,

        password,

        balance: 0,

        plan: 'Starter',

        joined: new Date().toISOString()

    };



    storedUsers.push(currentUser);

    localStorage.setItem('snx_users', JSON.stringify(storedUsers));

    localStorage.setItem('snx_session', JSON.stringify(currentUser));



    loadDashboard();

    showPage('dashboard-page');

    showToast('Conta criada com sucesso! 🎉', 'success');

}



function handleLogout() {

    if (!confirm('Deseja realmente sair da sua conta?')) return;

    

    currentUser = null;

    window.currentUser = null;

    

    // IMPORTANTE: Usar originalSetItem para contornar o interceptador do Firebase Sync

    // O firebase-sync.js intercepta localStorage.setItem e localStorage.clear()

    // então precisamos usar as funcoes originais antes da interceptacao

    if (typeof originalSetItem === 'function') {

        // Remove a sessao sem triggerar o firebase sync

        // Usar funcao exposta pelo firebase-sync para evitar loop de sync

        if (typeof window._snxOriginalRemoveItem === 'function') {

            window._snxOriginalRemoveItem('snx_session');

        } else {

            Storage.prototype.removeItem.call(localStorage, 'snx_session');

        }

    } else {

        // Fallback: remover direto

        try { localStorage.removeItem('snx_session'); } catch(e) {}

    }

    

    // Navegar para home ANTES de recarregar (para evitar loop)

    showPage('landing-page');

    showToast('Voce saiu da sua conta.', 'info');

    

    // Recarregar apos curto delay para limpar estado

    setTimeout(function() {

        window.location.replace(window.location.origin + window.location.pathname);

    }, 500);

}



/**

 * Simulação de Autenticação via Google/Gmail

 */

/**

 * Autenticação via Google/Gmail Real (Firebase)

 */

function handleGoogleAuth() {

    if (typeof handleGoogleAuthReal === 'function') {

        handleGoogleAuthReal();

    } else {

        showToast('Erro: Motor de autenticação não carregado.', 'error');

    }

}



function finishGoogleAuth(name, email) {

    document.querySelector('.google-auth-overlay')?.remove();

    showToast(`Autenticando como ${name}...`, 'success');



    // Simula a criação/recuperação do usuário

    let storedUsers = JSON.parse(localStorage.getItem('snx_users') || '[]');

    let user = storedUsers.find(u => u.email === email);



    if (!user) {

        user = {

            id: Date.now(),

            name: name,

            username: email.split('@')[0],

            email: email,

            password: 'google-auth-' + Math.random().toString(36).slice(-8),

            balance: 0,

            joined: new Date().toISOString(),

            avatar: `https://ui-avatars.com/api/?name=${name}&background=667eea&color=fff`

        };

        storedUsers.push(user);

        localStorage.setItem('snx_users', JSON.stringify(storedUsers));

    }



    currentUser = user;

    localStorage.setItem('snx_session', JSON.stringify(currentUser));

    

    // Direciona para o Dashboard

    closeAuthModals();

    loadDashboard();

    loadClientTickets();

    showPage('dashboard-page');

    showToast(`Bem-vindo, ${name}! Logado via Google.`, 'success');

}



// ─── Dashboard Functions ───

/**

 * ─── Sincronizador de Saldo em Tempo Real (Background Polling) ───

 */

async function startBalancePolling() {

    // Busca o saldo imediatamente ao carregar

    await refreshUserBalance();

    

    // E depois a cada 10 segundos de forma invisível

    // E depois a cada 3 segundos de forma invisível para ser "tempo real" como o cliente pediu

    setInterval(async () => {

        if (currentUser && currentUser.id) {

            await refreshUserBalance();

            if (document.getElementById('dashboard-page').style.display === 'block') {

                // Sincroniza silenciosamente os pedidos (vai atualizar a UI se mudar)

                if (typeof loadOrders === 'function') loadOrders(true);

            }

        }

    }, 3000); 

}



async function refreshUserBalance() {

    if (!currentUser || !currentUser.id) return;

    

    try {

        const users = typeof syncFromFirebase === 'function' ? await syncFromFirebase() : [];

        if (users && users.length > 0) {

            // Comparação robusta (converte tudo para String para não dar erro)

            const freshData = users.find(u => u.id.toString() === currentUser.id.toString());

            

            if (freshData) {

                const newBal = parseFloat(freshData.balance || 0);

                if (currentUser.balance !== newBal) {

                    currentUser.balance = newBal;

                    localStorage.setItem('snx_session', JSON.stringify(currentUser));

                    

                    const balEl = document.getElementById('user-balance');

                    const statBalEl = document.getElementById('stat-balance');

                    if (balEl) balEl.textContent = formatValue(currentUser.balance);

                    if (statBalEl) statBalEl.textContent = formatValue(currentUser.balance);

                    showToast('Saldo atualizado! 💰', 'success');

                }



                // Sincroniza Notificações

                if (JSON.stringify(currentUser.notifications || []) !== JSON.stringify(freshData.notifications || [])) {

                    currentUser.notifications = freshData.notifications || [];

                    localStorage.setItem('snx_session', JSON.stringify(currentUser));

                    renderNotifications();

                    

                    // Mostra o badge vermelho se houver não lidas

                    const hasUnread = currentUser.notifications.some(n => n.unread);

                    const badge = document.getElementById('drop-notif-count');

                    if (badge && hasUnread) {

                        badge.style.display = 'flex';

                        badge.textContent = currentUser.notifications.filter(n => n.unread).length;

                    }

                }

            }

        }

    } catch (err) {

        console.error("❌ Erro na sincronização:", err);

    }

}



// 🔔 Renderiza as Notificações Reais

function renderNotifications() {

    const container = document.getElementById('notif-content');

    if (!container || !currentUser) return;



    if (!currentUser.notifications || currentUser.notifications.length === 0) {

        container.innerHTML = '<div style="padding: 20px; text-align: center; opacity: 0.5;">Nenhuma notificação por enquanto.</div>';

        return;

    }



    container.innerHTML = currentUser.notifications.map(n => `

        <div class="notif-item ${n.unread ? 'unread' : ''}">

            <i class="${n.icon || 'fas fa-wallet'}" style="color: #00ff88;"></i>

            <div>

                <p>${n.text}</p>

                <span style="font-size: 0.7rem; opacity: 0.6;">${formatNotifTime(n.time)}</span>

            </div>

        </div>

    `).join('');

}



function formatNotifTime(isoString) {

    if (!isoString) return '';

    const date = new Date(isoString);

    const now = new Date();

    const diff = Math.floor((now - date) / 1000); // segundos



    if (diff < 60) return 'Agora mesmo';

    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;

    if (diff < 86400) return `Há ${Math.floor(diff / 3600)} horas`;

    return date.toLocaleDateString();

}



function loadDashboard() {

    if (!currentUser) return;

    

    // Inicia o monitoramento constante do saldo

    startBalancePolling();



    // Sincroniza dados no Topbar e Perfil

    const displayName = formatDisplayName(currentUser.name);

    const topName = document.getElementById('top-user-name');

    const topAvatar = document.getElementById('top-user-avatar');

    const profName = document.getElementById('profile-name');

    const profEmail = document.getElementById('profile-email');

    

    if (displayName) {

        const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        if (topName) topName.innerText = displayName;

        if (topAvatar) topAvatar.innerText = initials;

        if (profName) profName.innerText = displayName;

        

        // Novos campos de perfil

        const profUser = document.getElementById('profile-username');

        const profEmail = document.getElementById('profile-email');

        const profPhone = document.getElementById('profile-phone');

        

        if (profUser) profUser.innerText = currentUser.username || currentUser.email.split('@')[0];

        if (profEmail) profEmail.innerText = currentUser.email;

        if (profPhone) profPhone.innerText = currentUser.whatsapp || '(00) 00000-0000';

    }



    // Atualiza saldo e fidelidade

    if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();

    if (typeof updateLoyalty === 'function') updateLoyalty();

    renderNotifications();



    // Novas referências UpMidias

    const welcomeUser = document.getElementById('welcome-username');

    if (welcomeUser && displayName) welcomeUser.textContent = displayName.toLowerCase();

    

    const balanceEl = document.getElementById('stat-balance');

    if (balanceEl) balanceEl.textContent = formatValue(currentUser.balance);

    

    // Stats de pedidos

    const totalOrdersEl = document.getElementById('stat-total-orders');

    if (totalOrdersEl) totalOrdersEl.textContent = (orders || []).length;

    

    // Fallback para o topbar

    const topBalance = document.getElementById('user-balance');

    if(topBalance) {

        if (typeof animateValue === 'function') {

            animateValue(topBalance, currentUser.balance);

        } else {

            topBalance.textContent = currentUser.balance.toFixed(2);

        }

    }



    if (typeof loadOrders === 'function') loadOrders();

    if (typeof loadServicesList === 'function') loadServicesList();

    if (typeof renderCategories === 'function') renderCategories();

    if (typeof startLiveTicker === 'function') startLiveTicker();

}



function toggleUserDropdown() {

    const menu = document.getElementById('user-dropdown-menu');

    const notif = document.getElementById('notif-panel');

    if (menu) {

        menu.classList.toggle('active');

        // Fecha as notificações se o menu abrir

        if (menu.classList.contains('active') && notif) notif.classList.remove('active');

    }

}



function toggleNotificationPanel() {

    const panel = document.getElementById('notif-panel');

    const menu = document.getElementById('user-dropdown-menu');

    if (panel) {

        panel.classList.toggle('active');

        if (panel.classList.contains('active')) {

            // Marca como lidas quando abrir o painel

            if (currentUser && currentUser.notifications) {

                let changed = false;

                currentUser.notifications.forEach(n => {

                    if (n.unread) {

                        n.unread = false;

                        changed = true;

                    }

                });

                if (changed) {

                    localStorage.setItem('snx_session', JSON.stringify(currentUser));

                    renderNotifications();

                }

            }

            if (menu) menu.classList.remove('active');

        }

    }

    const badge = document.getElementById('drop-notif-count');

    if (badge) badge.style.display = 'none';

}



// Fecha menus ao clicar fora

window.addEventListener('click', (e) => {

    const userContainer = document.querySelector('.topbar-user-dropdown-container');

    if (userContainer && !userContainer.contains(e.target)) {

        document.getElementById('user-dropdown-menu')?.classList.remove('active');

        document.getElementById('notif-panel')?.classList.remove('active');

    }

});



function updateLoyalty() {

    const totalSpent = (orders || []).reduce((sum, order) => sum + (order.total || 0), 0);

    const tierBadge = document.getElementById('user-tier');

    const nextTierVal = document.getElementById('next-tier-value');

    const fill = document.getElementById('loyalty-fill');

    const percentEl = document.getElementById('loyalty-percent');



    if (!tierBadge) return;



    let tier = 'Bronze';

    let nextTier = 'Prata';

    let target = 50;

    let color = '#cd7f32'; // Bronze



    if (totalSpent >= 500) {

        tier = 'VIP';

        nextTier = 'Diamante';

        target = 2000;

        color = '#38bdf8';

    } else if (totalSpent >= 150) {

        tier = 'Ouro';

        nextTier = 'VIP';

        target = 500;

        color = '#fbbf24';

    } else if (totalSpent >= 50) {

        tier = 'Prata';

        nextTier = 'Ouro';

        target = 150;

        color = '#94a3b8';

    }



    const percent = Math.min((totalSpent / target) * 100, 100);

    

    tierBadge.textContent = `Nível ${tier}`;

    tierBadge.style.background = color;

    if (nextTierVal) nextTierVal.textContent = `R$ ${(target - totalSpent).toFixed(2)}`;

    if (fill) fill.style.width = `${percent}%`;

    if (percentEl) percentEl.textContent = `${Math.floor(percent)}%`;

}



function startLiveTicker() {

    const container = document.getElementById('live-ticker-container');

    if (!container) return;



    // Lista expandida com mais de 30 nomes para evitar repetição

    const names = [

        'Ricardo S.', 'Ana Paula', 'Felipe M.', 'Bruna Lima', 'Lucas G.', 'Mariana V.',

        'Gustavo Henrique', 'Carla Souza', 'João Pedro', 'Beatriz Silva', 'Marcos Oliveira',

        'Julia Costa', 'Rodrigo Santos', 'Fernanda M.', 'Thiago A.', 'Larissa N.',

        'Gabriel Barbosa', 'Amanda R.', 'Caio Ferreira', 'Isabela T.', 'Rafael C.',

        'Vanessa J.', 'Daniel P.', 'Sophia L.', 'Matheus K.', 'Letícia G.',

        'Renato B.', 'Patrícia F.', 'Diego M.', 'Camila D.', 'Hugo S.', 'Ellen R.'

    ];



    const services = [

        'seguidores no Instagram', 'curtidas no TikTok', 'visualizações no YouTube',

        'curtidas na foto', 'seguidores na página', 'visualizações nos Stories',

        'comentários brasileiros', 'seguidores no Twitter (X)', 'ouvintes no Spotify',

        'visualizações no Reels', 'membros no Telegram'

    ];



    const actions = ['acabou de comprar', 'adicionou saldo e pediu', 'solicitou', 'recebeu'];



    function generateTicker() {

        const name = names[Math.floor(Math.random() * names.length)];

        const action = actions[Math.floor(Math.random() * actions.length)];

        const service = services[Math.floor(Math.random() * services.length)];

        

        // Quantidades variadas que não terminam em 0 (ex: 1279, 342)

        let amount = Math.floor(Math.random() * 4500) + 127; 

        if (amount % 10 === 0) amount += Math.floor(Math.random() * 9) + 1;



        const ticker = document.createElement('div');

        ticker.className = 'live-ticker';

        ticker.innerHTML = `

            <div class="ticker-icon"><i class="fas fa-check"></i></div>

            <div class="ticker-content">

                <p><strong>${name}</strong> ${action} <strong>${amount.toLocaleString('pt-BR')}</strong> ${service}</p>

                <span>Há poucos segundos</span>

            </div>

        `;

        

        container.appendChild(ticker);

        setTimeout(() => {

            ticker.style.opacity = '0';

            ticker.style.transform = 'translateX(-20px)';

            setTimeout(() => ticker.remove(), 500);

        }, 5000);

    }



    // Início aleatório para não começar sempre igual

    setTimeout(() => {

        generateTicker();

        setInterval(generateTicker, 18000); // Intervalo de 18 segundos

    }, Math.random() * 5000 + 2000);

}



function animateValue(obj, end, duration = 1500) {

    let start = parseFloat(obj.innerText.replace('R$ ', '').replace(',', '.')) || 0;

    let startTimestamp = null;

    const step = (timestamp) => {

        if (!startTimestamp) startTimestamp = timestamp;

        const progress = Math.min((timestamp - startTimestamp) / duration, 1);

        const current = progress * (end - start) + start;

        obj.innerHTML = formatValue(current).replace('R$ ', '');

        if (progress < 1) {

            window.requestAnimationFrame(step);

        }

    };

    window.requestAnimationFrame(step);

}



function showDashTab(tabId, linkEl) {

    document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));

    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));



    const tab = document.getElementById(tabId);

    if (tab) tab.classList.add('active');

    if (linkEl) linkEl.classList.add('active');



    // Persistência

    localStorage.setItem('snx_active_tab', tabId);



    // Close sidebar on mobile

    const sidebar = document.getElementById('sidebar');

    if (window.innerWidth <= 768) {

        sidebar.classList.remove('open');

    }



    // Se abrir suporte, limpa o badge do cliente

    if (tabId === 'dash-support') {

        localStorage.setItem('snx_last_read_tickets', Date.now());

        updateClientNotifBadge();

    }

}



function toggleSidebar() {

    document.getElementById('sidebar').classList.toggle('open');

}



function toggleNotifications() {

    showToast('3 novas atualizações disponíveis', 'info');

}



// ─── Custom UI Dropdowns ───

window.addEventListener('click', function(e) {

    // Close dropdowns if clicked outside

    document.querySelectorAll('.custom-select__trigger').forEach(trigger => {

        if (!trigger.contains(e.target)) {

            trigger.classList.remove('open');

        }

    });

});



function toggleDropdown(id) {

    const trigger = document.getElementById(id + '-trigger');

    

    // Close others

    document.querySelectorAll('.custom-select__trigger').forEach(t => {

        if (t !== trigger) t.classList.remove('open');

    });



    trigger.classList.toggle('open');

}



function selectCategory(actionValue, displayName, icon, color) {

    // Hidden Input stores the actionValue (either FOLDER::Name or CategoryName)

    document.getElementById('order-category').value = actionValue;

    

    // UI Update (Dynamic Icon)

    const displayEl = document.getElementById('cat-selected-text');

    if (!icon || !color) {

        icon = 'fas fa-list'; color = '#a18cd1';

        const low = displayName ? displayName.toLowerCase() : actionValue.toLowerCase();

        if(low.includes('instagram')) { icon='fab fa-instagram'; color='#e1306c'; }

        else if(low.includes('tiktok')) { icon='fab fa-tiktok'; color='#00f2ea'; }

        else if(low.includes('facebook')) { icon='fab fa-facebook'; color='#1877f2'; }

        if(actionValue.startsWith('FOLDER::')) { icon='fas fa-folder-open'; color='#ffd700'; }

    }

    

    const finalName = displayName || actionValue.replace('FOLDER::', '');

    displayEl.innerHTML = `<i class="${icon}" style="color: ${color}"></i> <b>${finalName.charAt(0).toUpperCase() + finalName.slice(1)}</b>`;

    

    // Close Dropdown

    document.getElementById('cat-trigger').classList.remove('open');

    

    // Limpar busca ao trocar categoria

    const searchInput = document.getElementById('svc-search');

    if(searchInput) searchInput.value = '';

    

    // Trigger update services

    updateServices();



    // Reset service hidden input & UI

    document.getElementById('order-service').value = '';

    document.getElementById('svc-selected-text').innerHTML = 'Selecione o serviço';

}



function filterServicesBySearch() {

    const term = document.getElementById('svc-search').value.toLowerCase();

    const category = document.getElementById('order-category').value;

    const services = servicesDB[category] || [];

    

    const svcOptionsContainer = document.getElementById('svc-options');

    svcOptionsContainer.innerHTML = '';

    

    const filtered = services.filter(s => 

        s.name.toLowerCase().includes(term) || 

        s.id.toString().includes(term)

    );

    

    if (filtered.length === 0) {

        svcOptionsContainer.innerHTML = '<div class="custom-option">Nenhum serviço encontrado</div>';

        return;

    }

    

    filtered.forEach(service => {

        if (service.status === 'unavailable') return;

        const optionHTML = `

            <div class="custom-option" onclick='selectService(${JSON.stringify(service).replace(/'/g, "&#39;")})'>

                <i class="fas fa-gem"></i>

                <span>${service.name}</span>

                <span class="svc-price-badge">${formatValue(service.price)}/1K</span>

            </div>

        `;

        svcOptionsContainer.innerHTML += optionHTML;

    });

    

    // Auto-open dropdown to show results if not already open

    document.getElementById('svc-trigger').classList.add('open');

}





// ─── Order Management ───

function updateServices() {

    const rawValue = document.getElementById('order-category').value;

    const svcOptionsContainer = document.getElementById('svc-options');

    svcOptionsContainer.innerHTML = '';

    

    let services = [];

    

    if (rawValue.startsWith('FOLDER::')) {

        const folderName = rawValue.replace('FOLDER::', '');

        const customFolders = JSON.parse(localStorage.getItem('snx_custom_folders') || '{}');

        const internalCats = customFolders[folderName] || [];

        

        internalCats.forEach(cat => {

            if (servicesDB[cat]) {

                services = services.concat(servicesDB[cat]);

            }

        });

    } else {

        services = servicesDB[rawValue] || [];

    }

    

    if (services.length === 0) {

        svcOptionsContainer.innerHTML = '<div class="custom-option">Nenhum serviço disponível</div>';

        updateOrderInfo();

        return;

    }

    

    // Mapeamento de ícones para o dropdown de serviços

    const iconMap = {

        'instagram': '#e1306c', 'tiktok': '#00f2ea', 'youtube': '#ff0000',

        'facebook': '#1877f2', 'twitter': '#1da1f2', 'telegram': '#0088cc',

        'spotify': '#1db954', 'twitch': '#9146ff', 'threads': '#ffffff'

    };

    let dotColor = '#4facfe';

    const lowCat = rawValue.toLowerCase();

    for(let k in iconMap) { if(lowCat.includes(k)) { dotColor = iconMap[k]; break; } }



    services.forEach(service => {

        if (service.status === 'unavailable') return;

        

        // Identificar ícones extras baseados no nome

        let extraIcons = "";

        const lowName = service.name.toLowerCase();

        if(lowName.includes('⭐') || lowName.includes('recomendado')) extraIcons += "⭐ ";

        if(lowName.includes('♻️') || lowName.includes('refill') || lowName.includes('reposi')) extraIcons += "♻️ ";

        if(lowName.includes('⚡') || lowName.includes('rápido') || lowName.includes('fast') || lowName.includes('instante')) extraIcons += "⚡ ";

        if(lowName.includes('📌') || lowName.includes('novo') || lowName.includes('new')) extraIcons += "📌 ";

        if(lowName.includes('⛔') || lowName.includes('cancel')) extraIcons += "⛔ ";

        if(lowName.includes('💧') || lowName.includes('drip')) extraIcons += "💧 ";



        const optionHTML = `

            <div class="custom-option service-option-item" 

                 onclick='selectService(${JSON.stringify(service).replace(/'/g, "&#39;")})'>

                <div class="svc-main-info">

                    <i class="fas fa-circle" style="color: ${dotColor}; font-size: 8px;"></i>

                    <span class="svc-name-text">${extraIcons}${service.name}</span>

                </div>

                <div class="svc-price-wrapper">

                    <span class="svc-price-tag">R$ ${parseFloat(service.price).toFixed(2)}</span>

                </div>

            </div>

        `;

        svcOptionsContainer.innerHTML += optionHTML;

    });



    updateOrderInfo();

}



let activeSelectedServiceInfo = null;



function selectService(serviceObj) {

    // Identificar ícones para o label selecionado

    let extraIcons = "";

    const name = serviceObj.name.toLowerCase();

    if(name.includes('⭐') || name.includes('recomendado')) extraIcons += "⭐ ";

    if(name.includes('♻️') || name.includes('refill') || name.includes('reposi')) extraIcons += "♻️ ";

    if(name.includes('⚡')) extraIcons += "⚡ ";



    document.getElementById('order-service').value = serviceObj.id;

    document.getElementById('svc-selected-text').innerHTML = `<i class="fas fa-gem"></i> ${extraIcons}${serviceObj.name}`;

    document.getElementById('svc-trigger').classList.remove('open');

    

    activeSelectedServiceInfo = serviceObj;

    updateOrderInfo();

}



function renderCategories() {

    const container = document.getElementById('cat-options');

    if (!container) return;

    

    container.innerHTML = '';

    const excluded = JSON.parse(localStorage.getItem('snx_excluded_cats') || '[]');

    const customFolders = JSON.parse(localStorage.getItem('snx_custom_folders') || '{}');

    const folderOrder = JSON.parse(localStorage.getItem('snx_folder_order') || '[]');

    

    const allBaseKeys = Object.keys(servicesDB).filter(k => !excluded.includes(k));

    const catsInFolders = new Set();

    Object.values(customFolders).forEach(arr => arr.forEach(c => catsInFolders.add(c)));

    const avulsas = allBaseKeys.filter(k => !catsInFolders.has(k)).sort();

    

    // Ordenar pastas conforme o order salvo

    let sortedFolders = folderOrder.filter(f => customFolders[f]);

    Object.keys(customFolders).forEach(f => { if(!sortedFolders.includes(f)) sortedFolders.push(f); });



    let finalItemsToRender = sortedFolders.map(f => ({ name: f, isFolder: true }));

    avulsas.forEach(a => finalItemsToRender.push({ name: a, isFolder: false }));



    const iconMap = {

        'instagram': { icon: 'fab fa-instagram', color: '#e1306c' },

        'tiktok': { icon: 'fab fa-tiktok', color: '#00f2ea' },

        'youtube': { icon: 'fab fa-youtube', color: '#ff0000' },

        'facebook': { icon: 'fab fa-facebook', color: '#1877f2' },

        'twitter': { icon: 'fab fa-twitter', color: '#1da1f2' },

        'telegram': { icon: 'fab fa-telegram', color: '#0088cc' },

        'spotify': { icon: 'fab fa-spotify', color: '#1db954' },

        'kwai': { icon: 'fas fa-video', color: '#ff5000' },

        'twitch': { icon: 'fab fa-twitch', color: '#9146ff' },

        'threads': { icon: 'fab fa-threads', color: '#ffffff' },

        'curtidas': { icon: 'fas fa-heart', color: '#ff4b2b' },

        'seguidores': { icon: 'fas fa-user-plus', color: '#4facfe' },

        'visualizações': { icon: 'fas fa-play', color: '#00ff88' },

        'comentários': { icon: 'fas fa-comment', color: '#f093fb' },

        'pasta': { icon: 'fas fa-folder-open', color: '#ffd700' }

    };



    finalItemsToRender.forEach(item => {

        let icon = item.isFolder ? 'fas fa-folder' : 'fas fa-list';

        let color = item.isFolder ? '#ffd700' : '#a18cd1';

        const lowerName = item.name.toLowerCase();

        for (let key in iconMap) { if (lowerName.includes(key)) { icon = iconMap[key].icon; color = iconMap[key].color; break; } }

        

        const div = document.createElement('div');

        div.className = 'custom-option';

        div.style.borderLeft = item.isFolder ? `4px solid ${color}` : `3px solid ${color}`;

        div.innerHTML = `<i class="${icon}" style="color: ${color}"></i> <b>${fixEncoding(item.name.charAt(0).toUpperCase() + item.name.slice(1))}</b>`;

        const actionValue = item.isFolder ? `FOLDER::${item.name}` : item.name;

        div.onclick = () => selectCategory(actionValue, item.name, icon, color);

        container.appendChild(div);

    });

}



function updateOrderInfo() {

    const hint = document.getElementById('quantity-hint');

    const priceK = document.getElementById('price-per-k');

    const detailsPanel = document.getElementById('service-details-panel');



    const selected = activeSelectedServiceInfo;



    if (selected && selected.price) {

        hint.textContent = `Mín: ${selected.min} — Máx: ${Number(selected.max).toLocaleString('pt-BR')}`;

        priceK.textContent = `Preço por 1k: R$ ${parseFloat(selected.price).toFixed(2)}`;

        document.getElementById('order-quantity').min = selected.min;

        document.getElementById('order-quantity').max = selected.max;



        // Show details panel

        if (detailsPanel && selected.desc) {

            const refillBadge = selected.refill === 'SR' || !selected.refill

                ? '<span class="badge-refill badge-no">❌ Sem Reposição</span>' 

                : `<span class="badge-refill badge-yes">🔄 Reposição ${selected.refill}</span>`;

            

            const speedClass = selected.speed === 'Super Rápido' || selected.speed === 'Instantâneo' ? 'badge-fast' : selected.speed === 'Rápido' ? 'badge-medium' : 'badge-slow';

            const qualityClass = selected.quality === 'Premium' ? 'badge-premium' : selected.quality === 'HQ' ? 'badge-hq' : 'badge-mixed';



            // Adicionar animação legal igual upmidias

            detailsPanel.classList.remove('fade-in-up');

            void detailsPanel.offsetWidth; // trigger reflow

            detailsPanel.classList.add('fade-in-up');



            detailsPanel.innerHTML = `

                <div class="service-detail-header">

                    <span class="detail-id">#${selected.id}</span>

                    <span class="detail-category">${selected.category || 'Ativo'}</span>

                </div>

                <p class="detail-desc">${selected.desc}</p>

                <div class="detail-badges">

                    <span class="badge-quality ${qualityClass}">⭐ ${selected.quality || 'Padrão'}</span>

                    <span class="badge-speed ${speedClass}">⚡ ${selected.speed || 'Automático'}</span>

                    ${refillBadge}

                    <span class="badge-time">🕐 ${selected.time || '24h'}</span>

                </div>

                <div class="detail-specs">

                    <div class="spec"><span class="spec-label">Mínimo</span><span class="spec-value">${Number(selected.min).toLocaleString('pt-BR')}</span></div>

                    <div class="spec"><span class="spec-label">Máximo</span><span class="spec-value">${Number(selected.max).toLocaleString('pt-BR')}</span></div>

                    <div class="spec"><span class="spec-label">Preço/1K</span><span class="spec-value">R$ ${parseFloat(selected.price).toFixed(2)}</span></div>

                </div>

            `;

            detailsPanel.style.display = 'block';

        }

    } else {

        hint.textContent = 'Mín: 10 — Máx: 100.000';

        priceK.textContent = 'Preço por 1k: R$ 0,00';

        if (detailsPanel) {

            detailsPanel.style.display = 'none';

            detailsPanel.innerHTML = '';

        }

    }



    calculateTotal();

}



function calculateTotal() {

    const selected = activeSelectedServiceInfo;

    const quantity = parseInt(document.getElementById('order-quantity').value) || 0;

    const totalEl = document.getElementById('order-total');



    if (selected && selected.price && quantity > 0) {

        const total = (parseFloat(selected.price) / 1000) * quantity;

        totalEl.textContent = `R$ ${total.toFixed(2)}`;

    } else {

        totalEl.textContent = 'R$ 0,00';

    }

}



function handleNewOrder(e) {

    e.preventDefault();



    if (!currentUser) {

        showToast('Faça login primeiro!', 'error');

        return;

    }



    const category = document.getElementById('order-category').value;

    const selected = activeSelectedServiceInfo;

    const link = document.getElementById('order-link').value;

    const quantity = parseInt(document.getElementById('order-quantity').value);



    // Revert form reset to custom UI

    const resetFormUI = () => {

        document.getElementById('order-category').value = '';

        document.getElementById('order-service').value = '';

        document.getElementById('cat-selected-text').innerHTML = '<i class="fas fa-list"></i> Selecione a Categoria';

        document.getElementById('svc-selected-text').innerHTML = 'Primeiro selecione a categoria';

        document.getElementById('svc-options').innerHTML = '';

        e.target.reset();

        document.getElementById('order-total').textContent = 'R$ 0,00';

        document.getElementById('price-per-k').textContent = 'Preço por 1k: R$ 0,00';

        document.getElementById('service-details-panel').style.display = 'none';

        const receiptBox = document.getElementById('order-receipt-container');

        if (receiptBox) receiptBox.style.display = 'none';

        activeSelectedServiceInfo = null;

    }



    if (!category || !selected || !link || !quantity) {

        showToast('Preencha todos os campos e selecione um serviço!', 'error');

        return;

    }



    const price = parseFloat(selected.price);

    const total = (price / 1000) * quantity;



    if (currentUser.balance < total) {

        showToast('Saldo insuficiente! Adicione saldo para continuar.', 'warning');

        return;

    }



    // Criar objeto do pedido

    const order = {

        id: 10000 + orders.length + 1,

        serviceId: selected.id, // Precisamos do ID real para a API

        service: selected.name,

        link: link,

        quantity: quantity,

        total: total,

        status: 'pending',

        date: new Date().toISOString(),

        platform: category

    };



    // Executar Automação

    orders.push(order);
    currentUser.balance -= total;
    saveUserData();

    // Enviar ao fornecedor e AGUARDAR resposta antes de salvar o externalId
    AutomationEngine.sendToProvider(order).then(result => {
        if (result.success) {
            order.status = 'processing';
            order.externalId = result.externalId;
            showToast('Pedido #' + order.id + ' enviado ao fornecedor! ID: ' + result.externalId, 'success');
            console.log('[PROVIDER] Pedido #' + order.id + ' vinculado ao ID externo: ' + result.externalId);
        } else {
            order.status = 'pending';
            var errorMsg = result.error || 'Erro de API';
            showToast('Erro ao enviar pedido #' + order.id + ': ' + errorMsg, 'error');
            console.error('[PROVIDER] Falha no Pedido #' + order.id + ':', errorMsg);
        }
        saveUserData();
        loadOrders();
    }).catch(function(err) {
        order.status = 'pending';
        showToast('Falha de conexao com fornecedor: ' + err.message, 'error');
        console.error('[PROVIDER] Erro fatal:', err);
        saveUserData();
        loadOrders();
    });

    document.getElementById('user-balance').textContent = formatValue(currentUser.balance);



    resetFormUI();



    showToast(`Pedido #${order.id} criado com sucesso! 🚀`, 'success');



    // Comprovante Temporário

    const receiptBox = document.getElementById('order-receipt-container');

    if (receiptBox) {

        receiptBox.style.display = 'block';

        receiptBox.innerHTML = `

            <div style="background: rgba(20,20,30,0.8); border: 1px dashed rgba(79, 172, 254, 0.4); border-radius: 10px; padding: 15px; margin-bottom: 20px;">

                <div style="color: #43e97b; font-weight: 800; font-size: 1.1rem; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">

                    <i class="fas fa-check-circle"></i> Pedido recebido

                </div>

                <div style="font-size: 0.85rem; line-height: 1.6; color: #ccc;">

                    <div><b style="color: white;">ID:</b> ${order.id}</div>

                    <div><b style="color: white;">Serviço:</b> ${fixEncoding(selected.name)}</div>

                    <div><b style="color: white;">Link:</b> <a href="${link}" target="_blank" style="color: #4facfe; text-decoration: none;">${link}</a></div>

                    <div><b style="color: white;">Quantidade:</b> ${quantity.toLocaleString('pt-BR')}</div>

                    <div><b style="color: white;">Valor:</b> R$ ${total.toFixed(4)}</div>

                    <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid rgba(255,255,255,0.05); color: #00ff88; font-weight: bold;">

                        <b style="color: white;">Saldo Restante:</b> R$ ${currentUser.balance.toFixed(5)}

                    </div>

                </div>

            </div>

        `;

    }



    // O status do pedido já está classificado como 'processing' via sendToProvider assíncrono.

    // O sync robô checará no backend e atualizará automaticamente.

    loadOrders();

}



function loadOrders(silentUpdate = false) {

    const tbody = document.getElementById('orders-tbody');

    const savedOrders = JSON.parse(localStorage.getItem(`snx_orders_${currentUser?.id}`) || '[]');

    orders = savedOrders;



    if (orders.length === 0) {

        tbody.innerHTML = `

            <tr class="empty-row">

                <td colspan="8">

                    <div class="empty-state">

                        <i class="fas fa-inbox"></i>

                        <p>Nenhum pedido encontrado</p>

                    </div>

                </td>

            </tr>

        `;

        return;

    }



    // Tentar sincronizar status de pedidos pendentes/processando

    if (!silentUpdate) {

        document.querySelectorAll('.btn-sync-status').forEach(b => b.classList.add('fa-spin'));

    }

    

    const ordersToRender = [...orders].reverse();

    tbody.innerHTML = ordersToRender.map(order => {

        // Correção de encoding no histórico

        const serviceName = fixEncoding(order.service);

        

        // Logica para mostrar botão de Refill

        const supportsRefill = checkRefillSupport(serviceName);

        const isCompleted = order.status.toLowerCase() === 'completed';

        

        let refillContent = '';

        if (supportsRefill) {

            if (isCompleted) {

                refillContent = `<button class="btn-refill" onclick="requestOrderRefill(${order.id}, ${order.externalId})"><i class="fas fa-redo"></i> Reposição</button>`;

            } else {

                refillContent = `<span style="color: rgba(255,255,255,0.3); font-size: 0.75rem;">(Aguarda conclusão)</span>`;

            }

        } else {

            refillContent = `<span class="badge-sr">SEM REPOSIÇÃO</span>`;

        }

        

        // Botão para sincronizar manual

        let syncBtn = '';

        if (order.externalId && !['completed', 'cancelled', 'partial', 'canceled'].includes(order.status.toLowerCase())) {

            syncBtn = `<button class="btn-sync" onclick="syncSpecificOrder(${order.id}, ${order.externalId})" title="Sincronizar Status"><i class="fas fa-sync-alt"></i></button>`;

        } else if (!order.externalId) {

            // Caso o pedido tenha sido criado no fornecedor mas não devolveu o ID (Timeout da API), permite linkar manualmente

            syncBtn = `<button class="btn-sync" onclick="linkExternalOrder(${order.id})" title="Vincular ID Manual" style="background:#ff9800; color:white;"><i class="fas fa-link"></i> Ligar ao Fornecedor</button>`;

        }



        // Botão Reorder

        const reorderBtn = `<button class="btn-sync" style="background:#4facfe; color:white; margin-left:5px;" onclick="reorderService(${order.serviceId})" title="Repetir Pedido"><i class="fas fa-play"></i></button>`;



        return `

            <tr>

                <td><strong>#${order.id}</strong></td>

                <td><small>${formatDate(order.date).split(' ')[0]}<br>${formatDate(order.date).split(' ')[1]}</small></td>

                <td style="font-size: 0.8rem; max-width:150px; overflow:hidden; text-overflow:ellipsis;">${serviceName.replace(/INSTANTÂNEOâneo/g, 'INSTANTÂNEO').replace(/INSTANTÂNEO/g, 'INSTANTÂNEO')}</td>

                <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><a href="${order.link}" target="_blank" style="color:#4facfe;">${order.link}</a></td>

                <td><span style="color:#888;">${order.start_count || '--'}</span></td>

                <td>${order.quantity.toLocaleString('pt-BR')}</td>

                <td><span style="color:#00ff88;">${order.remains !== undefined ? order.remains : '--'}</span></td>

                <td>R$ ${order.total.toFixed(2)}</td>

                <td><span class="status-badge status-${(order.status || 'processing').toLowerCase().replace(/\s+/g,'')}">${getStatusLabel(order.status || 'processing')}</span></td>

                <td><div style="display:flex; align-items:center; gap:5px;">${refillContent}${syncBtn}${reorderBtn}</div></td>

            </tr>

            <tr style="display:none; height:0; visibility:hidden;">

                <td colspan="10"></td>

            </tr>

            <tr style="display:none;">
                <td colspan="10"></td>
            </tr>

        `;

    }).join('');



    // Sincronização Automática Silenciosa para todos os pedidos ativos (Processamento/Pendente)

    if (orders.length > 0) {

        orders.forEach(o => {

            const lowSt = o.status.toLowerCase();

            // Só sincroniza se for um status "Em andamento"

            if(o.externalId && !['completed', 'cancelled', 'partial', 'canceled', 'refunded'].includes(lowSt)) {

                syncSpecificOrder(o.id, o.externalId, true);

            }

        });

    }



    updateOverviewStats();

}



async function syncSpecificOrder(orderId, externalId, silent = false) {

    if (!externalId) {

        if (!silent) showToast(`Pedido #${orderId} sem ID externo para sincronizar.`, 'warning');

        return;

    }



    try {

        const data = await AutomationEngine.syncOrderStatus(externalId);

        

        // --- NOVO DIAGNÓSTICO VISUAL ---

        updateSyncDebugLog(`Sincronizando #${orderId} (Ext: ${externalId}): ${data ? (data.status || 'Erro API') : 'Falha'}`);

        // ------------------------------



        if (!silent) console.log(`[SocialNexus Sync] Pedido #${orderId}:`, data);



        if (data && data.status) {

            let needsUpdate = false;

            const normalizedDataStatus = data.status.toLowerCase().trim().replace(/\s+/g, '');

            const order = orders.find(o => o.id === orderId);

            

            if (order) {

                const currentStatusNorm = (order.status || '').toLowerCase().trim().replace(/\s+/g, '');

                

                // Se a API diz "Completed" ou "Concluído", nós forçamos a finalização

                const isFinished = ['completed', 'complete', 'concluido', 'concluído', 'success'].includes(normalizedDataStatus);

                if (isFinished) {

                    order.remains = 0;

                    order.status = 'completed';

                    needsUpdate = true;

                }



                if (currentStatusNorm !== normalizedDataStatus && !isFinished) {

                    console.log(`[SYNC] Mudança de Status do Pedido #${orderId}: ${currentStatusNorm} -> ${normalizedDataStatus}`);

                    // LOGICA DE REEMBOLSO AUTOMÁTICO

                    const isRefundable = ['cancelled', 'canceled', 'refunded', 'partial'].includes(normalizedDataStatus);

                    const wasNotRefunded = !['cancelled', 'canceled', 'refunded', 'partial'].includes(currentStatusNorm);



                    if (isRefundable && wasNotRefunded) {

                        let refundAmount = 0;

                        if (normalizedDataStatus === 'partial' && data.remains > 0) {

                            const unitPrice = order.total / order.quantity;

                            refundAmount = unitPrice * parseInt(data.remains);

                        } else {

                            refundAmount = order.total;

                        }



                        if (refundAmount > 0) {

                            await processAutomaticRefund(order.userId || currentUser?.id, refundAmount, orderId, normalizedDataStatus);

                        }

                    }



                    order.status = normalizedDataStatus;

                    needsUpdate = true;

                }



                if (data.start_count !== undefined && order.start_count != data.start_count) {

                    order.start_count = data.start_count;

                    needsUpdate = true;

                }

                if (data.remains !== undefined && order.remains != data.remains && !isFinished) {

                    order.remains = data.remains;

                    needsUpdate = true;

                }

                

                // Marca que foi sincronizado agora

                order.lastSyncAt = new Date().toISOString(); 

                needsUpdate = true;

            }



            if (needsUpdate) {

                saveUserData();

                loadOrders(true);

                if (!silent) showToast(`Pedido #${orderId} atualizado para: ${getStatusLabel(data.status)}`, 'success');

            } else if (!silent) {

                showToast(`Pedido #${orderId} já está atualizado.`, 'info');

            }

        } else if (data && data.error) {

            if (!silent) showToast(`Erro no Fornecedor (#${orderId}): ${data.error}`, 'error');

        }

    } catch (err) {

        console.error("Sync Error:", err);

        if (!silent) showToast(`Falha na conexão de sincronismo (#${orderId}).`, 'error');

    }

}



async function processAutomaticRefund(userId, amount, orderId, status) {

    try {

        const users = await syncFromFirebase();

        if (!users || users.length === 0) return;



        const userIdx = users.findIndex(u => u.id.toString() === userId.toString());

        if (userIdx === -1) return;



        const targetUser = users[userIdx];

        const oldBalance = parseFloat(targetUser.balance || 0);

        const newBalance = oldBalance + amount;



        targetUser.balance = newBalance;

        

        if (typeof firebase !== 'undefined' && firebase.database) {

            await firebase.database().ref('snx_users').set(users);

            

            if (typeof addSystemAlert === 'function') {

                const alertMsg = `Pedido #${orderId} ${status === 'partial' ? 'parcialmente ' : ''}reembolsado: +R$ ${amount.toFixed(2)} adicionado ao seu saldo.`;

                addSystemAlert(alertMsg, 'info');

            }



            if (currentUser && currentUser.id.toString() === userId.toString()) {

                currentUser.balance = newBalance;

                localStorage.setItem('snx_session', JSON.stringify(currentUser));

                showToast(`Reembolso automático: R$ ${amount.toFixed(2)} devolvidos ao seu saldo! 💸`, 'success');

                const balEl = document.getElementById('user-balance');

                if (balEl) balEl.textContent = `R$ ${newBalance.toFixed(2)}`;

            }

        }

    } catch (e) {

        console.error("Erro no Reembolso Automático:", e);

    }

}



async function requestOrderRefill(orderId, externalId) {

    const btn = event.currentTarget;

    const originalHTML = btn.innerHTML;

    btn.disabled = true;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Solicitando...';

    

    const result = await AutomationEngine.requestRefill(externalId);

    if (result.success) {

        showToast(`Solicitação de reposição #${result.refillId} enviada com sucesso!`, 'success');

        btn.innerHTML = '<i class="fas fa-check"></i> Solicitado';

    } else {

        showToast(`Erro: ${result.error}`, 'error');

        btn.disabled = false;

        btn.innerHTML = originalHTML;

    }

}



function updateOverviewStats() {

    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'Completed');

    const pendingOrders = orders.filter(o => !['completed', 'cancelled', 'Completed', 'Cancelled', 'Canceled'].includes(o.status));

    const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);



    const overviewCards = document.querySelectorAll('.overview-card .ov-value');

    if (overviewCards.length >= 4) {

        overviewCards[0].textContent = `R$ ${formatCurrency(currentUser?.balance || 0)}`;

        overviewCards[1].textContent = completedOrders.length;

        overviewCards[2].textContent = pendingOrders.length;

        overviewCards[3].textContent = `R$ ${totalSpent.toFixed(2)}`;

    }

}

window.linkExternalOrder = function(orderId) {

    const extId = prompt(`A API do Fornecedor não retornou o ID deste pedido.\n\nPor favor, vá no painel do Fornecedor (GrowFollows), veja qual é o número/ID oficial que este pedido gerou lá, e digite-o abaixo para conectá-lo ao painel do cliente:`);

    if (extId && extId.trim() !== '') {

        const order = orders.find(o => o.id === parseInt(orderId));

        if (order) {

            order.externalId = extId.trim();

            saveUserData();

            showToast(`Pedido vinculado ao ID: ${extId}! Sincronizando agora...`, 'info');

            syncSpecificOrder(order.id, order.externalId, false).then(() => {

                loadOrders();

            });

        }

    }

};



function getStatusLabel(status) {

    const s = status.toLowerCase().trim().replace(/\s+/g, '');

    const labels = {

        'pending': 'Pendente',

        'processing': 'Processando',

        'inprogress': 'Processando',

        'completed': 'Concluído',

        'complete': 'Concluído',

        'partial': 'Parcial',

        'cancelled': 'Cancelado',

        'canceled': 'Cancelado',

        'refunded': 'Reembolsado'

    };

    return labels[s] || status;

}



function saveUserData() {

    if (!currentUser) return;

    const storedUsers = JSON.parse(localStorage.getItem('snx_users') || '[]');

    const idx = storedUsers.findIndex(u => u.id === currentUser.id);

    if (idx !== -1) storedUsers[idx] = currentUser;

    localStorage.setItem('snx_users', JSON.stringify(storedUsers));

    localStorage.setItem('snx_session', JSON.stringify(currentUser));

    localStorage.setItem(`snx_orders_${currentUser.id}`, JSON.stringify(orders));

}



function updateSyncDebugLog(msg) {

    let log = document.getElementById('sync-debug-log');

    if (!log) {

        log = document.createElement('div');

        log.id = 'sync-debug-log';

        log.style.cssText = 'position:fixed; bottom:10px; right:10px; background:rgba(0,0,0,0.9); color: #00ff88; padding: 10px; font-size: 0.6rem; font-family: monospace; z-index: 10000; border: 1px solid #444; border-radius: 5px; max-width: 250px; pointer-events: none;';

        document.body.appendChild(log);

    }

    const time = new Date().toLocaleTimeString();

    log.innerHTML = `<div>[${time}] ${msg}</div>` + log.innerHTML.split('</div>').slice(0, 3).join('</div>') + '</div>';

}



// ─── Services List ───

function loadServicesList() {

    const container = document.getElementById('services-list');

    container.innerHTML = '';



    const platformNames = {

        instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube',

        twitter: 'Twitter / X', facebook: 'Facebook', telegram: 'Telegram',

        spotify: 'Spotify', twitch: 'Twitch'

    };

    const platformIcons = {

        instagram: 'fab fa-instagram', tiktok: 'fab fa-tiktok', youtube: 'fab fa-youtube',

        twitter: 'fab fa-twitter', facebook: 'fab fa-facebook', telegram: 'fab fa-telegram',

        spotify: 'fab fa-spotify', twitch: 'fab fa-twitch'

    };



    Object.entries(servicesDB).forEach(([platform, services]) => {

        // Group header

        const groupHeader = document.createElement('div');

        groupHeader.className = 'service-group-header';

        groupHeader.dataset.platform = platform;

        groupHeader.innerHTML = `<i class="${platformIcons[platform] || 'fas fa-globe'}"></i> ${platformNames[platform] || platform}`;

        container.appendChild(groupHeader);



        services.forEach(service => {

            if (service.status === 'unavailable') return;

            const item = document.createElement('div');

            item.className = 'service-row';

            item.dataset.platform = platform;

            item.dataset.name = service.name.toLowerCase();



            const hasRefill = checkRefillSupport(service.name);

            const refillBadge = !hasRefill 

                ? '<span class="refill-badge refill-no"><i class="fas fa-times"></i> SR</span>' 

                : '<span class="refill-badge refill-yes"><i class="fas fa-sync-alt"></i> R30</span>';

            const qualityBadge = service.quality === 'Premium' 

                ? '<span class="quality-badge quality-premium">⭐ Premium</span>' 

                : service.quality === 'HQ' 

                    ? '<span class="quality-badge quality-hq">⭐ HQ</span>' 

                    : '<span class="quality-badge quality-mixed">Mista</span>';



            // Dynamic badges for visual flair

            let tagBadge = '';

            if (service.id % 7 === 0) tagBadge = '<span class="svc-tag tag-hot"><i class="fas fa-fire"></i> HOT</span>';

            else if (service.id % 5 === 0) tagBadge = '<span class="svc-tag tag-new"><i class="fas fa-star"></i> NOVO</span>';



            item.innerHTML = `

                <span class="svc-id">${service.id}</span>

                <span class="svc-name">${service.name} ${tagBadge}</span>

                <span class="svc-price">R$ ${service.price.toFixed(2)}</span>

                <span class="svc-min">${service.min}</span>

                <span class="svc-max">${service.max.toLocaleString('pt-BR')}</span>

                <span class="svc-time">${service.time}</span>

                <span class="svc-refill">${refillBadge}</span>

                <button class="btn-svc-order" onclick="quickOrder('${platform}', ${service.id})" title="Fazer Pedido">Pedir</button>

            `;



            // Expandable details on click

            item.addEventListener('click', function(e) {

                if (e.target.tagName === 'BUTTON') return;

                const existing = this.querySelector('.svc-expand');

                if (existing) { existing.remove(); return; }

                // Remove all other expansions

                document.querySelectorAll('.svc-expand').forEach(el => el.remove());

                const expand = document.createElement('div');

                expand.className = 'svc-expand';

                expand.innerHTML = `

                    <p>${service.desc}</p>

                    <div class="svc-expand-badges">

                        ${qualityBadge}

                        <span class="speed-badge">⚡ ${service.speed}</span>

                        ${refillBadge}

                        <span class="time-badge">🕐 ${service.time}</span>

                    </div>

                `;

                this.appendChild(expand);

            });



            container.appendChild(item);

        });

    });

}



function filterServices() {

    const searchTerm = document.getElementById('search-services').value.toLowerCase();

    const platform = document.getElementById('filter-platform').value;

    const items = document.querySelectorAll('.service-row');

    const headers = document.querySelectorAll('.service-group-header');



    // Track which platforms have visible items

    const visiblePlatforms = new Set();



    items.forEach(item => {

        const matchPlatform = platform === 'all' || item.dataset.platform === platform;

        const matchSearch = !searchTerm || item.dataset.name.includes(searchTerm);

        const visible = matchPlatform && matchSearch;

        item.style.display = visible ? '' : 'none';

        if (visible) visiblePlatforms.add(item.dataset.platform);

    });



    // Show/hide group headers

    headers.forEach(header => {

        header.style.display = visiblePlatforms.has(header.dataset.platform) ? '' : 'none';

    });

}



function quickOrder(platform, serviceId) {

    showDashTab('dash-neworder', document.getElementById('sidebar-neworder'));

    document.getElementById('order-category').value = platform;

    updateServices();

    setTimeout(() => {

        document.getElementById('order-service').value = serviceId;

        updateOrderInfo();

    }, 100);

}



// ——— Unified Payment Hub Logic ———

function switchPayMethod(method) {

    // Buttons

    document.querySelectorAll('.pay-method').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`pay-btn-${method}`).classList.add('active');

    

    // Areas

    document.querySelectorAll('.pay-area').forEach(area => area.classList.remove('active'));

    document.getElementById(`pay-area-${method}`).classList.add('active');

    

    // Mostra área de teste para o Ronald

    const adminArea = document.getElementById('admin-test-area');

    if (adminArea) {

        const userEmail = (currentUser && currentUser.email) ? currentUser.email.toLowerCase() : "";

        if (userEmail.includes('ronald')) {

            adminArea.style.display = 'block';

        } else {

            adminArea.style.display = 'none';

        }

    }

}



function setAmount(type, val) {

    const input = document.getElementById(`${type}-amount`);

    if (input) input.value = val;

}



function updateCryptoAddress() {

    const currency = document.getElementById('crypto-currency').value;

    const addrEl = document.getElementById('crypto-address');

    

    const wallets = {

        'btc': 'sua_carteira_bitcoin_aqui',

        'usdt': 'sua_carteira_usdt_trc20_aqui',

        'eth': 'sua_carteira_ethereum_aqui'

    };

    

    addrEl.textContent = wallets[currency] || 'Selecione uma moeda...';

}



function copyCrypto() {

    const addr = document.getElementById('crypto-address').textContent;

    if (addr.includes('Selecione')) return;

    navigator.clipboard.writeText(addr);

    showToast('Endereço copiado!', 'success');

}



async function generatePixPayment() {

    let amountStr = document.getElementById('pix-amount').value.replace(/\./g, '').replace(',', '.');

    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount < 5) return showToast('Mínimo R$ 5,00 para depósito via Pix', 'error');



    const cpf = document.getElementById('pix-cpf') ? document.getElementById('pix-cpf').value.replace(/\D/g, '') : '';

    if (!cpf || cpf.length < 11) return showToast('Informe seu CPF (11 dígitos) para gerar o Pix!', 'error');



    const btn = document.querySelector('#pay-area-pix .btn-submit');

    const originalText = btn.innerHTML;

    

    btn.disabled = true;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Integrando com Gateway...';



    // ⏱️ TIMER DE SEGURANÇA (20 segundos para gateways externos)

    const timeoutMsg = setTimeout(() => {

        btn.disabled = false;

        btn.innerHTML = originalText;

        showToast('Gateway demorou a responder. Tente novamente!', 'warning');

    }, 20000);



    try {

        const response = await fetch('/.netlify/functions/asaas-api', {

            method: 'POST',

            body: JSON.stringify({

                action: 'generate_pix',

                amount: amount,

                userId: currentUser.id,

                userName: currentUser.name,

                userEmail: currentUser.email,

                cpf: cpf

            })

        });



        clearTimeout(timeoutMsg);

        const result = await response.json();

        

        if (result.success) {

            renderPixResult(result);

        } else {

            showToast('Erro: ' + (result.error || 'Configure sua Chave Asaas no Admin!'), 'error');

            btn.disabled = false;

            btn.innerHTML = originalText;

        }

    } catch (err) {

        clearTimeout(timeoutMsg);

        console.error("Payment API Error:", err);

        showToast('Erro de comunicação. Verifique sua Chave no Admin.', 'error');

        btn.disabled = false;

        btn.innerHTML = originalText;

    }

}



// 🎨 Renderiza o QR Code na Tela

function renderPixResult(data) {

    const container = document.getElementById('pix-qr-container');

    const imgElement = document.getElementById('pix-qr-img');

    const payloadInput = document.getElementById('pix-payload');

    const btnSubmit = document.querySelector('#pay-area-pix .btn-submit');



    const imageSource = data.image || data.encodedImage;

    const payloadSource = data.payload || data.pixCopyPaste;



    if (!imageSource || !payloadSource) {

        showToast('Erro: Recebemos o pagamento, mas o QR Code falhou. Tente novamente!', 'error');

        if (btnSubmit) {

            btnSubmit.disabled = false;

            btnSubmit.innerHTML = '<i class="fas fa-check"></i> Gerar QR Code';

        }

        return;

    }



    if (container && imgElement && payloadInput) {

        // O Asaas manda a imagem em base64, precisamos garantir o prefixo

        const qrBase64 = imageSource.startsWith('data:') ? imageSource : `data:image/png;base64,${imageSource}`;

        

        imgElement.src = qrBase64;

        payloadInput.value = payloadSource;

        

        // Exibe o container com animação suave

        container.style.display = 'block';

        container.scrollIntoView({ behavior: 'smooth' });

        

        // Restaura o botão original

        btnSubmit.disabled = false;

        btnSubmit.innerHTML = '<i class="fas fa-sync"></i> Gerar Novo QR Code';

        

        showToast('QR Code gerado com sucesso!', 'success');

    }

}



// 📋 Copia o código Pix

function copyPixPayload() {

    const input = document.getElementById('pix-payload');

    if (input) {

        input.select();

        input.setSelectionRange(0, 99999);

        navigator.clipboard.writeText(input.value);

        showToast('Código Pix copiado!', 'success');

    }

}



async function processCardPayment() {

    const amountStr = document.getElementById('card-amount').value.replace(/\./g, '').replace(',', '.');

    const amount = parseFloat(amountStr);

    const number = document.getElementById('card-number').value.replace(/\s/g, '');

    const name = document.getElementById('card-name').value;

    const expiry = document.getElementById('card-expiry').value;

    const cvv = document.getElementById('card-cvv').value;

    const cpf = document.getElementById('card-cpf') ? document.getElementById('card-cpf').value.replace(/\D/g, '') : '';



    if (isNaN(amount) || amount < 5) return showToast('Mínimo R$ 5,00 para cartão', 'error');

    if (number.length < 16) return showToast('Número de cartão inválido', 'error');

    if (name.length < 5) return showToast('Digite o nome impresso no cartão', 'error');

    if (!expiry.includes('/')) return showToast('Validade inválida (MM/AA)', 'error');

    if (cvv.length < 3) return showToast('CVV inválido', 'error');

    if (!cpf || cpf.length < 11) return showToast('Informe seu CPF (11 dígitos) para pagar com cartão!', 'error');



    const btn = document.querySelector('#pay-area-card .btn-submit');

    const originalText = btn.innerHTML;

    

    btn.disabled = true;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando Cartão...';



    try {

        const response = await fetch('/.netlify/functions/asaas-api', {

            method: 'POST',

            body: JSON.stringify({

                action: 'generate_card',

                amount: amount,

                userId: currentUser.id,

                userName: currentUser.name,

                userEmail: currentUser.email,

                cpf: cpf,

                cardData: { number, name, expiry, cvv }

            })

        });



        const result = await response.json();

        

        if (result.success) {

            showToast('Pagamento processado! Seu saldo será atualizado em instantes.', 'success');

            showPage('dashboard-page');

            loadDashboard();

        } else {

            showToast('Erro: ' + (result.error || 'Cartão Recusado ou Inválido'), 'error');

        }

    } catch (err) {

        console.error("Card Payment Error:", err);

        showToast('Erro ao processar cartão. Tente Pix!', 'error');

    } finally {

        btn.disabled = false;

        btn.innerHTML = originalText;

    }

}



// Inicializar Máscaras de Cartão

function initCardMasks() {

    const numInput = document.getElementById('card-number');

    const expInput = document.getElementById('card-expiry');

    const brandIcon = document.getElementById('card-brand-icon');



    if (numInput) {

        numInput.addEventListener('input', (e) => {

            let value = e.target.value.replace(/\D/g, '');

            // Formatar 0000 0000 0000 0000

            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');

            e.target.value = value;



            // Detectar Bandeira (Simplificado)

            if (value.startsWith('4')) {

                brandIcon.className = 'fab fa-cc-visa';

                brandIcon.style.color = '#1a1f71';

            } else if (value.startsWith('5')) {

                brandIcon.className = 'fab fa-cc-mastercard';

                brandIcon.style.color = '#eb001b';

            } else {

                brandIcon.className = 'fas fa-credit-card';

                brandIcon.style.color = 'inherit';

            }

        });

    }



    if (expInput) {

        expInput.addEventListener('input', (e) => {

            let value = e.target.value.replace(/\D/g, '');

            if (value.length > 2) {

                value = value.substring(0, 2) + '/' + value.substring(2, 4);

            }

            e.target.value = value;

        });

    }

}



function confirmCryptoPayment() {

    showToast('Notificamos nossa equipe. Aguarde a confirmação na rede.', 'success');

}

// ——— Unified Payment Hub Logic End ———



// ─── API Functions ───

function copyApiKey() {

    const key = document.getElementById('api-key-value').textContent;

    navigator.clipboard.writeText(key).then(() => {

        showToast('Chave API copiada!', 'success');

    });

}



function regenerateApiKey() {

    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let key = 'sn_live_';

    for (let i = 0; i < 32; i++) {

        key += chars.charAt(Math.floor(Math.random() * chars.length));

    }

    document.getElementById('api-key-value').textContent = key;

    showToast('Nova chave API gerada!', 'success');

}



// ─── Support ───

function handleTicket(e) {

    e.preventDefault();

    if (!currentUser) return showToast('Faça login primeiro!', 'error');



    const subject = document.getElementById('ticket-subject').value;

    const subjectMap = {

        'order': 'Problema com Pedido', 'payment': 'Pagamento', 'refund': 'Reembolso', 'api': 'API', 'other': 'Outro'

    };

    const orderId = document.getElementById('ticket-order-id').value;

    const message = document.getElementById('ticket-message').value;



    const ticket = {

        id: 'TKT-' + Math.floor(1000 + Math.random() * 9000),

        userId: currentUser.id,

        userName: currentUser.name || currentUser.username || currentUser.email,

        subject: subjectMap[subject] || subject,

        orderId: orderId || 'N/A',

        message: message,

        date: new Date().toISOString(),

        status: 'open'

    };



    let tickets = JSON.parse(localStorage.getItem('snx_tickets') || '[]');

    tickets.push(ticket);

    localStorage.setItem('snx_tickets', JSON.stringify(tickets));



    // SYNC TO FIREBASE Se implementado

    if (typeof firebase !== 'undefined' && firebase.database) {

        const dbRef = firebase.database().ref('snx_tickets');

        dbRef.set(tickets);

    }



    showToast('Ticket enviado com sucesso! Responderemos em até 24h.', 'success');

    e.target.reset();



    // Tentar atualizar admin badge em tempo real

    if(typeof updateNotifBadge === 'function') updateNotifBadge();

    loadClientTickets(); // Recarrega a lista do cliente

}



// ─── Utility Functions ───

function formatDisplayName(name) {

    if (!name) return 'Usuário';

    

    // Se for e-mail, pega a parte antes do @

    let cleanName = name.split('@')[0];

    

    // Limpa pontos ou underlines comuns em emails/usernames para espaços

    cleanName = cleanName.replace(/[._]/g, ' '); 

    

    // Divide em partes e seleciona apenas os dois primeiros nomes

    const nameParts = cleanName.trim().split(/\s+/);

    if (nameParts.length >= 2) {

        // Retorna Primeiro + Segundo Nome com a primeira letra maiúscula

        return nameParts.slice(0, 2).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');

    }

    

    // Se for apenas um nome, retorna ele com a primeira letra maiúscula

    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();

}



function formatCurrency(value) {

    return parseFloat(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

}



function formatDate(dateStr) {

    const date = new Date(dateStr);

    if (isNaN(date)) return "Data Inválida";

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + 

           date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

}



// ─── Animated Counter ───

function animateCounters() {

    const counters = document.querySelectorAll('.stat-big-number');

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                const el = entry.target;

                const target = parseFloat(el.dataset.target);

                const isDecimal = target % 1 !== 0;

                const duration = 2000;

                const startTime = performance.now();



                function update(currentTime) {

                    const elapsed = currentTime - startTime;

                    const progress = Math.min(elapsed / duration, 1);

                    const eased = 1 - Math.pow(1 - progress, 3);

                    const current = eased * target;



                    if (isDecimal) {

                        el.textContent = current.toFixed(1);

                    } else if (target >= 1000) {

                        el.textContent = Math.floor(current).toLocaleString('pt-BR');

                    } else {

                        el.textContent = Math.floor(current);

                    }



                    if (progress < 1) {

                        requestAnimationFrame(update);

                    }

                }



                requestAnimationFrame(update);

                observer.unobserve(el);

            }

        });

    }, { threshold: 0.5 });



    counters.forEach(counter => observer.observe(counter));

}



// ─── Scroll Animations ───

function initScrollAnimations() {

    const elements = document.querySelectorAll('.feature-card, .service-card, .pricing-card, .stat-card, .faq-item');

    

    const observer = new IntersectionObserver((entries) => {

        entries.forEach((entry, index) => {

            if (entry.isIntersecting) {

                setTimeout(() => {

                    entry.target.style.opacity = '1';

                    entry.target.style.transform = 'translateY(0)';

                }, index * 80);

                observer.unobserve(entry.target);

            }

        });

    }, { threshold: 0.1 });



    elements.forEach(el => {

        el.style.opacity = '0';

        el.style.transform = 'translateY(20px)';

        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

        observer.observe(el);

    });

}



// ─── Smooth Scroll for Anchor Links ───

document.querySelectorAll('a[href^="#"]').forEach(anchor => {

    anchor.addEventListener('click', function (e) {

        const target = document.querySelector(this.getAttribute('href'));

        if (target) {

            e.preventDefault();

            target.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Close mobile menu

            document.getElementById('nav-links')?.classList.remove('active');

        }

    });

});



// ─── Initialize ───

/**

 * Integração dinâmica com WhatsApp configurado pelo Admin

 */

function openWhatsApp() {

    const customName = document.getElementById('panel-name-config')?.value || 'SocialNexus';

    const whatsappInput = document.getElementById('whatsapp-config')?.value;

    const number = whatsappInput || '5500000000000'; // Fallback

    

    const text = encodeURIComponent(`Olá! Vim pelo site ${customName} e preciso de suporte.`);

    window.open(`https://wa.me/${number}?text=${text}`, '_blank');

}



// Filter by status

    const filterStatus = document.getElementById('filter-status');

    if (filterStatus) {

        filterStatus.addEventListener('change', () => {

            const status = filterStatus.value;

            const rows = document.querySelectorAll('#orders-tbody tr:not(.empty-row)');

            rows.forEach(row => {

                if (status === 'all') {

                    row.style.display = '';

                } else {

                    const badge = row.querySelector('.status-badge');

                    const rowStatus = badge?.className.includes(status);

                    row.style.display = rowStatus ? '' : 'none';

                }

            });

        });

    }



// ============================================

//  ADMIN PANEL LOGIC

// ============================================



// Admin credentials (stored in localStorage)

function getAdminCredentials() {

    const defaults = {

        email: "admin@socialnexus.com",

        password: "admin123",

        asaasKey: "",

        asaasEnv: "production",

        smmKey: "",

        dollarRate: "5.50",

        panelName: "SocialNexus",

        whatsapp: "5592991054215"

    };

    const stored = JSON.parse(localStorage.getItem('snx_admin') || "{}");

    const combined = { ...defaults, ...stored };

    

    // Se a chave salva estiver vazia, força o uso da chave padrão do SNX_CONFIG

    if (!combined.asaasKey) combined.asaasKey = defaults.asaasKey;

    if (!combined.whatsapp) combined.whatsapp = defaults.whatsapp;

    

    return combined;

}



/**

 * 🛠️ Carregamento Seguro de Configurações

 */

function loadAdminSettings() {

    try {

        console.log("🛠️ Tentando carregar Central de Comando...");

        const creds = getAdminCredentials();

        const fields = {

            'admin-email-config': creds.email,

            'admin-pass-config': creds.password,

            'asaas-key-config': creds.asaasKey,

            'asaas-env-config': creds.asaasEnv,

            'smm-key-config': creds.smmKey,

            'dollar-rate-config': creds.dollarRate,

            'panel-name-config': creds.panelName,

            'whatsapp-config': creds.whatsapp

        };



        for (const [id, value] of Object.entries(fields)) {

            const el = document.getElementById(id);

            if (el) {

                el.value = value || '';

                // Força visibilidade se necessário

                el.style.opacity = "1";

            }

        }

        console.log("✅ Configurações carregadas com sucesso.");

    } catch (err) {

        console.error("❌ Erro fatal ao carregar configurações:", err);

    }

}



/**

 * 🪙 Formatação Automática de Valor (Ex: 1 -> 1,00)

 */

function formatDepositValue(input) {

    let val = input.value.replace(',', '.');

    if (!val || isNaN(val)) return;

    

    let num = parseFloat(val);

    input.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

}



function saveAdminSettings() {

    try {

        const email = document.getElementById('admin-email-config').value;

        const password = document.getElementById('admin-pass-config').value;

        const asaasKey = document.getElementById('asaas-key-config').value;

        const asaasEnv = document.getElementById('asaas-env-config').value;

        const smmKey = document.getElementById('smm-key-config').value;

        const dollarRate = document.getElementById('dollar-rate-config').value;

        const panelName = document.getElementById('panel-name-config').value;

        const whatsapp = document.getElementById('whatsapp-config').value;



        if (!email || !password) {

            showToast('Preencha pelo menos email e senha!', 'error');

            return;

        }



        const setts = { email, password, asaasKey, asaasEnv, smmKey, dollarRate, panelName, whatsapp };

        localStorage.setItem('snx_admin', JSON.stringify(setts));

        

        // 🚀 SINCRONIZAR COM FIREBASE (Para os clientes poderem pagar)

        if (typeof syncConfigToFirebase === 'function') {

            syncConfigToFirebase(setts);

        }



        // Atualiza logo do painel

        const brandLabels = document.querySelectorAll('.logo-text');

        brandLabels.forEach(el => el.innerHTML = `${panelName}<span class="logo-accent">Panel</span>`);

        

        showToast('Configurações salvas e sincronizadas!', 'success');

    } catch (err) {

        console.error("❌ Erro ao salvar configurações:", err);

        showToast('Erro técnico ao salvar.', 'error');

    }

}







// Admin Dashboard

function loadAdminDashboard() {

    const users = JSON.parse(localStorage.getItem('snx_users') || '[]');

    let allOrders = [];

    let totalRevenue = 0;

    let totalClientBalance = 0;

    let todayRevenue = 0;

    const today = new Date().toDateString();



    users.forEach(user => {

        totalClientBalance += (user.balance || 0);

        const userOrders = JSON.parse(localStorage.getItem(`snx_orders_${user.id}`) || '[]');

        userOrders.forEach(order => {

            order.clientName = user.name;

            order.clientEmail = user.email;

            allOrders.push(order);

            totalRevenue += order.total;

            if (new Date(order.date).toDateString() === today) {

                todayRevenue += order.total;

            }

        });

    });



    // Count by status

    const completed = allOrders.filter(o => o.status === 'completed').length;

    const processing = allOrders.filter(o => o.status === 'processing').length;

    const pending = allOrders.filter(o => o.status === 'pending').length;

    const cancelled = allOrders.filter(o => o.status === 'cancelled').length;

    const newToday = users.filter(u => new Date(u.joined).toDateString() === today).length;



    // Update dashboard cards

    document.getElementById('admin-total-revenue').textContent = `R$ ${formatCurrency(totalRevenue)}`;

    document.getElementById('admin-total-clients').textContent = users.length;

    document.getElementById('admin-total-orders').textContent = allOrders.length;

    document.getElementById('admin-today-revenue').textContent = `R$ ${formatCurrency(todayRevenue)}`;



    // Profit calculation

    let totalCost = 0;

    allOrders.forEach(order => {

        // Try to find the cost from db based on service name or id

        // This is a simulation since we don't store cost in the order object yet

        // In a real app, cost would be locked at order time

        const platformSvc = Object.values(servicesDB).flat().find(s => s.id === order.serviceId);

        const unitCost = platformSvc ? platformSvc.cost : (order.total * 0.5); // Fallback to 50%

        totalCost += (unitCost * (order.quantity / 1000));

    });



    const netProfit = totalRevenue - totalCost;

    const avgProfit = allOrders.length > 0 ? netProfit / allOrders.length : 0;



    document.getElementById('admin-total-cost').textContent = formatValue(totalCost);

    document.getElementById('admin-net-profit').textContent = formatValue(netProfit);

    document.getElementById('admin-avg-profit').textContent = formatValue(avgProfit);



    // Quick stats

    document.getElementById('admin-completed').textContent = completed;

    document.getElementById('admin-processing').textContent = processing;

    document.getElementById('admin-pending').textContent = pending;

    document.getElementById('admin-cancelled').textContent = cancelled;

    document.getElementById('admin-client-balance').textContent = formatValue(totalClientBalance);

    document.getElementById('admin-new-today').textContent = newToday;



    // Revenue tab

    document.getElementById('rev-today').textContent = formatValue(todayRevenue);

    document.getElementById('rev-week').textContent = formatValue(totalRevenue * 0.3);

    document.getElementById('rev-month').textContent = formatValue(totalRevenue * 0.7);

    document.getElementById('rev-total').textContent = formatValue(totalRevenue);



    // Load clients table

    loadAdminClients();

    loadAdminOrders();

    loadAdminTransactions();

}



// Admin Tab Navigation

function showAdminTab(tabId, linkEl) {

    // Only target tabs inside admin-page

    const adminPage = document.getElementById('admin-page');

    adminPage.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));

    adminPage.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));



    const tab = document.getElementById(tabId);

    if (tab) tab.classList.add('active');

    if (linkEl) linkEl.classList.add('active');



    // Refresh data based on tab

    if (tabId === 'admin-dashboard') loadAdminDashboard();

    if (tabId === 'admin-settings') loadAdminSettings();

    if (tabId === 'admin-services-mgmt') {

        loadAdminServicesMgmt();

        loadAdminCategoryFolders();

    }

    if (tabId === 'admin-revenue') loadAdminDashboard(); // Fits revenue too

    if (tabId === 'admin-tickets') loadAdminTicketsTab();



    // Close sidebar on mobile

    const sidebar = document.getElementById('admin-sidebar');

    if (window.innerWidth <= 768) {

        sidebar.classList.remove('open');

    }

}





function toggleAdminSidebar() {

    document.getElementById('admin-sidebar').classList.toggle('open');

}



// Load Clients

function loadAdminClients() {

    const users = JSON.parse(localStorage.getItem('snx_users') || '[]');

    const tbody = document.getElementById('admin-clients-tbody');



    if (users.length === 0) {

        tbody.innerHTML = `

            <tr class="empty-row">

                <td colspan="9">

                    <div class="empty-state">

                        <i class="fas fa-users"></i>

                        <p>Nenhum cliente cadastrado</p>

                    </div>

                </td>

            </tr>

        `;

        return;

    }



    tbody.innerHTML = users.map(user => {

        const userOrders = JSON.parse(localStorage.getItem(`snx_orders_${user.id}`) || '[]');

        const maskedPass = '••••••••';

        return `

            <tr data-search="${(user.name + user.email + user.username).toLowerCase()}" style="cursor: pointer;" onclick="if(!event.target.closest('button') && !event.target.closest('.password-cell')){ viewClientInfo(${user.id}); }">

                <td><strong>${user.id}</strong></td>

                <td>${user.name || '-'}</td>

                <td>${user.email}</td>

                <td>

                    <div class="password-cell">

                        <span class="pass-text" data-pass="${user.password}">${maskedPass}</span>

                        <button class="btn-reveal" onclick="toggleClientPass(this)" title="Mostrar/Ocultar">

                            <i class="fas fa-eye"></i>

                        </button>

                    </div>

                </td>

                <td>${user.whatsapp || '-'}</td>

                <td style="color: var(--success); font-weight: 600;">${formatValue(user.balance || 0)}</td>

                <td>${userOrders.length}</td>

                <td>${formatDate(user.joined)}</td>

                <td>

                    <div class="client-actions">

                        <button class="btn-action success" onclick="addClientBalance(${user.id})" title="Adicionar Saldo">

                            <i class="fas fa-plus"></i>

                        </button>

                        <button class="btn-action" onclick="editClientBalance(${user.id})" title="Editar Saldo">

                            <i class="fas fa-edit"></i>

                        </button>

                        <button class="btn-action danger" onclick="deleteClient(${user.id})" title="Excluir">

                            <i class="fas fa-trash"></i>

                        </button>

                    </div>

                </td>

            </tr>

        `;

    }).join('');

}



// Visualizar detalhes abertos do cliente no Modal

function viewClientInfo(userId) {

    const users = JSON.parse(localStorage.getItem('snx_users') || '[]');

    const user = users.find(u => u.id === userId);

    if (!user) return;



    document.getElementById('modal-client-name').textContent = user.name || 'Não informado';

    document.getElementById('modal-client-email').textContent = user.email;

    document.getElementById('modal-client-login').textContent = user.lastLogin ? formatDate(user.lastLogin) : formatDate(user.joined);

    document.getElementById('modal-client-balance').textContent = `R$ ${formatCurrency(user.balance || 0)}`;



    const userOrders = JSON.parse(localStorage.getItem(`snx_orders_${user.id}`) || '[]');

    const tbody = document.getElementById('modal-client-orders');

    

    if (userOrders.length === 0) {

        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#888;">Nenhum pedido realizado.</td></tr>';

    } else {

        // Ordena do mais recente para o mais antigo

        userOrders.sort((a,b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = userOrders.map(o => `

            <tr>

                <td style="font-size:0.8rem;">${formatDate(o.date)}</td>

                <td>#${o.id}</td>

                <td style="font-size:0.8rem;">${fixEncoding(o.service)}</td>

                <td>${Number(o.quantity).toLocaleString('pt-BR')}</td>

                <td>R$ ${parseFloat(o.total || 0).toFixed(4)}</td>

                <td><span class="status-badge status-${o.status.toLowerCase()}" style="font-size:0.7rem;">${getStatusLabel(o.status)}</span></td>

            </tr>

        `).join('');

    }



    document.getElementById('client-details-modal').style.display = 'flex';

}





// Toggle password visibility in client table

function toggleClientPass(btn) {

    const passText = btn.parentElement.querySelector('.pass-text');

    const icon = btn.querySelector('i');

    const realPass = passText.dataset.pass;



    if (passText.textContent === '••••••••') {

        passText.textContent = realPass;

        icon.classList.replace('fa-eye', 'fa-eye-slash');

    } else {

        passText.textContent = '••••••••';

        icon.classList.replace('fa-eye-slash', 'fa-eye');

    }

}



// Client balance management

function addClientBalance(userId) {

    const amount = prompt('Quanto deseja adicionar ao saldo? (R$)');

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return;



    const users = JSON.parse(localStorage.getItem('snx_users') || '[]');

    const user = users.find(u => u.id === userId);

    if (user) {

        user.balance = (user.balance || 0) + parseFloat(amount);

        localStorage.setItem('snx_users', JSON.stringify(users));

        

        // 📡 SINCRONIZA COM CLOUD

        if (typeof syncToFirebase === 'function') syncToFirebase(users);



        // Save transaction

        saveTransaction(user.name, 'Adição de Saldo', parseFloat(amount), 'Admin');



        loadAdminDashboard();

        showToast(`${formatValue(parseFloat(amount))} adicionados ao saldo de ${user.name}`, 'success');

    }

}



function editClientBalance(userId) {

    const users = JSON.parse(localStorage.getItem('snx_users') || '[]');

    const user = users.find(u => u.id === userId);

    if (!user) return;



    const newBalance = prompt(`Saldo atual: ${formatValue(user.balance || 0)}\nDigite o novo saldo:`);

    if (newBalance === null || isNaN(newBalance)) return;



    user.balance = parseFloat(newBalance);

    localStorage.setItem('snx_users', JSON.stringify(users));

    

    // 📡 SINCRONIZA COM CLOUD

    if (typeof syncToFirebase === 'function') syncToFirebase(users);



    loadAdminDashboard();

    showToast(`Saldo de ${user.name} atualizado para ${formatValue(user.balance)}`, 'success');

}



function deleteClient(userId) {

    if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) return;



    let users = JSON.parse(localStorage.getItem('snx_users') || '[]');

    const user = users.find(u => u.id === userId);

    users = users.filter(u => u.id !== userId);

    localStorage.setItem('snx_users', JSON.stringify(users));

    localStorage.removeItem(`snx_orders_${userId}`);



    loadAdminDashboard();

    showToast(`Cliente ${user?.name || ''} excluído`, 'info');

}



// Filter admin clients

function filterAdminClients() {

    const term = document.getElementById('admin-search-clients').value.toLowerCase();

    const rows = document.querySelectorAll('#admin-clients-tbody tr:not(.empty-row)');

    rows.forEach(row => {

        const searchData = row.dataset.search || row.textContent.toLowerCase();

        row.style.display = searchData.includes(term) ? '' : 'none';

    });

}



// Load All Orders (Admin)

function loadAdminOrders() {

    const users = JSON.parse(localStorage.getItem('snx_users') || '[]');

    const tbody = document.getElementById('admin-orders-tbody');

    let allOrders = [];



    users.forEach(user => {

        const userOrders = JSON.parse(localStorage.getItem(`snx_orders_${user.id}`) || '[]');

        userOrders.forEach(order => {

            order.clientName = user.name;

            order.clientId = user.id;

            allOrders.push(order);

        });

    });



    if (allOrders.length === 0) {

        tbody.innerHTML = `

            <tr class="empty-row">

                <td colspan="9">

                    <div class="empty-state">

                        <i class="fas fa-inbox"></i>

                        <p>Nenhum pedido encontrado</p>

                    </div>

                </td>

            </tr>

        `;

        return;

    }



    // Sort by date, latest first

    allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));



    tbody.innerHTML = allOrders.map(order => {

        const syncBtn = order.externalId && !['completed', 'cancelled', 'Completed', 'Cancelled', 'Canceled'].includes(order.status)

            ? `<button class="btn-sync" onclick="syncAdminOrder(${order.clientId}, ${order.id}, ${order.externalId})" title="Sincronizar com GrowFollows"><i class="fas fa-sync-alt"></i></button>`

            : '';



        return `

            <tr data-search="${(order.clientName + order.service + order.id).toLowerCase()}" data-status="${order.status}">

                <td><strong>#${order.id}</strong></td>

                <td>${order.clientName}</td>

                <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${order.service}</td>

                <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${order.link}</td>

                <td>${order.quantity?.toLocaleString('pt-BR') || '-'}</td>

                <td>${formatValue(order.total || 0)}</td>

                <td><span class="status-badge status-${order.status.toLowerCase()}">${getStatusLabel(order.status)}</span> ${syncBtn}</td>

                <td>${formatDate(order.date)}</td>

                <td class="order-actions-cell">

                    <div style="display: flex; gap: 5px;">

                        <button class="btn-action success" onclick="changeOrderStatus(${order.clientId}, ${order.id}, 'completed')" title="Concluir">

                            <i class="fas fa-check"></i>

                        </button>

                        <button class="btn-action danger" onclick="adminRefundOrder(${order.id})" title="Reembolsar Cliente">

                            <i class="fas fa-undo"></i>

                        </button>

                        <button class="btn-action" onclick="changeOrderStatus(${order.clientId}, ${order.id}, 'cancelled')" title="Cancelar">

                            <i class="fas fa-times"></i>

                        </button>

                    </div>

                </td>

            </tr>

        `;

    }).join('');

}



// Sobrecarga para o admin poder sincronizar

async function syncAdminOrder(clientId, orderId, externalId) {

    const data = await AutomationEngine.syncOrderStatus(externalId);

    if (data && data.status) {

        const userOrders = JSON.parse(localStorage.getItem(`snx_orders_${clientId}`) || '[]');

        const order = userOrders.find(o => o.id === orderId);

        if (order) {

            order.status = data.status;

            localStorage.setItem(`snx_orders_${clientId}`, JSON.stringify(userOrders));

            loadAdminDashboard();

            showToast(`Pedido #${orderId} atualizado para ${getStatusLabel(data.status)}`, 'info');

        }

    }

}



// Change order status

function changeOrderStatus(clientId, orderId, newStatus) {

    const userOrders = JSON.parse(localStorage.getItem(`snx_orders_${clientId}`) || '[]');

    const order = userOrders.find(o => o.id === orderId);

    if (order) {

        order.status = newStatus;

        localStorage.setItem(`snx_orders_${clientId}`, JSON.stringify(userOrders));

        loadAdminDashboard();

        showToast(`Pedido #${orderId} alterado para ${getStatusLabel(newStatus)}`, 'success');

    }

}



// Filter admin orders

function filterAdminOrders() {

    const term = document.getElementById('admin-search-orders').value.toLowerCase();

    const statusFilter = document.getElementById('admin-filter-status').value;

    const rows = document.querySelectorAll('#admin-orders-tbody tr:not(.empty-row)');



    rows.forEach(row => {

        const searchData = row.dataset.search || row.textContent.toLowerCase();

        const rowStatus = row.dataset.status;

        const matchSearch = !term || searchData.includes(term);

        const matchStatus = statusFilter === 'all' || rowStatus === statusFilter;

        row.style.display = matchSearch && matchStatus ? '' : 'none';

    });

}



// Transactions

function saveTransaction(clientName, type, amount, method) {

    const transactions = JSON.parse(localStorage.getItem('snx_transactions') || '[]');

    transactions.unshift({

        date: new Date().toISOString(),

        client: clientName,

        type: type,

        amount: amount,

        method: method

    });

    localStorage.setItem('snx_transactions', JSON.stringify(transactions));

}



function loadAdminTransactions() {

    const transactions = JSON.parse(localStorage.getItem('snx_transactions') || '[]');

    const tbody = document.getElementById('admin-transactions');



    // Also add payment transactions from orders

    const users = JSON.parse(localStorage.getItem('snx_users') || '[]');

    let orderTransactions = [];

    users.forEach(user => {

        const userOrders = JSON.parse(localStorage.getItem(`snx_orders_${user.id}`) || '[]');

        userOrders.forEach(order => {

            orderTransactions.push({

                date: order.date,

                client: user.name,

                type: 'Pedido #' + order.id,

                amount: order.total,

                method: 'Saldo'

            });

        });

    });



    const allTransactions = [...transactions, ...orderTransactions]

        .sort((a, b) => new Date(b.date) - new Date(a.date))

        .slice(0, 50); // Limit to 50



    if (allTransactions.length === 0) {

        tbody.innerHTML = `

            <tr class="empty-row">

                <td colspan="5">

                    <div class="empty-state">

                        <i class="fas fa-inbox"></i>

                        <p>Nenhuma transação registrada</p>

                    </div>

                </td>

            </tr>

        `;

        return;

    }



    tbody.innerHTML = allTransactions.map(t => `

        <tr>

            <td>${formatDate(t.date)}</td>

            <td>${t.client}</td>

            <td>${t.type}</td>

            <td style="color: var(--success); font-weight: 600;">${formatValue(t.amount)}</td>

            <td>${t.method}</td>

        </tr>

    `).join('');

}



// ─── Service & Profit Management (Admin) ───

let excludedCategories = JSON.parse(localStorage.getItem('snx_excluded_cats') || '[]');



function loadAdminServicesMgmt() {

    const tbody = document.getElementById('admin-services-tbody');

    const updateContainer = document.getElementById('last-update-container');

    const excludedArea = document.getElementById('excluded-categories-area');

    const excludedList = document.getElementById('admin-excluded-list');

    const searchTerm = document.getElementById('admin-search-services').value.toLowerCase();

    

    // 1. Mostrar Horário da Última Atualização

    if (updateContainer) {

        const lastSync = (window.GROWFOLLOWS_SERVICES && window.GROWFOLLOWS_SERVICES.lastSync) ? 

                         window.GROWFOLLOWS_SERVICES.lastSync : 'Sincronize para ver';

        updateContainer.innerHTML = `

            <div class="last-sync-badge" style="background: rgba(79, 172, 254, 0.1); color: #4facfe; padding: 10px; border-radius: 8px; margin-bottom: 20px;">

                <i class="fas fa-history"></i> Última sincronização do robô: <strong>${lastSync}</strong>

            </div>

        `;

    }



    // 2. Renderizar Tabela de Serviços

    tbody.innerHTML = '';

    const platforms = Object.keys(servicesDB).filter(p => !excludedCategories.includes(p)).sort();



    platforms.forEach(platform => {

        servicesDB[platform].forEach(svc => {

            if (searchTerm && !svc.name.toLowerCase().includes(searchTerm) && !svc.id.toString().includes(searchTerm) && !platform.toLowerCase().includes(searchTerm)) return;



            const tr = document.createElement('tr');

            const profitVal = svc.price - svc.cost;

            const profitPercent = svc.cost > 0 ? ((profitVal / svc.cost) * 100).toFixed(0) : 0;

            const statusClass = svc.status === 'available' ? 'status-online' : 'status-offline';



            tr.innerHTML = `

                <td>#${svc.id}</td>

                <td><span class="platform-badge">${fixEncoding(platform.toUpperCase())}</span></td>

                <td><div class="svc-name-admin">${fixEncoding(svc.name)}</div></td>

                <td><span class="cost-val">${formatValue(svc.cost)}</span></td>

                <td>

                    <div class="edit-price-wrapper">

                        <input type="number" step="0.01" class="admin-price-input" value="${svc.price.toFixed(2)}" 

                               onchange="updateSvcResale('${platform}', ${svc.id}, this.value)">

                    </div>

                </td>

                <td style="color: #43e97b; font-weight: 700;">${profitPercent}%</td>

                <td>

                    <span class="status-badge ${svc.providerStatus === 'offline' ? 'status-offline' : 'status-online'}" style="opacity: 0.8;">

                        <i class="fas fa-network-wired"></i> ${svc.providerStatus === 'offline' ? 'OFFLINE' : 'ONLINE'}

                    </span>

                </td>

                <td>

                    <span class="status-badge ${svc.status === 'available' ? 'status-online' : 'status-offline'}" onclick="toggleSvcStatus('${platform}', ${svc.id})" style="cursor:pointer; border: 1px solid rgba(255,255,255,0.1);">

                        ${svc.status === 'available' ? 'ATIVO' : 'PAUSADO'}

                    </span>

                </td>

                <td>

                    <button class="btn-action danger" onclick="deleteService('${platform}', ${svc.id})" title="Excluir">

                        <i class="fas fa-trash"></i>

                    </button>

                </td>

            `;

            tbody.appendChild(tr);

        });

    });



    // 3. Gerenciar Cemitério

    if (excludedArea && excludedList) {

        if (excludedCategories.length > 0) {

            excludedArea.style.display = 'block';

            excludedList.innerHTML = excludedCategories.sort().map(p => `

                <div class="cat-manage-item">

                    <div class="cat-info">

                        <i class="fas fa-eye-slash"></i>

                        <span class="cat-name">${p}</span>

                    </div>

                    <button class="btn-restore-cat" onclick="restoreCategory('${p}')">

                        <i class="fas fa-undo"></i> Restaurar

                    </button>

                </div>

            `).join('');

        } else {

            excludedArea.style.display = 'none';

        }

    }

}



/**

 * 🔍 Busca Dinâmica de Categorias (Mostra tudo ao focar)

 */

function searchCategoriesToExclude() {

    const input = document.getElementById('cat-search-input');

    const dropdown = document.getElementById('cat-search-results');

    const term = input.value.toLowerCase();

    

    const allCats = Object.keys(servicesDB).filter(p => !excludedCategories.includes(p)).sort();

    

    // Se não tiver termo, mostra TODAS. Se tiver, filtra.

    const matches = term ? allCats.filter(c => c.toLowerCase().includes(term)) : allCats;



    if (matches.length > 0) {

        dropdown.innerHTML = matches.map(m => `

            <div class="cat-result-item" onclick="selectCategoryToExclude('${m}')">

                <span class="cat-name">${m}</span>

                <i class="fas fa-plus-circle plus-icon"></i>

            </div>

        `).join('');

        dropdown.style.display = 'block';

    } else {

        dropdown.style.display = 'none';

    }

}





function selectCategoryToExclude(cat) {

    if (!excludedCategories.includes(cat)) {

        excludedCategories.push(cat);

        localStorage.setItem('snx_excluded_cats', JSON.stringify(excludedCategories));

    }

    

    document.getElementById('cat-search-input').value = '';

    document.getElementById('cat-search-results').style.display = 'none';

    loadAdminServicesMgmt();

    renderCategories();

    showToast(`Categoria "${cat}" ocultada com sucesso.`, 'info');

}



function deleteEntireCategory(cat) {

    selectCategoryToExclude(cat);

}



// ─── ADMIN: GESTÃO DE PASTAS DE CATEGORIAS ───

function createCategoryFolder() {

    const input = document.getElementById('new-folder-name');

    const name = input.value.trim();

    if (!name) return showToast('Digite um nome para a pasta', 'warning');

    

    const folders = JSON.parse(localStorage.getItem('snx_custom_folders') || '{}');

    if (folders[name]) return showToast('Já existe uma pasta com esse nome!', 'warning');

    

    folders[name] = [];

    localStorage.setItem('snx_custom_folders', JSON.stringify(folders));

    

    input.value = '';

    showToast(`Pasta "${name}" criada!`, 'success');

    loadAdminCategoryFolders();

    renderCategories();

}



function loadAdminCategoryFolders() {

    const container = document.getElementById('admin-folders-container');

    if (!container) return;

    

    const folders = JSON.parse(localStorage.getItem('snx_custom_folders') || '{}');

    const folderOrder = JSON.parse(localStorage.getItem('snx_folder_order') || '[]');

    

    Object.keys(folders).forEach(f => { if(!folderOrder.includes(f)) folderOrder.push(f); });

    const cleanedOrder = folderOrder.filter(f => folders[f]);



    container.innerHTML = '';

    

    if (cleanedOrder.length === 0) {

        container.innerHTML = '<p style="color:#666; font-size:0.85rem;">Nenhuma pasta criada ainda.</p>';

        return;

    }



    const allBaseKeys = Object.keys(servicesDB).sort();



    cleanedOrder.forEach(folderName => {

        const safeId = 'cb-list-' + folderName.replace(/\W+/g, '_');

        const countId  = 'count-'  + folderName.replace(/\W+/g, '_');

        

        let insideHTML = folders[folderName].length === 0

            ? '<i style="color:#555; font-size:0.8rem;">(Pasta vazia)</i>'

            : folders[folderName].map(c => `

                <span style="display:inline-flex; align-items:center; gap:5px; background:rgba(0,255,136,0.08); color:#00ff88; padding:4px 10px; border-radius:20px; margin:3px; font-size:0.75rem; border:1px solid rgba(0,255,136,0.2);">

                    ${c}

                    <i class="fas fa-times" style="cursor:pointer; color:#ff4b2b;" onclick="removeCatFromFolder('${folderName.replace(/'/g,"\\'")}', '${c.replace(/'/g,"\\'")}')"></i>

                </span>`).join('');



        const available = allBaseKeys.filter(k => !folders[folderName].includes(k));

        let checkboxesHTML = available.map(k => `

            <label class="cb-folder-item" style="display:flex; align-items:center; gap:8px; padding:5px; cursor:pointer; font-size:0.8rem; color:#ccc;">

                <input type="checkbox" value="${k.replace(/"/g,'&quot;')}" onchange="updateFolderSelCount('${countId}', '${safeId}')">

                <span>${k}</span>

            </label>`).join('');



        container.innerHTML += `

            <div class="folder-card-sort" data-name="${folderName}" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,215,0,0.1); padding:15px; border-radius:12px; margin-bottom:15px;">

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">

                    <div style="display:flex; align-items:center; gap:10px;">

                        <i class="fas fa-grip-vertical drag-handle" style="color:#ffd700; cursor:grab; opacity:0.5;"></i>

                        <h4 style="color:#ffd700; margin:0; font-size:0.95rem;">${folderName}</h4>

                    </div>

                    <button class="btn-primary-sm" style="background:#ff4b2b; padding:4px 10px;" onclick="deleteCategoryFolder('${folderName.replace(/'/g,"\\'")}')">

                        <i class="fas fa-trash"></i>

                    </button>

                </div>

                <div style="margin-bottom:12px;">${insideHTML}</div>

                <div style="background:rgba(0,0,0,0.2); border-radius:8px; overflow:hidden; border:1px solid rgba(255,255,255,0.05);">

                    <div style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; gap:8px;">

                        <i class="fas fa-search" style="color:#555; font-size:0.75rem;"></i>

                        <input type="text" placeholder="Buscar..." oninput="filterFolderCheckboxes('${safeId}', this.value)" style="background:transparent; border:none; color:white; font-size:0.75rem; flex:1; outline:none;">

                        <span id="${countId}" style="background:#00ff88; color:#000; font-size:0.65rem; padding:1px 6px; border-radius:10px; display:none;">0</span>

                    </div>

                    <div id="${safeId}" style="max-height:150px; overflow-y:auto; padding:8px; display:grid; grid-template-columns:1fr 1fr; gap:5px;">

                        ${checkboxesHTML || '<p style="color:#444; font-size:0.75rem;">Vazio</p>'}

                    </div>

                    <button onclick="addCheckedToFolder('${folderName.replace(/'/g,"\\'")}', '${safeId}')" style="width:100%; padding:10px; border:none; background:#007bff; color:white; font-weight:700; cursor:pointer; font-size:0.85rem; transition:0.2s;" onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">

                        <i class="fas fa-save"></i> Salvar categoria

                    </button>

                </div>

            </div>`;

    });



    if (typeof Sortable !== 'undefined') {

        new Sortable(container, {

            animation: 150,

            handle: '.drag-handle',

            onEnd: () => {

                const newOrder = [...container.querySelectorAll('.folder-card-sort')].map(el => el.dataset.name);

                localStorage.setItem('snx_folder_order', JSON.stringify(newOrder));

                renderCategories();

            }

        });

    }

}



function updateFolderSelCount(countId, listId) {

    const list = document.getElementById(listId);

    if (!list) return;

    const checked = list.querySelectorAll('input[type=checkbox]:checked').length;

    const countEl = document.getElementById(countId);

    if (countEl) {

        countEl.textContent = checked;

        countEl.style.display = checked > 0 ? 'inline-block' : 'none';

    }

}



function filterFolderCheckboxes(listId, term) {

    const list = document.getElementById(listId);

    if (!list) return;

    const lterm = term.toLowerCase();

    list.querySelectorAll('.cb-folder-item').forEach(item => {

        const text = item.querySelector('span').textContent.toLowerCase();

        item.style.display = text.includes(lterm) ? 'flex' : 'none';

    });

}



function addCheckedToFolder(folderName, listId) {

    const list = document.getElementById(listId);

    if (!list) return;

    const checked = [...list.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value);

    if (checked.length === 0) return showToast('Marque pelo menos uma categoria!', 'warning');

    const folders = JSON.parse(localStorage.getItem('snx_custom_folders') || '{}');

    if (!folders[folderName]) folders[folderName] = [];

    checked.forEach(cat => { if (!folders[folderName].includes(cat)) folders[folderName].push(cat); });

    localStorage.setItem('snx_custom_folders', JSON.stringify(folders));

    showToast('Categorias adicionadas!', 'success');

    loadAdminCategoryFolders();

    renderCategories();

}



function removeCatFromFolder(folderName, cat) {

    const folders = JSON.parse(localStorage.getItem('snx_custom_folders') || '{}');

    if (folders[folderName]) {

        folders[folderName] = folders[folderName].filter(c => c !== cat);

        localStorage.setItem('snx_custom_folders', JSON.stringify(folders));

        loadAdminCategoryFolders();

        if (typeof renderCategories === 'function') renderCategories();

    }

}



function deleteCategoryFolder(folderName) {

    if (!confirm(`Excluir a pasta "${folderName}"? As categorias voltarão a aparecer soltas.`)) return;

    const folders = JSON.parse(localStorage.getItem('snx_custom_folders') || '{}');

    delete folders[folderName];

    localStorage.setItem('snx_custom_folders', JSON.stringify(folders));

    loadAdminCategoryFolders();

    if (typeof renderCategories === 'function') renderCategories();

}





function restoreCategory(cat) {

    excludedCategories = excludedCategories.filter(c => c !== cat);

    localStorage.setItem('snx_excluded_cats', JSON.stringify(excludedCategories));

    

    loadAdminServicesMgmt();

    renderCategories();

    showToast(`Categoria "${cat}" restaurada!`, 'success');

}



function confirmDeleteAllCategories() {

    const total = Object.keys(servicesDB).filter(p => !excludedCategories.includes(p)).length;

    if (total === 0) return showToast('Nenhuma categoria ativa para excluir.', 'warning');



    if (!confirm('!!! ALERTA MÁXIMO !!!\n\nIsso irá ocultar TODAS as categorias ativas do seu site agora. Tem certeza?')) return;

    

    Object.keys(servicesDB).forEach(p => {

        if (!excludedCategories.includes(p)) {

            excludedCategories.push(p);

        }

    });

    

    localStorage.setItem('snx_excluded_cats', JSON.stringify(excludedCategories));

    loadAdminServicesMgmt();

    renderCategories();

    showToast('Site limpo! Todas as categorias foram ocultadas.', 'error');

}



function deleteService(platform, id) {

    if (!confirm('Remover este serviço do banco local? (Nota: Se o robô rodar, ele pode voltar se estiver ativo no fornecedor)')) return;

    

    if (servicesDB[platform]) {

        servicesDB[platform] = servicesDB[platform].filter(s => s.id != id);

        if (servicesDB[platform].length === 0) {

            deleteEntireCategory(platform);

        } else {

            loadAdminServicesMgmt();

            showToast('Serviço removido localmente.', 'info');

        }

    }

}



function updateSvcResale(platform, id, newPrice) {

    const service = servicesDB[platform].find(s => s.id === id);

    if (service) {

        service.price = parseFloat(newPrice);

        saveDynamicServices();

        loadAdminServicesMgmt();

        updateLandingPrices();

        if (typeof filterServices === 'function') filterServices();

        if (typeof updateServices === 'function') updateServices();

        showToast('Preço de venda atualizado!', 'success');

    }

}



function toggleSvcStatus(platform, id) {

    const service = servicesDB[platform].find(s => s.id === id);

    if (service) {

        service.status = service.status === 'available' ? 'unavailable' : 'available';

        saveDynamicServices();

        loadAdminServicesMgmt();

        showToast(`Serviço ${service.status === 'available' ? 'Ativado' : 'Desativado'}`, 'info');

        updateServices(); // Update user dropdown

    }

}



function saveDynamicServices() {

    localStorage.setItem('snx_custom_services', JSON.stringify(servicesDB));

}



function applyGlobalProfit() {

    const percentInput = document.getElementById('global-profit-percent');

    const percent = parseFloat(percentInput.value);

    

    if (isNaN(percent)) {

        showToast('Insira uma porcentagem válida.', 'error');

        return;

    }



    const multiplier = 1 + (percent / 100);



    Object.keys(servicesDB).forEach(platform => {

        servicesDB[platform].forEach(svc => {

            if (svc.cost && svc.cost > 0) {

                svc.price = svc.cost * multiplier;

            }

        });

    });



    saveDynamicServices();

    loadAdminServicesMgmt();

    updateLandingPrices();

    

    // Atualiza a UI do usuário em tempo real

    if (typeof renderCategories === 'function') renderCategories();

    if (typeof filterServices === 'function') filterServices(); 

    if (typeof updateServices === 'function') updateServices();

    

    showToast(`Lucro de ${percent}% aplicado com sucesso!`, 'success');

}



async function syncGrowFollowsServices() {

    if (!SNX_CONFIG.PROVIDER_API_KEY) {

        showToast('Configure sua API Key da GrowFollows para sincronizar!', 'error');

        return;

    }



    const btn = document.querySelector('.btn-primary-sm[onclick="syncGrowFollowsServices()"]');

    const originalContent = btn ? btn.innerHTML : '';

    if (btn) {

        btn.disabled = true;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';

    }



    try {

        const url = `${SNX_CONFIG.PROVIDER_API_URL}?key=${SNX_CONFIG.PROVIDER_API_KEY}&action=services`;

        const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

        

        let data = null;



        // 1. Tentar chamada direta ou via Proxy

        try {

            const resp = await fetch(url);

            if (resp.ok) data = await resp.json();

        } catch(e) {

            try {

                const resp = await fetch(proxy);

                const proxyData = await resp.json();

                data = JSON.parse(proxyData.contents);

            } catch(pErr) {

                console.warn("Rede bloqueada. Usando banco de dados pré-carregado.");

            }

        }



        // Limpeza de caracteres corrompidos





        if (data && Array.isArray(data)) {

            data.forEach(s => {

                s.name = cleanText(s.name);

                s.category = cleanText(s.category);

            });

        }



        // 2. Se falhar na rede, usar os dados pré-carregados (services-data.js)

        if (!data || !Array.isArray(data)) {

            if (window.GROWFOLLOWS_SERVICES) {

                // Converter o formato agrupado de volta para array se necessário

                if (!Array.isArray(window.GROWFOLLOWS_SERVICES)) {

                    data = [];

                    Object.values(window.GROWFOLLOWS_SERVICES).forEach(catArray => {

                        catArray.forEach(s => data.push({

                            service: s.id,

                            name: s.name,

                            rate: s.cost,

                            min: s.min,

                            max: s.max,

                            category: s.category,

                            type: s.type

                        }));

                    });

                } else {

                    data = window.GROWFOLLOWS_SERVICES;

                }

                showToast('Sincronizado via Banco de Dados Local (CORS Bypass)', 'success');

            }

        }



        if (data && Array.isArray(data)) {

            // 1. Marca todos os serviços atuais como Pausado (unavailable)

            // Isso garante que se um serviço sumiu da API, ele apareça como Pausado no Admin

            Object.keys(servicesDB).forEach(cat => {

                servicesDB[cat].forEach(svc => {

                    if (svc.status === 'available') svc._wasAvailable = true;

                    svc.status = 'unavailable';

                });

            });

            

            data.forEach(s => {

                if (!s || !s.category) return;

                

                const targetCat = s.category;

                if (!servicesDB[targetCat]) servicesDB[targetCat] = [];

                

                const cost = parseFloat(s.rate || s.cost) || 0;

                const currentProfitRaw = document.getElementById('global-profit-percent') ? document.getElementById('global-profit-percent').value : 50;

                const multiplier = 1 + (parseFloat(currentProfitRaw) / 100);



                // Verifica se o serviço já existe no nosso banco local

                let existing = servicesDB[targetCat].find(x => x.id == (s.service || s.id));

                

                if (existing) {

                    existing.cost = cost;

                    existing.refill = checkRefillSupport(s.name) ? 'R30' : 'SR';

                    existing.status = 'available'; 

                    existing.providerStatus = 'online'; 

                    existing.category = targetCat;

                    delete existing._wasAvailable;

                } else {

                    if (typeof addSystemAlert === 'function') {

                        addSystemAlert(`Novo Serviço da GrowFollows: ${s.name} [ID: ${s.service || s.id}]`, 'new');

                    }

                    servicesDB[targetCat].push({

                        id: s.service || s.id,

                        name: s.name,

                        cost: cost,

                        price: cost * multiplier,

                        min: parseInt(s.min),

                        max: parseInt(s.max),

                        desc: s.name,

                        quality: 'HQ API',

                        speed: 'Automático',

                        refill: checkRefillSupport(s.name) ? 'R30' : 'SR',

                        time: '0-24h',

                        category: s.category,

                        status: 'available',

                        providerStatus: 'online'

                    });

                }

            });



            // 3. Marcar os que SOBRARAM na lista local mas NÃO na API como providerStatus = offline

            // A lógica do Merge já faz isso no passo 1, mas vamos garantir:

            Object.keys(servicesDB).forEach(cat => {

                servicesDB[cat].forEach(svc => {

                    if (svc.status === 'unavailable') {

                        svc.providerStatus = 'offline';

                        if (svc._wasAvailable && typeof addSystemAlert === 'function') {

                            addSystemAlert(`Serviço Pausado no Fornecedor: ${svc.name} [ID: ${svc.id}]`, 'error');

                        }

                    }

                    delete svc._wasAvailable;

                });

            });



            saveDynamicServices();

            loadAdminServicesMgmt();

            updateLandingPrices();

            

            // Força renderização no Painel do Usuário

            if (typeof renderCategories === 'function') renderCategories();

            if (typeof filterServices === 'function') filterServices(); 

            if (typeof updateServices === 'function') updateServices();

            

            showToast(`Sucesso! ${data.length} serviços sincronizados.`, 'success');

        } else {

            showToast('Erro: Não foi possível carregar os dados da GrowFollows.', 'error');

        }

    } catch (err) {

        console.error('Sync Error:', err);

        showToast('Erro crítico na sincronização.', 'error');

    } finally {

        if (btn) {

            btn.disabled = false;

            btn.innerHTML = originalContent;

        }

    }

}



function loadDynamicServices() {

    const custom = localStorage.getItem('snx_custom_services');

    if (custom) {

        const parsed = JSON.parse(custom);

        // Merge or replace

        Object.assign(servicesDB, parsed);

    }

    updateLandingPrices();

}



/**

 * Atualiza os preços na vitrine (Página Inicial) dinamicamente

 */

function updateLandingPrices() {

    const cards = document.querySelectorAll('.services-section .service-card');

    cards.forEach(card => {

        const platform = card.dataset.platform;

        if (platform && servicesDB[platform] && servicesDB[platform].length > 0) {

            // Find minimum price

            const minSvc = servicesDB[platform].reduce((prev, curr) => prev.price < curr.price ? prev : curr);

            const priceTag = card.querySelector('.service-price');

            if (priceTag) {

                priceTag.textContent = `A partir de R$ ${minSvc.price.toFixed(2).replace('.', ',')}`;

            }

        }

    });

}



function filterAdminServicesMgmt() {

    const term = document.getElementById('admin-search-services').value.toLowerCase();

    const platform = document.getElementById('admin-filter-svc-platform').value;

    const rows = document.querySelectorAll('.svc-mgmt-row');



    rows.forEach(row => {

        const matchPlatform = platform === 'all' || row.dataset.platform === platform;

        const matchSearch = !term || row.dataset.name.includes(term) || row.dataset.id.includes(term);

        row.style.display = matchPlatform && matchSearch ? '' : 'none';

    });

}



// Função para limpar dados legados se necessário

function checkAndClearLegacyData() {

    // Verificamos se existem serviços antigos (ID 101) no LocalStorage ou no DB parcial

    const hasLegacy = (servicesDB.instagram && servicesDB.instagram.length > 0 && servicesDB.instagram[0].id === 101);

    

    if (hasLegacy) {

        console.log("Detectados serviços de exemplo antigos. Limpando...");

        for (let key in servicesDB) delete servicesDB[key];

        localStorage.removeItem('snx_services');

    }

}



// Update existing loadAdminDashboard to include the new mgmt tab

const originalLoadAdminDashboard = loadAdminDashboard;

loadAdminDashboard = function() {

    originalLoadAdminDashboard();

    loadAdminServicesMgmt();

};



// ─── Payment Processing ───

function processPayment() {

    const amountInput = document.getElementById('add-amount');

    const amount = parseFloat(amountInput.value);



    if (!amount || amount < SNX_CONFIG.MIN_DEPOSIT) {

        showToast(`Valor mínimo de depósito: ${formatValue(SNX_CONFIG.MIN_DEPOSIT)}`, 'error');

        return;

    }



    const btn = document.querySelector('.balance-form-area .btn-submit');

    if (!btn) return;



    const originalContent = btn.innerHTML;

    btn.disabled = true;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';



    AutomationEngine.generatePayment(amount)

        .then(result => {

            btn.disabled = false;

            btn.innerHTML = originalContent;



            if (result.success && result.pixCode) {

                showPixDisplay(amount, result.pixCode);

            } else {

                showManualDeposit(amount);

                showToast('Usando checkout manual para sua segurança.', 'info');

            }

        })

        .catch(err => {

            console.error('Erro no Checkout:', err);

            btn.disabled = false;

            btn.innerHTML = originalContent;

            showManualDeposit(amount);

        });

}



function showPixDisplay(amount, pixCode, encodedImage = '') {

    const container = document.getElementById('balance-form-area');

    const qrMarkup = encodedImage ? 

        `<div class="pix-qr-real"><img src="data:image/png;base64,${encodedImage}" alt="QR Code" style="width: 200px; border-radius: 10px; border: 5px solid white;"></div>` : 

        `<div class="pix-qr-placeholder"><i class="fas fa-qrcode"></i><p>QR Code</p></div>`;



    container.innerHTML = `

        <div class="order-form-card pix-display animate__animated animate__fadeIn">

            <h3><i class="fas fa-qrcode"></i> Pagamento PIX Gerado</h3>

            <p class="pix-amount">Valor: <strong style="color:var(--accent-color)">${formatValue(amount)}</strong></p>

            

            <div class="pix-qr-main" style="text-align:center; margin: 20px 0;">

                ${qrMarkup}

                <p style="font-size: 0.8rem; margin-top:10px; opacity:0.7;">Escaneie o QR Code no seu app do banco</p>

            </div>



            <div class="form-group">

                <label>Pix Copia e Cola</label>

                <div class="api-key-display">

                    <span class="pix-code-text" style="font-size: 0.7rem;">${pixCode.substring(0, 35)}...</span>

                    <button class="btn-copy" onclick="copyToClipboard('${pixCode}')">

                        <i class="fas fa-copy"></i>

                    </button>

                </div>

            </div>



            <div class="pix-instructions">

                <ul>

                    <li><i class="fas fa-check-circle" style="color:#2ecc71"></i> O saldo cairá automaticamente após o pagamento.</li>

                    <li><i class="fas fa-clock" style="color:#f1c40f"></i> Este código expira em 24 horas.</li>

                </ul>

            </div>



            <button class="btn-primary-sm" onclick="location.reload()" style="width:100%; margin-top:15px;">

                <i class="fas fa-check"></i> Já realizei o pagamento

            </button>

            <button class="btn-ghost" onclick="location.reload()" style="width:100%; margin-top:5px; font-size:0.8rem;">

                Voltar / Cancelar

            </button>

        </div>

    `;

}



function showManualDeposit(amount) {

    const container = document.getElementById('balance-form-area');

    container.innerHTML = `

        <div class="order-form-card pix-display">

            <h3><i class="fas fa-university"></i> Depósito Manual</h3>

            <p>A automação via API está em manutenção ou não configurada.</p>

            <p class="pix-amount">Valor pretendido: <strong>${formatValue(amount)}</strong></p>

            

            <div class="manual-instructions">

                <p>Para adicionar saldo agora, faça o PIX para a chave abaixo e envie o comprovante no suporte:</p>

                <div class="api-key-display">

                    <span style="font-weight: 800; color: #43e97b;">0010ecf7-9477-4281-bc47-37576d1a20f8</span>

                </div>

            </div>



            <button class="btn-primary-sm" onclick="showDashTab('dash-support')">

                <i class="fab fa-whatsapp"></i> Enviar Comprovante

            </button>

            <button class="btn-ghost" onclick="location.reload()" style="margin-top:10px">Voltar</button>

        </div>

    `;

}



function copyToClipboard(text) {

    navigator.clipboard.writeText(text);

    showToast('Copiado para a área de transferência!', 'success');

}



// ─── Admin Super Powers — Session & Data Integration ───



/**

 * Reembolsa um pedido e devolve o saldo ao cliente

 */

function adminRefundOrder(orderId) {

    if (!confirm('Deseja realmente reembolsar este pedido? O valor integral voltará para o saldo do cliente.')) return;



    const storedUsers = JSON.parse(localStorage.getItem('snx_users') || '[]');

    let orderFound = false;



    storedUsers.forEach(u => {

        let userOrders = JSON.parse(localStorage.getItem(`snx_orders_${u.id}`) || '[]');

        const order = userOrders.find(o => o.id == orderId);

        

        if (order && order.status !== 'refunded') {

            const refundAmount = order.total || order.amount || 0;

            u.balance = (u.balance || 0) + refundAmount;

            order.status = 'refunded';

            

            localStorage.setItem(`snx_orders_${u.id}`, JSON.stringify(userOrders));

            orderFound = true;

            

            // Se for o admin reembolsando a si mesmo ou user logado

            if (currentUser && currentUser.id == u.id) {

                currentUser.balance = u.balance;

                localStorage.setItem('snx_session', JSON.stringify(currentUser));

            }

        }

    });



    if (orderFound) {

        localStorage.setItem('snx_users', JSON.stringify(storedUsers));

        loadAdminDashboard();

        showToast(`Pedido #${orderId} reembolsado com sucesso!`, 'success');

    } else {

        showToast('Pedido não encontrado ou já reembolsado.', 'error');

    }

}



/**

 * Altera o status de um pedido manualmente

 */

function adminChangeStatus(orderId, newStatus) {

    const storedUsers = JSON.parse(localStorage.getItem('snx_users') || '[]');

    

    storedUsers.forEach(u => {

        let userOrders = JSON.parse(localStorage.getItem(`snx_orders_${u.id}`) || '[]');

        const order = userOrders.find(o => o.id == orderId);

        

        if (order) {

            order.status = newStatus;

            localStorage.setItem(`snx_orders_${u.id}`, JSON.stringify(userOrders));

            loadAdminDashboard();

            showToast(`Status do pedido #${orderId} alterado.`, 'info');

        }

    });

}



/**

 * Adiciona ou remove saldo de um cliente manualmente

 */

function adminUpdateBalance(userId) {

    const amount = parseFloat(prompt('Digite o valor para ADICIONAR (ex: 50) ou REMOVER (ex: -20):'));

    if (isNaN(amount) || amount === 0) return;



    const storedUsers = JSON.parse(localStorage.getItem('snx_users') || '[]');

    const user = storedUsers.find(u => u.id == userId);



    if (user) {

        user.balance += amount;

        localStorage.setItem('snx_users', JSON.stringify(storedUsers));

        

        // Se for o usuário atual logado, atualiza a sessão

        if (currentUser && currentUser.id == userId) {

            currentUser.balance = user.balance;

            localStorage.setItem('snx_session', JSON.stringify(currentUser));

        }



        loadAdminDashboard();

        showToast(`Saldo de ${user.name} atualizado! Novo saldo: ${formatValue(user.balance)}`, 'success');

    }

}







/**

 * Formata o nome para exibição profissional

 */

function formatDisplayName(name) {

    if (!name) return 'Usuário';

    

    // Se for um email, pega a parte antes do @

    let cleanName = name;

    if (cleanName.includes('@')) {

        cleanName = cleanName.split('@')[0];

    }

    

    // Capitaliza a primeira letra de cada nome e pega apenas os dois primeiros

    const parts = cleanName.trim().split(/\s+/);

    if (parts.length === 0) return 'Usuário';

    

    return parts.slice(0, 2).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');

}



// =====================================================

// INICIALIZADOR UNICO - SocialNexus v3.1

// =====================================================

function updateRobotClock() {

    var clockEl = document.getElementById('robot-clock');

    if (!clockEl) return;

    var now = new Date();

    clockEl.textContent = now.toLocaleTimeString('pt-BR') + ' - ' + now.toLocaleDateString('pt-BR');

}



function toggleRobotStatus() {

    var stateEl = document.getElementById('robot-state');

    var iconEl = document.getElementById('robot-icon');

    if (!stateEl || !iconEl) return;

    var isWorking = Math.random() > 0.3;

    if (isWorking) {

        stateEl.textContent = 'TRABALHANDO';

        stateEl.className = 'robot-state working';

        iconEl.textContent = '⚙️';

    } else {

        stateEl.textContent = 'DORMINDO';

        stateEl.className = 'robot-state sleeping';

        iconEl.textContent = '🤖';

    }

}



document.addEventListener('DOMContentLoaded', function() {



    // 1. Load services and settings

    if (typeof loadDynamicServices === 'function') loadDynamicServices();

    if (typeof checkAndClearLegacyData === 'function') checkAndClearLegacyData();

    if (typeof loadAdminSettings === 'function') loadAdminSettings();



    // 2. UI Setup

    var langSelect = document.getElementById('global-lang-selector');

    var currSelect = document.getElementById('global-curr-selector');

    if (langSelect) langSelect.value = currentLang || 'pt';

    if (currSelect) currSelect.value = currentCurrency || 'BRL';

    if (typeof initCardMasks === 'function') initCardMasks();

    if (typeof applyTranslations === 'function') applyTranslations();

    if (typeof renderCategories === 'function') renderCategories();

    if (typeof loadServicesList === 'function') loadServicesList();

    if (typeof animateCounters === 'function') animateCounters();

    if (typeof initScrollAnimations === 'function') initScrollAnimations();



    // 3. Order search filter

    var searchInput = document.getElementById('search-orders');

    if (searchInput) {

        searchInput.addEventListener('input', function() {

            var term = searchInput.value.toLowerCase();

            document.querySelectorAll('#orders-tbody tr:not(.empty-row)').forEach(function(row) {

                row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';

            });

        });

    }

    var filterStatus = document.getElementById('filter-status');

    if (filterStatus) {

        filterStatus.addEventListener('change', function() {

            var status = filterStatus.value;

            document.querySelectorAll('#orders-tbody tr:not(.empty-row)').forEach(function(row) {

                if (status === 'all') { row.style.display = ''; }

                else {

                    var badge = row.querySelector('.status-badge');

                    row.style.display = (badge && badge.className.includes(status)) ? '' : 'none';

                }

            });

        });

    }



    // 4. Robot clock

    updateRobotClock();

    setInterval(updateRobotClock, 1000);

    setInterval(toggleRobotStatus, 20000);



    // 5. Close category dropdown on outside click

    document.addEventListener('mousedown', function(e) {

        var dropdown = document.getElementById('cat-search-results');

        var searchArea = document.querySelector('.cat-search-bar');

        if (dropdown && searchArea && !searchArea.contains(e.target) && !dropdown.contains(e.target)) {

            dropdown.style.display = 'none';

        }

    });



    // 6. SESSION RESTORE (single point of truth)

    var isLogoutAction = window.location.search.indexOf('logout=') !== -1;

    if (isLogoutAction) {

        localStorage.removeItem('snx_session');

        window.history.replaceState(null, '', window.location.pathname);

        showPage('landing-page');

        console.log('[SNX] Logout OK');

        return;

    }



    var saved = localStorage.getItem('snx_session');

    if (saved) {

        try {

            currentUser = JSON.parse(saved);

            window.currentUser = currentUser;

            if (currentUser.role === 'admin') {

                showPage('admin-page');

                loadAdminDashboard();

            } else {

                showPage('dashboard-page');

                loadDashboard();

            }

            console.log('[SNX] Sessao restaurada: ' + currentUser.name);

        } catch(e) {

            console.error('[SNX] Sessao corrompida, limpando...');

            localStorage.clear();

            showPage('landing-page');

        }

    } else {

        showPage('landing-page');

    }

});



// ─── ADMIN NOTIFICATIONS (TICKETS & ALERTS) ───

window.toggleAdminNotifications = function() {

    const dropdown = document.getElementById('admin-notif-dropdown');

    if (dropdown) {

        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';

        if (dropdown.style.display === 'block') {

            loadAdminNotifications();

        }

    }

};



window.switchNotifTab = function(tab) {

    document.getElementById('tab-notif-tickets').style.borderBottomColor = tab === 'tickets' ? '#4facfe' : 'transparent';

    document.getElementById('tab-notif-tickets').style.color = tab === 'tickets' ? '#4facfe' : '#888';

    document.getElementById('tab-notif-alerts').style.borderBottomColor = tab === 'alerts' ? '#4facfe' : 'transparent';

    document.getElementById('tab-notif-alerts').style.color = tab === 'alerts' ? '#4facfe' : '#888';



    document.getElementById('notif-content-tickets').style.display = tab === 'tickets' ? 'block' : 'none';

    document.getElementById('notif-content-alerts').style.display = tab === 'alerts' ? 'block' : 'none';

};



window.loadAdminNotifications = function() {

    // Carregar Tickets

    const tickets = JSON.parse(localStorage.getItem('snx_tickets') || '[]');

    const openTickets = tickets.filter(t => t.status === 'open');

    const contentTickets = document.getElementById('notif-content-tickets');



    if (openTickets.length === 0) {

        contentTickets.innerHTML = '<p style="text-align: center; color: #888; font-size: 0.8rem; padding: 20px 0;">Nenhum ticket pendente.</p>';

    } else {

        // Mais recentes primeiro

        openTickets.sort((a, b) => new Date(b.date) - new Date(a.date));

        

        contentTickets.innerHTML = openTickets.map(t => `

            <div style="background: rgba(255,255,255,0.02); padding: 12px; margin-bottom: 10px; border-radius: 8px; border-left: 3px solid #ffc107;">

                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">

                    <strong style="color: #fff; font-size: 0.85rem;">[${t.id}] ${t.userName}</strong>

                    <span style="color: #aaa; font-size: 0.7rem;">${formatDate(t.date).substring(0, 10)}</span>

                </div>

                <div style="font-size: 0.8rem; color: #4facfe; margin-bottom: 5px;"><i class="fas fa-tag"></i> ${t.subject}</div>

                <p style="font-size: 0.8rem; color: #ccc; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${t.message}</p>

                <div style="margin-top: 10px; text-align: right;">

                    <button onclick="closeTicket('${t.id}')" style="background: rgba(0,255,136,0.1); color: #00ff88; border: 1px solid #00ff88; padding: 4px 10px; border-radius: 5px; cursor: pointer; font-size: 0.75rem;"><i class="fas fa-check"></i> Marcar Resolvido</button>

                </div>

            </div>

        `).join('');

    }



    // Carregar Alertas de Sistema

    const alerts = JSON.parse(localStorage.getItem('snx_sys_alerts') || '[]');

    const contentAlerts = document.getElementById('notif-content-alerts');



    if (alerts.length === 0) {

        contentAlerts.innerHTML = '<p style="text-align: center; color: #888; font-size: 0.8rem; padding: 20px 0;">Nenhuma notificação nova no sistema.</p>';

    } else {

        const recentAlerts = alerts.slice().reverse().slice(0, 20); // Mostrar últimos 20

        contentAlerts.innerHTML = recentAlerts.map(a => `

            <div style="background: rgba(255,255,255,0.02); padding: 10px; margin-bottom: 10px; border-radius: 8px; border-left: 3px solid ${a.type === 'new' ? '#00ff88' : '#ff4b2b'};">

                <p style="margin: 0; font-size: 0.85rem; color: #fff;">${a.message}</p>

                <small style="color: #666; font-size: 0.7rem;">${formatDate(a.date)}</small>

            </div>

        `).join('');

    }



    updateNotifBadge(openTickets.length + alerts.filter(a => !a.read).length);

};



window.addSystemAlert = function(message, type = 'info') {

    let alerts = JSON.parse(localStorage.getItem('snx_sys_alerts') || '[]');

    alerts.push({ id: Date.now(), message, type, date: new Date().toISOString(), read: false });

    

    // Manter só os últimos 50 alertas para não pesar o cache

    if (alerts.length > 50) alerts = alerts.slice(alerts.length - 50);

    

    localStorage.setItem('snx_sys_alerts', JSON.stringify(alerts));

    

    if (typeof updateNotifBadge === 'function') updateNotifBadge();

};



window.closeTicket = function(ticketId) {

    let tickets = JSON.parse(localStorage.getItem('snx_tickets') || '[]');

    const t = tickets.find(x => x.id === ticketId);

    if (t) {

        t.status = 'closed';

        localStorage.setItem('snx_tickets', JSON.stringify(tickets));

        if (typeof firebase !== 'undefined' && firebase.database) firebase.database().ref('snx_tickets').set(tickets);

        loadAdminNotifications();

    }

};



window.updateNotifBadge = function(totalNum = -1) {

    const badge = document.getElementById('admin-notif-badge');

    if (!badge) return;

    

    if (totalNum === -1) {

        const t = JSON.parse(localStorage.getItem('snx_tickets') || '[]').filter(x => x.status === 'open').length;

        const a = JSON.parse(localStorage.getItem('snx_sys_alerts') || '[]').filter(x => !x.read).length;

        totalNum = t + a;

    }

    

    if (totalNum > 0) {

        badge.textContent = totalNum > 99 ? '99+' : totalNum;

        badge.style.display = 'block';

    } else {

        badge.style.display = 'none';

        badge.textContent = '0';

    }

};



window.loadAdminTicketsTab = function() {

    const tickets = JSON.parse(localStorage.getItem('snx_tickets') || '[]');

    const tbody = document.getElementById('admin-tickets-tbody');

    if (!tbody) return;



    if (tickets.length === 0) {

        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#888;">Nenhum ticket encontrado.</td></tr>';

        return;

    }



    tickets.sort((a, b) => new Date(b.date) - new Date(a.date));



    tbody.innerHTML = tickets.map(t => {

        const isClosed = t.status === 'closed';

        const stBadge = isClosed ? '<span style="color:#888;">Resolvido</span>' : '<span style="color:#00ff88; font-weight:bold;">Aberto</span>';

        

        return `

            <tr style="${isClosed ? 'opacity: 0.6;' : 'cursor: pointer;'}" onclick="openTicketAdminModal('${t.id}')">

                <td><strong>${t.id}</strong></td>

                <td>${t.userName}</td>

                <td><span style="color:#4facfe;">${t.subject}</span><br><small style="color:#888;">${t.orderId}</small></td>

                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.message}">${t.message}</td>

                <td>${formatDate(t.date)}</td>

                <td>${stBadge}</td>

                <td><button class="btn-action success" title="Ver Detalhes"><i class="fas fa-eye"></i></button></td>

            </tr>

        `;

    }).join('');

};



window.openTicketAdminModal = function(tktId) {

    const tickets = JSON.parse(localStorage.getItem('snx_tickets') || '[]');

    const t = tickets.find(x => x.id === tktId);

    if (!t) return;



    document.getElementById('tkt-modal-user').textContent = t.userName;

    document.getElementById('tkt-modal-subject').textContent = t.subject;

    document.getElementById('tkt-modal-orderid').textContent = t.orderId;

    document.getElementById('tkt-modal-message').textContent = t.message;

    document.getElementById('tkt-modal-reply').value = t.adminReply || '';

    

    const resolveBtn = document.getElementById('btn-resolve-tkt');

    resolveBtn.onclick = () => {

        const reply = document.getElementById('tkt-modal-reply').value;

        const tkts = JSON.parse(localStorage.getItem('snx_tickets') || '[]');

        const target = tkts.find(x => x.id === tktId);

        if (target) {

            target.adminReply = reply;

            target.status = 'closed';

            localStorage.setItem('snx_tickets', JSON.stringify(tkts));

            if (typeof firebase !== 'undefined' && firebase.database) firebase.database().ref('snx_tickets').set(tkts);

            showToast('Resposta salva e ticket marcado como resolvido!', 'success');

        }

        document.getElementById('ticket-admin-modal').style.display = 'none';

        loadAdminTicketsTab();

        loadAdminNotifications();

    };



    document.getElementById('ticket-admin-modal').style.display = 'flex';

};



window.loadClientTickets = function() {

    if (!currentUser) return;

    const tickets = JSON.parse(localStorage.getItem('snx_tickets') || '[]');

    const myTickets = tickets.filter(t => t.userId === currentUser.id);

    const tbody = document.getElementById('client-tickets-tbody');

    if (!tbody) return;



    if (myTickets.length === 0) {

        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#666;">Nenhum ticket aberto.</td></tr>';

        return;

    }



    myTickets.sort((a,b) => new Date(b.date) - new Date(a.date));



    tbody.innerHTML = myTickets.map(t => {

        const stClass = t.status === 'open' ? 'status-processing' : 'status-completed';

        const stText = t.status === 'open' ? 'Pendente' : 'Respondido';

        return `

            <tr>

                <td><strong>${t.id}</strong></td>

                <td>${t.subject}</td>

                <td>${formatDate(t.date).split(' ')[0]}</td>

                <td><span class="status-badge ${stClass}">${stText}</span></td>

                <td><button class="btn-sync" onclick="openClientTicketModal('${t.id}')"><i class="fas fa-eye"></i></button></td>

            </tr>

        `;

    }).join('');

};



window.openClientTicketModal = function(tktId) {

    const tickets = JSON.parse(localStorage.getItem('snx_tickets') || '[]');

    const t = tickets.find(x => x.id === tktId);

    if (!t) return;



    // Marcar como visto em uma key persistente (não sobreposta pelo Firebase)

    const seenTkts = JSON.parse(localStorage.getItem('snx_seen_tickets') || '[]');

    if (!seenTkts.includes(tktId)) {

        seenTkts.push(tktId);

        localStorage.setItem('snx_seen_tickets', JSON.stringify(seenTkts));

    }

    

    if (typeof updateClientNotifBadge === 'function') updateClientNotifBadge();



    document.getElementById('cli-tkt-id').textContent = t.id;

    document.getElementById('cli-tkt-subject').textContent = t.subject;

    document.getElementById('cli-tkt-message').textContent = t.message;

    

    const replyBox = document.getElementById('cli-tkt-reply-box');

    if (t.adminReply) {

        replyBox.style.display = 'block';

        document.getElementById('cli-tkt-reply-text').textContent = t.adminReply;

    } else {

        replyBox.style.display = 'none';

    }



    document.getElementById('ticket-client-view-modal').style.display = 'flex';

};



// Auto-Update Badge every 30s

setInterval(() => { if(typeof updateNotifBadge === 'function') updateNotifBadge(); }, 30000);



// Inicializar Listeners de Sincronização (Firebase)

document.addEventListener('DOMContentLoaded', () => { 

    // RESTAURAR ESTADO DE NAVEGAÇÃO

    const lastPage = localStorage.getItem('snx_active_page');

    const lastTab = localStorage.getItem('snx_active_tab');

    

    setTimeout(() => { 

        if (currentUser) {

            if (lastPage) showPage(lastPage);

            if (lastTab) {

                const linkEl = document.querySelector(`.sidebar-link[onclick*="${lastTab}"]`);

                showDashTab(lastTab, linkEl);

            }

        }

        

        if (typeof updateNotifBadge === 'function') updateNotifBadge(); 

        if (typeof updateClientNotifBadge === 'function') updateClientNotifBadge();

        

        // Listener REAL-TIME para Novos Tickets no Firebase (broadcast global)

        if (typeof firebase !== 'undefined' && firebase.database) {

            firebase.database().ref('snx_tickets').on('value', (snapshot) => {

                const data = snapshot.val();

                if (data) {

                    const ticketsArray = Array.isArray(data) ? data : Object.values(data);

                    localStorage.setItem('snx_tickets', JSON.stringify(ticketsArray));

                    

                    if (typeof updateNotifBadge === 'function') updateNotifBadge();

                    if (typeof updateClientNotifBadge === 'function') updateClientNotifBadge();



                    if (document.getElementById('admin-tickets').style.display === 'block') {

                        loadAdminTicketsTab();

                    }

                    if (document.getElementById('dash-support').classList.contains('active')) {

                        loadClientTickets();

                    }

                }

            });

        }

    }, 500); 

});



window.updateClientNotifBadge = function() {

    if (!currentUser) return;

    const badge = document.getElementById('client-tkt-badge');

    if (!badge) return;



    const tickets = JSON.parse(localStorage.getItem('snx_tickets') || '[]');

    const myTickets = tickets.filter(t => t.userId === currentUser.id);

    const seenTkts = JSON.parse(localStorage.getItem('snx_seen_tickets') || '[]');

    

    // Verificamos se há algum ticket respondido que ainda não foi "visto"

    const hasUnread = myTickets.some(t => t.adminReply && !seenTkts.includes(t.id));



    // Se o usuário está na aba de suporte agora, limpamos o badge

    const isAtSupport = document.getElementById('dash-support').classList.contains('active');



    if (hasUnread && !isAtSupport) {

        badge.style.display = 'inline-block';

    } else {

        badge.style.display = 'none';

    }

};



window.reorderService = function(serviceId) {

    // Tenta encontrar o serviço no db local para preencher o form

    let found = null;

    Object.values(servicesDB).forEach(cat => {

        const s = cat.find(x => x.id == serviceId);

        if (s) found = s;

    });



    if (found) {

        showPage('dashboard-page');

        selectService(found);

        showToast('Serviço carregado! Basta inserir o link e quantidade.', 'info');

    } else {

        showToast('Serviço não encontrado na base atual.', 'warning');

    }

};

