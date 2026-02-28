<#
PowerShell helper to apply DB optimization patch and run EXPLAIN ANALYZE on top queries.
Requires `psql` in PATH.
Usage:
  $env:PG_CONN = "postgresql://user:pass@host:port/dbname"
  powershell -ExecutionPolicy Bypass -File .\database\run_db_optimizations.ps1
#>

if (-not $env:PG_CONN) {
    Write-Host "PG_CONN environment variable not set. Prompting for connection details..." -ForegroundColor Yellow
    $user = Read-Host "DB user"
    $pass = Read-Host "DB password" -AsSecureString
    $passPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass))
    $host = Read-Host "DB host (localhost)"
    if ([string]::IsNullOrEmpty($host)) { $host = 'localhost' }
    $port = Read-Host "DB port (5432)"
    if ([string]::IsNullOrEmpty($port)) { $port = '5432' }
    $db = Read-Host "DB name"
    $env:PG_CONN = "postgresql://$user:$passPlain@$host:$port/$db"
}

$applyFile = "database/02_query_optimizations.sql"
$explainFile = "database/03_explain_top_queries.sql"
$logDir = "database"
$applyLog = Join-Path $logDir "optimization_apply_log.txt"
$explainLog = Join-Path $logDir "explain_results.txt"

Write-Host "Applying optimization SQL: $applyFile" -ForegroundColor Cyan
& psql $env:PG_CONN -f $applyFile 2>&1 | Tee-Object -FilePath $applyLog

Write-Host "Running EXPLAINs from: $explainFile" -ForegroundColor Cyan
& psql $env:PG_CONN -f $explainFile 2>&1 | Tee-Object -FilePath $explainLog

Write-Host "Done. Apply log: $applyLog" -ForegroundColor Green
Write-Host "Explain results: $explainLog" -ForegroundColor Green
