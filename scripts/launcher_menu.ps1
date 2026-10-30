# CMrpg Launcher Menu
$ErrorActionPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repo = 'DanRayy/CMrpg'
$headers = @{ 'User-Agent' = 'CMrpg-Launcher' }
$latest = $null

try {
    $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers $headers -TimeoutSec 3
    $latest = $rel.tag_name
} catch {}

if (-not $latest) {
    try {
        $tags = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/tags" -Headers $headers -TimeoutSec 3
        if ($tags -and $tags.Count -gt 0) { $latest = $tags[0].name }
    } catch {}
}

if (-not $latest) {
    $latest = 'Indisponivel'
}

# If input is redirected (non-interactive), default to Option 1 (Start)
if ([Console]::IsInputRedirected) {
    exit 1
}

$options = @(
    'Iniciar Servidor (Direto)',
    "Instalar atualizacoes do GitHub e iniciar [Ultima Release: $latest]"
)
$selected = 0

try { [Console]::CursorVisible = $false } catch {}

while ($true) {
    Clear-Host
    Write-Host '============================================================' -ForegroundColor DarkYellow
    Write-Host '               CMrpg - Inicializador do Servidor            ' -ForegroundColor Yellow
    Write-Host '============================================================' -ForegroundColor DarkYellow
    Write-Host ''
    Write-Host '  Navegue com [CIMA / BAIXO] ou digite [1 / 2], depois [ENTER]:' -ForegroundColor Gray
    Write-Host ''

    for ($i = 0; $i -lt $options.Count; $i++) {
        if ($i -eq $selected) {
            Write-Host "  > $($options[$i])  " -ForegroundColor Black -BackgroundColor Yellow
        } else {
            Write-Host "    $($options[$i])  " -ForegroundColor White
        }
    }

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor DarkYellow

    try {
        $keyInfo = [Console]::ReadKey($true)
        $key = $keyInfo.Key
        $char = $keyInfo.KeyChar
    } catch {
        exit 1
    }

    if ($key -eq 'UpArrow') {
        if ($selected -gt 0) { $selected-- } else { $selected = $options.Count - 1 }
    } elseif ($key -eq 'DownArrow') {
        if ($selected -lt ($options.Count - 1)) { $selected++ } else { $selected = 0 }
    } elseif ($key -eq 'Enter') {
        break
    } elseif ($char -eq '1') {
        $selected = 0
        break
    } elseif ($char -eq '2') {
        $selected = 1
        break
    }
}

try { [Console]::CursorVisible = $true } catch {}
Clear-Host

# Exit code: 1 = Iniciar Direto, 2 = Atualizar e Iniciar
exit ($selected + 1)
