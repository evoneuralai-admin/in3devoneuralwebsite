#Requires -Version 5.1
<#
  Migrate Firestore (export -> GCS copy -> import) and Firebase Storage (gsutil rsync)
  from learnxr-evoneuralai -> in3devoneuralai.

  Prerequisites:
  - Google Cloud SDK installed (gcloud, gsutil on PATH), or set $env:CLOUDSDK_ROOT
  - gcloud auth login && gcloud auth application-default login
  - IAM: export on source, import on dest; Storage read/write on both default buckets
  - Destination Firestore should be empty or free of conflicting document paths

  Usage:
    .\migrate-learnxr-to-in3dev.ps1
    .\migrate-learnxr-to-in3dev.ps1 -SkipStorage
    .\migrate-learnxr-to-in3dev.ps1 -WhatIf   # prints commands only

  If PowerShell shows "Missing expression after unary operator '+'" after a failure, you pasted
  formatted error text (lines starting with +) into the prompt. Do not paste that; run the script
  again or type only the suggested commands.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string] $SourceProject = 'learnxr-evoneuralai',
    [string] $DestProject = 'in3devoneuralai',
    [string] $ExportPrefix = 'migration/firestore-full',
    [switch] $SkipFirestore,
    [switch] $SkipStorage,
    [string] $FirestoreDatabase = '(default)'
)

$ErrorActionPreference = 'Stop'

function Find-Gcloud {
    # Always prefer gcloud.cmd. Resolving `gcloud` in PowerShell often yields gcloud.ps1; its stderr
    # becomes ErrorRecords and users may copy/paste error *formatting* back into the shell (lines
    # starting with "+" then parse as invalid expressions).
    $searchDirs = @()
    if ($env:CLOUDSDK_ROOT) { $searchDirs += "$env:CLOUDSDK_ROOT\bin" }
    $searchDirs += @(
        "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin",
        "${env:ProgramFiles(x86)}\Google\Cloud SDK\google-cloud-sdk\bin",
        "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin"
    )
    foreach ($dir in $searchDirs) {
        $cmdPath = Join-Path $dir 'gcloud.cmd'
        if (Test-Path -LiteralPath $cmdPath) { return $cmdPath }
    }
    $cmd = Get-Command gcloud -ErrorAction SilentlyContinue
    if ($cmd) {
        $src = $cmd.Source
        if ($src -match '(?i)gcloud\.ps1$') {
            $alt = Join-Path (Split-Path $src -Parent) 'gcloud.cmd'
            if (Test-Path -LiteralPath $alt) { return $alt }
        }
        return $src
    }
    return $null
}

$gcloud = Find-Gcloud
if (-not $gcloud) {
    Write-Error "gcloud not found. Install Google Cloud SDK and add it to PATH, or set CLOUDSDK_ROOT."
}

$gcloudDir = Split-Path (Split-Path $gcloud -Parent) -Parent
$gsutil = Join-Path $gcloudDir 'bin\gsutil.cmd'
if (-not (Test-Path $gsutil)) { $gsutil = 'gsutil' }

function Test-GcloudActiveAccount {
    param([string]$GcloudPath)
    # Use JSON (no --filter) so empty cred lists do not trigger gcloud filter warnings
    $prevEa = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $raw = & $GcloudPath auth list --format=json 2>&1 | Out-String
    } finally {
        $ErrorActionPreference = $prevEa
    }
    if ($LASTEXITCODE -ne 0) { return $false }
    try {
        $arr = $raw | ConvertFrom-Json
        if (-not $arr) { return $false }
        if ($arr -is [System.Array]) { return $arr.Count -gt 0 }
        return $true
    } catch {
        return $false
    }
}

