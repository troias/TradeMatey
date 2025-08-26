param(
	[switch] $DryRun,
	[switch] $ConfirmRun
)

# If this script is executed in a context that doesn't support 'param' (for example
# when the file is dot-sourced into an interactive shell), $PSCommandPath will be
# empty. Detect that and print a friendly message advising to use the launcher
# which explicitly invokes PowerShell with -File.
if (-not $PSCommandPath) {
	Write-Host "It looks like this script was executed in a context that doesn't support script parameters."
	Write-Host "Please run the launcher which invokes PowerShell with -File to ensure parameters work:"
	Write-Host "  .\dev\run_sql_tests_launcher.ps1 [-DryRun] [-ConfirmRun]"
	Write-Host "Or run directly: powershell -NoProfile -ExecutionPolicy Bypass -File .\dev\run_sql_tests.ps1 [-DryRun] [-ConfirmRun]"
	exit 1
}

<#
Run the SQL test suite. The script supports two modes:
- Hosted DB mode: if `DATABASE_URL` is set (or PGHOST/PGUSER/PGPASSWORD/PGDATABASE), the script will run psql against that DB.
- Docker mode: otherwise the script will bring up a local Postgres via docker-compose, run the tests, and tear it down.

Usage (hosted DB):
# In PowerShell set credentials in the environment for the session (do NOT commit):
$env:PGPASSWORD = '<YOUR_DB_PASSWORD>'
$env:PGHOST = '<host>'
$env:PGPORT = '6543'
$env:PGUSER = '<user>'
$env:PGDATABASE = '<database>'
# or set DATABASE_URL instead:
$env:DATABASE_URL = 'postgresql://user:password@host:port/dbname?sslmode=require'
# Then run this script:
.\dev\run_sql_tests.ps1

# Notes:
# - If using DATABASE_URL, this script passes the whole connection string to psql.
# - If using PG* vars, psql is invoked with those fields and expects PGPASSWORD to be set in the environment.
# - This script will not echo secrets; it only uses environment variables at runtime.
#>

param(
	[switch] $DryRun,
	[switch] $ConfirmRun
)

function Run-SqlFileWithPsql([string] $conn, [string] $file) {
	Write-Host "Running $file against provided connection"
	if ($env:DATABASE_URL) {
		# psql accepts a full connection string as first argument
		psql $env:DATABASE_URL -f $file
	} else {
		$host = $env:PGHOST
		$port = $env:PGPORT
		$user = $env:PGUSER
		$db = $env:PGDATABASE
		if (-not $env:PGPASSWORD) {
			Write-Host "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass;`nSet PGPASSWORD in the session before running this script when using PG* vars"; exit 1
		}
		psql --host=$host --port=$port --username=$user --dbname=$db -f $file
	}
}

if ($env:DATABASE_URL -or $env:PGHOST -or $env:SUPABASE_URL) {
	Write-Host "Using provided DB connection from environment (hosted DB mode)"
	# If SUPABASE_URL is present and PGHOST/PGUSER not set, derive sensible defaults.
	if ($env:SUPABASE_URL -and -not $env:PGHOST) {
		try {
			$u = [uri]$env:SUPABASE_URL
			$hostPart = $u.Host
			# common supabase project ref is the leftmost label
			$ref = $hostPart.Split('.')[0]
			if (-not $env:PGHOST) { $env:PGHOST = $hostPart }
			if (-not $env:PGPORT) { $env:PGPORT = '6543' }
			if (-not $env:PGUSER) { $env:PGUSER = "postgres.$ref" }
			if (-not $env:PGDATABASE) { $env:PGDATABASE = 'postgres' }
			Write-Host "Derived connection defaults from SUPABASE_URL: host=$($env:PGHOST) port=$($env:PGPORT) user=$($env:PGUSER)"
		} catch {
			Write-Host "Could not parse SUPABASE_URL for defaults: $env:SUPABASE_URL"
		}
	}
	if (-not $ConfirmRun) {
		Write-Host "WARNING: You are about to run tests against a non-local (hosted) database. This will write data to the target DB."
		Write-Host "Target host: $($env:PGHOST)"
		Write-Host "Target user: $($env:PGUSER)"
		if ($env:SUPABASE_SERVICE_ROLE_KEY) { Write-Host "SUPABASE_SERVICE_ROLE_KEY is present in environment (not used directly by these tests)." }
		Write-Host "To proceed non-interactively pass the -ConfirmRun flag. For a dry run pass -DryRun."
		$ans = Read-Host "Type YES to continue"
		if ($ans -ne 'YES') { Write-Host "Aborting."; exit 1 }
	}
	if ($DryRun) {
		Write-Host "Dry run: scripts to be executed:";
		Write-Host (Join-Path $PSScriptRoot 'sql-tests/01_create_schema.sql')
		Write-Host (Join-Path $PSScriptRoot 'sql-tests/02_run_tests.sql')
		exit 0
	}
	# Run schema init and tests directly against the provided DB
	Run-SqlFileWithPsql $env:DATABASE_URL (Join-Path $PSScriptRoot 'sql-tests/01_create_schema.sql')
	Run-SqlFileWithPsql $env:DATABASE_URL (Join-Path $PSScriptRoot 'sql-tests/02_run_tests.sql')
	exit 0
}

# Fallback: use docker-compose to spin up a local Postgres
Write-Host "No DB env vars found; using docker-compose mode"
docker compose -f .\dev\docker-compose.yml up -d db
Write-Host "Waiting for Postgres to become available..."
Start-Sleep -Seconds 5
# Run the psql scripts inside the container
docker exec -i $(docker ps -q -f "ancestor=postgres:15") psql -U test -d testdb -f /docker-entrypoint-initdb.d/01_create_schema.sql
# Wait and then run the more explicit tests
docker exec -i $(docker ps -q -f "ancestor=postgres:15") psql -U test -d testdb -f /docker-entrypoint-initdb.d/02_run_tests.sql

docker compose -f .\dev\docker-compose.yml down -v
