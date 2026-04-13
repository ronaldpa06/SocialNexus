$apiFile = 'C:\Users\ronald palheta\.gemini\antigravity\brain\60966d21-9641-4d18-b323-c83267adc77e\.system_generated\steps\2184\content.md'
$content = Get-Content $apiFile -Raw -Encoding UTF8
$startIdx = $content.IndexOf('[{')
$json = $content.Substring($startIdx)
$allData = $json | ConvertFrom-Json

# Dicionário de Tradução Otimizado
$translate = @{
    'Followers' = 'Seguidores'
    'Likes' = 'Curtidas'
    'Views' = 'Visualizações'
    'Comments' = 'Comentários'
    'Members' = 'Membros'
    'Reactions' = 'Reações'
    'Shares' = 'Compartilhamentos'
    'Subscribers' = 'Inscritos'
    'Watch Time' = 'Horas de Exibição'
    'Retweets' = 'Retweets'
    'Post' = 'Postagem'
    'Real' = 'Reais'
    'High Quality' = 'Alta Qualidade'
    'Non Drop' = 'Sem Queda'
    'Lifetime' = 'Vitalício'
    'Refill' = 'Com Reposição'
    'Fast' = 'Rápido'
    'Instant' = 'Instantâneo'
    'Brazil' = 'Brasileiros'
    'Brazilian' = 'Brasileiros'
    'Targeted' = 'Segmentados'
    'Cheap' = 'Barato'
    'Best' = 'Melhor'
    'Active' = 'Ativos'
    'Global' = 'Mundiais'
    'Story' = 'Stories'
    'Profile' = 'Perfil'
}

$filtered = $allData | Where-Object { $_.name -notmatch '<---' -and $_.name -notmatch '-----' -and ([double]$_.rate) -lt 100 }

$grouped = @{}
foreach ($s in $filtered) {
    # Traduzir Nome do Serviço
    $newName = $s.name
    foreach ($key in $translate.Keys) {
        $newName = $newName -replace $key, $translate[$key]
    }
    
    # Traduzir Categoria
    $newCat = $s.category
    foreach ($key in $translate.Keys) {
        if ($newCat) { $newCat = $newCat -replace $key, $translate[$key] }
    }
    if (-not $newCat) { $newCat = 'Geral' }

    if (-not $grouped.ContainsKey($newCat)) { $grouped[$newCat] = @() }
    
    $cost = [double]$s.rate
    $svcObj = [ordered]@{
        id = $s.service
        name = $newName
        cost = $cost
        price = [math]::Round($cost * 1.50, 4)
        min = $s.min
        max = $s.max
        type = $s.type
        category = $newCat
    }
    $grouped[$newCat] += $svcObj
}

$jsonOutput = $grouped | ConvertTo-Json -Depth 10 -Compress
$outputContent = @"
/**
 * SocialNexus - Servicos Traduzidos (PT-BR)
 */
window.GROWFOLLOWS_SERVICES = $jsonOutput;
(function init() {
    if (typeof window.servicesDB === 'undefined') window.servicesDB = {};
    for (var k in window.servicesDB) delete window.servicesDB[k];
    Object.assign(window.servicesDB, window.GROWFOLLOWS_SERVICES);
    if (typeof window.renderCategories === 'function') window.renderCategories();
})();
"@

$outputContent | Set-Content -Path 'c:\Users\ronald palheta\Downloads\PAINEL DE SEGUIDORES\services-data.js' -Encoding UTF8
Write-Host "✅ OK!"
