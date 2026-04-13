/**
 * Script de Geração de Serviços GrowFollows
 * Execute com: node generate-services.js
 * Gera o arquivo services-data.js com todos os serviços pré-carregados
 */

const fs = require('fs');
const path = require('path');

// Ler o arquivo de resposta da API
const apiFile = path.join(
    'C:', 'Users', 'ronald palheta', '.gemini', 'antigravity', 'brain',
    '60966d21-9641-4d18-b323-c83267adc77e', '.system_generated', 'steps', '2184', 'content.md'
);

const content = fs.readFileSync(apiFile, 'utf8');
const startIdx = content.indexOf('[{');
const jsonStr = content.substring(startIdx);

let rawData;
try {
    rawData = JSON.parse(jsonStr);
} catch(e) {
    console.error('Erro ao parsear JSON:', e.message);
    process.exit(1);
}

// Filtrar serviços separadores e itens de divisão
const services = rawData.filter(s => 
    s && 
    s.name && 
    !s.name.includes('<---') && 
    !s.name.includes('-----') &&
    parseFloat(s.rate) < 100 // Excluir separadores com rate=1000
);

// Agrupar por categoria
const grouped = {};
services.forEach(s => {
    const cat = s.category || 'Geral';
    if (!grouped[cat]) grouped[cat] = [];
    
    const cost = parseFloat(s.rate) || 0;
    const profitMultiplier = 1.50; // 50% de lucro padrão
    
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

console.log(`✅ Total de serviços: ${totalServices}`);
console.log(`📂 Total de categorias: ${totalCategories}`);

// Gerar o arquivo JavaScript
const outputPath = path.join('c:', 'Users', 'ronald palheta', 'Downloads', 'PAINEL DE SEGUIDORES', 'services-data.js');

const output = `/**
 * SocialNexus - Serviços GrowFollows (Pré-carregados)
 * Gerado automaticamente em: ${new Date().toISOString()}
 * Total de serviços: ${totalServices}
 * Total de categorias: ${totalCategories}
 * 
 * IMPORTANTE: Este arquivo é gerado automaticamente.
 * Para atualizar, execute: node generate-services.js
 */

// Dados estáticos de todos os serviços da GrowFollows
// Carregados diretamente para evitar erros de CORS
window.GROWFOLLOWS_SERVICES = ${JSON.stringify(grouped, null, 2)};

// Inicializar o servicesDB com os dados pré-carregados
(function initServices() {
    // Limpar banco antigo
    for (let key in window.servicesDB) delete window.servicesDB[key];
    
    // Copiar dados pré-carregados
    Object.assign(window.servicesDB, window.GROWFOLLOWS_SERVICES);
    
    console.log('[SocialNexus] ✅ ${totalServices} serviços carregados de ${totalCategories} categorias.');
    
    // Re-renderizar categorias se o painel já estiver carregado
    if (typeof window.renderCategories === 'function') {
        window.renderCategories();
    }
})();
`;

fs.writeFileSync(outputPath, output, 'utf8');
console.log(`\n✅ Arquivo gerado com sucesso: services-data.js`);
console.log(`   📊 ${totalServices} serviços em ${totalCategories} categorias`);
