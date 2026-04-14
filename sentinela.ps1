<#
.SYNOPSIS
    Sentinela SocialNexus - Sincronização Independente (PowerShell Puro)

.DESCRIPTION
    Este robô consulta a API da GrowFollows, aplica lucro de 100%, 
    atualiza o arquivo de serviços e faz o upload automático para o site.
    Roda a cada 3 horas.
#>

$API_KEY = "c1c3eac23e812939dedefdc9ac4bfb1c"
$API_URL = "https://growfollows.com/api/v2?key=$API_KEY&action=services"
$PROFIT_MULTIPLIER = 2.0
$INTERVAL_HOURS = 3
$INTERVAL_SECONDS = $INTERVAL_HOURS * 3600

# Limpar tela
Clear-Host

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      ROBO SENTINELA INDEPENDENTE v2      " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Estatus: ATIVO E VIGIANDO" -ForegroundColor Green
Write-Host "Este robo nao precisa de Node.js ou outros programas." -ForegroundColor Gray
Write-Host "------------------------------------------"

while ($true) {
    $timeNow = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timeNow] 🚀 Acordando para vigiar o fornecedor..." -ForegroundColor Yellow

    try {
        # 1. Buscar dados do fornecedor
        Write-Host "   -> Conectando na GrowFollows..." -ForegroundColor Gray
        $rawData = Invoke-RestMethod -Uri $API_URL -Method Get
        
        if ($rawData.error) {
            Write-Host "   ❌ Erro na API: $($rawData.error)" -ForegroundColor Red
        } else {
            Write-Host "   -> $($rawData.Count) servicos encontrados. Aplicando lucro..." -ForegroundColor Gray
            
            # 2. Filtrar e Organizar com Lucro
            $grouped = @{}
            foreach ($s in $rawData) {
                if ($s.name -match "<---" -or $s.name -match "-----" -or [double]$s.rate -ge 100) { continue }
                
                $cat = $s.category -if ($null -eq $s.category) { "Geral" } else { $s.category }
                if (-not $grouped.ContainsKey($cat)) { $grouped[$cat] = @() }
                
                $cost = [double]$s.rate
                $price = [math]::Round($cost * $PROFIT_MULTIPLIER, 4)
                
                $grouped[$cat] += @{
                    id = $s.service
                    name = $s.name
                    cost = $cost
                    price = $price
                    min = [int]$s.min
                    max = [int]$s.max
                    category = $cat
                    status = "available"
                }
            }

            # 3. Gerar o arquivo services-data.js
            $now = Get-Date
            $lastSyncStr = $now.ToString("HH:mm:ss - dd/MM/yyyy")
            $nextSyncStr = $now.AddHours($INTERVAL_HOURS).ToString("HH:mm:ss - dd/MM/yyyy")
            
            $jsonContent = $grouped | ConvertTo-Json -Depth 10
            $jsFileContent = @"
/**
 * SocialNexus - Servicos GrowFollows (Sincronizacao em Tempo Real)
 * Atualizado pelo Robo Sentinela as: $lastSyncStr
 */
window.GROWFOLLOWS_SERVICES = {
    lastSync: "$lastSyncStr",
    nextSync: "$nextSyncStr",
    data: $jsonContent
};

(function initServices() {
    if(!window.servicesDB) window.servicesDB = {};
    for (let key in window.servicesDB) delete window.servicesDB[key];
    if(window.GROWFOLLOWS_SERVICES.data) {
        Object.assign(window.servicesDB, window.GROWFOLLOWS_SERVICES.data);
    }
})();
"@
            $jsFileContent | Out-File -FilePath "services-data.js" -Encoding utf8
            Write-Host "   ✅ Arquivo de servicos atualizado localmente!" -ForegroundColor Green

            # 4. Upload para o Site
            Write-Host "   -> Enviando atualizacoes para a nuvem..." -ForegroundColor Gray
            powershell -ExecutionPolicy Bypass -File .\upload.ps1
            Write-Host "   🔥 Site atualizado com sucesso na Netlify!" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ Erro critico no ciclo: $($_.Exception.Message)" -ForegroundColor Red
    }

    $timeNext = (Get-Date).AddSeconds($INTERVAL_SECONDS).ToString("HH:mm:ss")
    Write-Host "------------------------------------------"
    Write-Host "💤 Sentinela em repouso. Voltara as $timeNext" -ForegroundColor DarkCyan
    Write-Host "Nao feche esta janela azul." -ForegroundColor Gray
    Write-Host ""
    
    Start-Sleep -Seconds $INTERVAL_SECONDS
}
