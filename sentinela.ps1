<#
.SYNOPSIS
    Sentinela SocialNexus - Sincronização Automática com Fornecedor

.DESCRIPTION
    Este script roda em ciclo infinito (a cada 3 horas por padrão).
    Ele acorda, chama a API do fornecedor via Node.js, atualiza os precos de serviço,
    faz um commit das novidades e posta as atualizações na nuvem via Git no Netlify.
#>

$INTERVAL_HOURS = 3
$INTERVAL_SECONDS = $INTERVAL_HOURS * 3600

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      ROBO SENTINELA DO SOCIALNEXUS       " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "O robo esta ATIVO. Não feche esta janela!" -ForegroundColor Green
Write-Host ""

while ($true) {
    $timeNow = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
    Write-Host "[$timeNow] 🚀 Iniciando ciclo de sincronizacao..." -ForegroundColor Yellow
    
    # Passo 1: Executar o bot do Node.js
    Write-Host "   -> Baixando novidades da GrowFollows..." -ForegroundColor DarkGray
    node generate-services.js
    
    # Passo 2: Mandar para o Github/Netlify
    Write-Host "   -> Postando atualizacoes na nuvem..." -ForegroundColor DarkGray
    git add services-data.js
    
    # Só faz commit se ouver alteração real nos serviços
    $gitStatus = git status --porcelain
    if ($gitStatus -match "services-data.js") {
        git commit -m "🤖 Sincronizacao automatica: Novos serviços/precos da GrowFollows"
        
        Write-Host "   -> Enviando arquivos (Upload)..." -ForegroundColor DarkGray
        # Pega a branch atual para poder enviar com seguranca
        $branch = (git branch --show-current)
        git push origin $branch
        Write-Host "✅ Sincronizacao concluida! Site atualizado na Netlify." -ForegroundColor Green
    } else {
        Write-Host "✅ Nenhum preco ou servico novo encontrado no fornecedor. Nada a enviar." -ForegroundColor Green
    }

    $timeNext = (Get-Date).AddSeconds($INTERVAL_SECONDS).ToString("HH:mm:ss")
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "💤 O robo vai dormir agora. Acordara as $timeNext" -ForegroundColor DarkCyan
    Write-Host "Pode usar o PC normalmente. So nao feche esta janela azul." -ForegroundColor DarkGray
    Write-Host ""
    
    # Dorme a quantidade de segundos estipulada
    Start-Sleep -Seconds $INTERVAL_SECONDS
}