if (-not (Test-GcloudActiveAccount -GcloudPath $gcloud)) {
    Write-Host ""
    Write-Host "gcloud is installed but no account is logged in (this is why export failed)." -ForegroundColor Yellow
    Write-Host "Run these in THIS PowerShell window, then run the script again:`n" -ForegroundColor Yellow
    Write-Host "  & `"$gcloud`" auth login" -ForegroundColor White
    Write-Host "  & `"$gcloud`" auth application-default login`n" -ForegroundColor White
    Write-Host "Tip: If `gcloud` is not on PATH in this window, use the quoted paths above, or open a new terminal after adding SDK bin to PATH:`n  $gcloudDir\bin`n" -ForegroundColor DarkGray
    Write-Error "gcloud auth login required."
}

$srcBucket = "$SourceProject.appspot.com"
$dstBucket = "$DestProject.firebasestorage.app"

# Added timestamp to ensure every export attempt has a unique path to avoid "Path already exists" errors
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$exportUri = "gs://$srcBucket/$ExportPrefix/$timestamp"

# gcloud (via gcloud.ps1/python) writes many benign lines to stderr; PowerShell maps those to ErrorRecord
# and shows scary "NativeCommandError" text. Normalize to plain strings (strip "python.exe : " prefix).
function Convert-GcloudOutputLine {
    param($Obj)
    if ($Obj -is [System.Management.Automation.ErrorRecord]) {
        $m = $Obj.Exception.Message
        # Native stderr is wrapped as ErrorRecord; strip "tool.exe|tool.cmd : message"
        if ($m -match '^\s*[^\s]+\.(?:exe|cmd)\s*:\s*(.+)$') { return $matches[1].Trim() }
        return $m
    }
    return "$Obj"
}

function String-Lines {
    param($Stream)
    $Stream | ForEach-Object { Convert-GcloudOutputLine $_ }
}

function Invoke-Step {
    param([string]$Title, [scriptblock]$Block)
    Write-Host "`n=== $Title ===" -ForegroundColor Cyan
    if ($PSCmdlet.ShouldProcess($Title, 'Execute')) {
        # Script uses $ErrorActionPreference='Stop'. Native tools (gcloud/gsutil) write info to stderr;
        # PowerShell turns that into ErrorRecords which with Stop behave like errors. Use Continue
        # only while running the external block.
        $prevEa = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            # Capture stdout+stderr so real failures still appear in the throw message.
            $output = & $Block 2>&1
            $exit = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $prevEa
        }
        $text = @($output | ForEach-Object { Convert-GcloudOutputLine $_ })
        if ($text.Count -gt 0) {
            Write-Host ($text -join "`n")
        }
        if ($null -eq $exit) { $exit = 0 }
        if ($exit -ne 0) {
            throw "Step failed: $Title (exit $exit)`n`n--- command output ---`n$($text -join "`n")"
        }
    }
}

# Firestore export creates a subfolder under the prefix; import URI must point at that folder (not the parent prefix).
function Get-FirestoreExportImportUri {
    param([string]$Gsutil, [string]$ExportParentUri)
    $parent = $ExportParentUri.TrimEnd('/')

    $prevEaFs = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {

    # Prefer finding OVERALL_EXPORT_METADATA — works for any timestamp / naming variant.
    $recursive = & $Gsutil ls -r $parent 2>&1 | String-Lines
    if ($LASTEXITCODE -ne 0) {
        throw "gsutil ls -r failed for $parent : $($recursive -join ' | ')"
    }
    $metaDirs = @(
        $recursive | Where-Object { $_ -match '(?i)OVERALL_EXPORT_METADATA' } | ForEach-Object {
            $line = $_.Trim()
            if ($line -match '^(gs://.+)/(?i)OVERALL_EXPORT_METADATA\s*$') { $matches[1] }
        }
    )
    if ($metaDirs.Count -gt 0) {
        return ($metaDirs | Sort-Object -Descending | Select-Object -First 1)
    }

    # Fallback: direct children whose names look like Firestore export folders (ISO date + T…)
    $lines = & $Gsutil ls $parent 2>&1 | String-Lines
    if ($LASTEXITCODE -ne 0) {
        throw "gsutil ls failed for $parent : $($lines -join ' | ')"
    }
    $childUris = @(
        $lines | Where-Object {
            $_ -match '^\s*gs://' -and
            $_ -match '\d{4}-\d{2}-\d{2}T' -and
            $_ -notmatch 'OVERALL_EXPORT_METADATA'
        }
    )
    if ($childUris.Count -gt 0) {
        return ($childUris | Sort-Object -Descending | Select-Object -First 1).Trim().TrimEnd('/')
    }

    $sample = ($lines + $recursive | Select-Object -First 30) -join "`n"
    throw @"
Could not resolve Firestore export folder under $parent.

Expected a subfolder containing OVERALL_EXPORT_METADATA (or a name like YYYY-MM-DDTHH:MM:SS_…).

gsutil sample (first lines):
$sample
"@
    } finally {
        $ErrorActionPreference = $prevEaFs
    }
}

