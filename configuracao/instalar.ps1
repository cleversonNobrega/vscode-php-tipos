# Instala as extensoes do VS Code, a extensao local (.vsix) e copia o settings.json.
# Uso (PowerShell, dentro desta pasta):  powershell -ExecutionPolicy Bypass -File .\instalar.ps1
$pasta = $PSScriptRoot

Write-Host "1/3 Instalando extensoes da lista..."
Get-Content "$pasta\extensoes.txt" | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
    code --install-extension $_.Trim() --force
}

Write-Host "2/3 Instalando a extensao local (.vsix)..."
Get-ChildItem "$pasta\*.vsix" | ForEach-Object { code --install-extension $_.FullName --force }

Write-Host "3/3 Configuracoes do usuario..."
$destino = "$env:APPDATA\Code\User\settings.json"
if (Test-Path "$pasta\settings.json") {
    if (Test-Path $destino) {
        Copy-Item $destino "$destino.bak-antes-instalar" -Force
        Write-Host "Backup do settings.json atual: $destino.bak-antes-instalar"
    }
    New-Item -ItemType Directory -Force (Split-Path $destino) | Out-Null
    Copy-Item "$pasta\settings.json" $destino -Force
}

Write-Host ""
Write-Host "Pronto. Falta instalar no PC: PHP, Composer e o Pint global:"
Write-Host "  composer global require laravel/pint"
Write-Host "Depois recarregue o VS Code (Ctrl+Shift+P > Developer: Reload Window)."
