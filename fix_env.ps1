$lines = Get-Content .env
$newLines = @()
$newLines += "# 服务器配置"
$newLines += "PORT=8001"
$newLines += ""
for ($i = 1; $i -lt $lines.Length; $i++) {
    $newLines += $lines[$i]
}
$newLines | Set-Content .env