if (-not $SkipFirestore) {
    # 1. Start Firestore Export with --async to handle polling manually (more robust in some PowerShell environments)
    Invoke-Step "Firestore export ($SourceProject)" {
        & $gcloud -q config set project $SourceProject
        
        Write-Host "Starting export to $exportUri..." -ForegroundColor Gray
        if ($FirestoreDatabase -eq '(default)') {
            $raw = & $gcloud firestore export $exportUri --project=$SourceProject --format=json --async
        } else {
            $raw = & $gcloud firestore export $exportUri --project=$SourceProject --database=$FirestoreDatabase --format=json --async
        }
        
        # Filter out any non-JSON lines (like warnings) that might somehow bleed into stdout
        $jsonStr = $raw | Where-Object { $_ -match '^\s*[\{\[]' -or $_ -match '^\s*"?' } | Out-String
        $op = $jsonStr | ConvertFrom-Json
        $opName = $op.name
        Write-Host "Export operation started: $opName" -ForegroundColor Gray

        # Poll until done
        $done = $false
        while (-not $done) {
            Start-Sleep -Seconds 10
            $statusRaw = & $gcloud firestore operations describe $opName --format=json
            
            # Filter out non-JSON
            $statusJsonStr = $statusRaw | Where-Object { $_ -match '^\s*[\{\[]' -or $_ -match '^\s*"?' } | Out-String
            $status = $statusJsonStr | ConvertFrom-Json
            
            $done = $status.done
            # metadata.operationState is the standard key; handle case-sensitivity or structure variations
            $state = $status.metadata.operationState
            if (-not $state) { $state = $status.metadata.state }
            if (-not $state) { $state = "RUNNING" }

            Write-Host "Current State: $state..." -ForegroundColor Gray
            if ($status.error) {
                throw "Firestore export failed: $($status.error.message)"
            }
        }
        
        if ($status.metadata.operationState -ne 'SUCCESSFUL') {
            throw "Firestore export finished but state was: $($status.metadata.operationState)"
        }

        # The actual folder where overall_export_metadata lives
        $script:srcImportUri = $status.metadata.outputUriPrefix
    }

    Write-Host "Confirmed export folder: $script:srcImportUri" -ForegroundColor Green

    Invoke-Step "Copy export to destination bucket prefix" {
        $dstParent = "gs://$dstBucket/$ExportPrefix/$timestamp/"
        & $gsutil -m cp -r "$script:srcImportUri/*" $dstParent
        $script:dstImportUri = $dstParent.TrimEnd('/')
    }

    Invoke-Step "Firestore import ($DestProject)" {
        & $gcloud -q config set project $DestProject
        Write-Host "Starting import from $script:dstImportUri..." -ForegroundColor Gray
        if ($FirestoreDatabase -eq '(default)') {
            & $gcloud -q firestore import $script:dstImportUri --project=$DestProject
        } else {
            & $gcloud -q firestore import $script:dstImportUri --project=$DestProject --database=$FirestoreDatabase
        }
    }
}

if (-not $SkipStorage) {
    Invoke-Step "Storage rsync ($srcBucket -> $dstBucket)" {
        & $gsutil -m rsync -r "gs://$srcBucket" "gs://$dstBucket"
    }
}

Write-Host "`nDone. Deploy Firestore/Storage rules to $DestProject if needed: firebase deploy --only firestore,storage" -ForegroundColor Green
