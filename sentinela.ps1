<#
.SYNOPSIS
    Sentinela SocialNexus - Automacao Pura
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
Write-Host "Estatus: ATIVO" -ForegroundColor Green

while ($true) {
    $timeNow = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timeNow] Acordando para vigiar fornecedor..." -ForegroundColor Yellow

    try {
        Write-Host "   -> Buscando dados..." -ForegroundColor Gray
        $rawData = Invoke-RestMethod -Uri $API_URL -Method Get
        
        if ($null -ne $rawData) {
            Write-Host "   -> Processando servicos..." -ForegroundColor Gray
            $grouped = @{}
            foreach ($s in $rawData) {
                if ($s.name -match "<---" -or $s.name -match "-----" -or [double]$s.rate -ge 100) { continue }
                $cat = if ($null -eq $s.category -or $s.category -eq "") { "Geral" } else { $s.category }
                if (-not $grouped.ContainsKey($cat)) { $grouped[$cat] = @() }
                $grouped[$cat] += @{
                    id = $s.service
                    name = $s.name
                    cost = [double]$s.rate
                    price = [math]::Round([double]$s.rate * $PROFIT_MULTIPLIER, 4)
                    min = [int]$s.min
                    max = [int]$s.max
                    status = "available"
                }
            }

            $now = Get-Date
            $lastStr = $now.ToString("HH:mm:ss - dd/MM/yyyy")
            $nextStr = $now.AddHours($INTERVAL_HOURS).ToString("HH:mm:ss - dd/MM/yyyy")
            $json = $grouped | ConvertTo-Json -Depth 10

            $js = "window.GROWFOLLOWS_SERVICES = { lastSync: '$lastStr', nextSync: '$nextStr', data: $json };"
            $js += "`r`n(function(){ if(!window.servicesDB) window.servicesDB={}; for(let k in window.servicesDB) delete window.servicesDB[k]; if(window.GROWFOLLOWS_SERVICES.data) Object.assign(window.servicesDB, window.GROWFOLLOWS_SERVICES.data); })();"

            $js | Out-File -FilePath "services-data.js" -Encoding utf8
            Write-Host "   -> OK: Arquivo atualizado." -ForegroundColor Green
            
            powershell -ExecutionPolicy Bypass -File .\upload.ps1
            Write-Host "   -> OK: Site atualizado com sucesso!" -ForegroundColor Green
        }
    } catch {
        Write-Host "   -> ERRO: $($_.Exception.Message)" -ForegroundColor Red
    }

    $timeNext = (Get-Date).AddSeconds($INTERVAL_SECONDS).ToString("HH:mm:ss")
    Write-Host "------------------------------------------"
    Write-Host "SENTINELA EM REPOUSO ATE $timeNext" -ForegroundColor DarkCyan
    Start-Sleep -Seconds $INTERVAL_SECONDS
}
