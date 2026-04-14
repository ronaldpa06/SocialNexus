/**
 * Sentinela do SocialNexus - Buscador de Serviços GrowFollows
 * Execute com: node generate-services.js
 * Puxa dados da nuvem em tempo real e atualiza o site!
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'c1c3eac23e812939dedefdc9ac4bfb1c';
const API_URL = `https://growfollows.com/api/v2?key=${API_KEY}&action=services`;

console.log('🤖 Sentinela iniciado. Conectando ao fornecedor GrowFollows...');

https.get(API_URL, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            console.log('📡 Dados recebidos! Processando o lote...');
            const rawData = JSON.parse(data);
            
            if (rawData.error) {
                console.error('❌ Erro na API da GrowFollows:', rawData.error);
                process.exit(1);
            }

            // Filtrar serviços separadores e itens de divisão
            const services = rawData.filter(s => 
                s && 
                s.name && 
                !s.name.includes('<---') && 
                !s.name.includes('-----') &&
                parseFloat(s.rate) < 100 // Excluir separadores
            );

            // Agrupar por categoria e Aplicar Lucro
            const grouped = {};
            services.forEach(s => {
                const cat = s.category || 'Geral';
                if (!grouped[cat]) grouped[cat] = [];
                
                const cost = parseFloat(s.rate) || 0;
                // LUCRO BASE: 100% de lucro em cima do custo do fornecedor
                const profitMultiplier = 2.0; 
                
                grouped[cat].push({
                    id: s.service,
                    name: s.name,
                    cost: cost,
                    price: parseFloat((cost * profitMultiplier).toFixed(4)),
                    min: s.min,
                    max: s.max,
                    type: s.type,
                    refill: s.refill,
                    cancel: s.cancel,
                    category: cat
                });
            });

            const totalServices = services.length;
            const totalCategories = Object.keys(grouped).length;

            console.log(`✅ Total de serviços processados: ${totalServices}`);
            console.log(`📂 Total de categorias: ${totalCategories}`);

            // Gerar o arquivo JavaScript
            const outputPath = path.join(__dirname, 'services-data.js');

            const output = `/**
 * SocialNexus - Serviços GrowFollows (Sincronização em Tempo Real)
 * Atualizado pela última vez pelo WebHook Sentinela às: ${new Date().toLocaleString('pt-BR')}
 */

window.GROWFOLLOWS_SERVICES = {
    lastSync: "${new Date().toLocaleTimeString('pt-BR')} do dia ${new Date().toLocaleDateString('pt-BR')}",
    data: ${JSON.stringify(grouped, null, 2)}
};

// Inicializar o motor
(function initServices() {
    if(!window.servicesDB) window.servicesDB = {};
    for (let key in window.servicesDB) delete window.servicesDB[key];
    Object.assign(window.servicesDB, window.GROWFOLLOWS_SERVICES.data);
})();
`;

            fs.writeFileSync(outputPath, output, 'utf8');
            console.log(`\n🎉 Robô Finalizado com Sucesso: services-data.js atualizado!`);

        } catch (e) {
            console.error('❌ Erro ao organizar os dados do JSON:', e.message);
            process.exit(1);
        }
    });

}).on('error', (err) => {
    console.error('❌ Erro de Conexão com o Servidor:', err.message);
});
