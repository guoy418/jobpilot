[CmdletBinding()]
param(
  [string]$Message,
  [switch]$IncludeUntracked,
  [switch]$SkipPush,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  if ($DryRun) {
    Write-Host ("[dry-run] git " + ($Args -join " "))
    return ""
  }

  & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Get-GitOutput {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  $output = & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE"
  }
  return @($output)
}

function Get-AheadCount {
  $counts = Get-GitOutput -Args @("rev-list", "--left-right", "--count", "origin/main...HEAD")
  if (-not $counts -or -not $counts[0]) {
    return 0
  }

  if ($counts[0] -match '^\s*(\d+)\s+(\d+)\s*$') {
    return [int]$Matches[2]
  }

  return 0
}

$repoRoot = Get-GitOutput -Args @("rev-parse", "--show-toplevel")
if (-not $repoRoot) {
  throw "Current folder is not a git repository."
}

$statusLines = Get-GitOutput -Args @("status", "--porcelain=v1")
$aheadCount = Get-AheadCount
if (-not $statusLines -or $statusLines.Count -eq 0) {
  if ($aheadCount -gt 0) {
    Write-Host "No new working tree changes. Pushing $aheadCount existing local commit(s)..."
    if ($SkipPush) {
      Write-Host "Push skipped."
      exit 0
    }
    Invoke-Git -Args @("push", "origin", "main")
    Write-Host "Publish complete."
    exit 0
  }

  Write-Host "No changes to publish."
  exit 0
}

$ignoredLocalUntracked = @(
  ".agents/",
  "skills-lock.json"
)

$untrackedPaths = @(
  $statusLines |
    Where-Object { $_ -like "?? *" } |
    ForEach-Object { $_.Substring(3).Trim() }
)

if (-not $IncludeUntracked) {
  $blockingUntracked = @(
    $untrackedPaths | Where-Object { $_ -notin $ignoredLocalUntracked }
  )

  if ($blockingUntracked.Count -gt 0) {
    Write-Host "Untracked files detected. Publish stopped to avoid pushing unexpected files:" -ForegroundColor Yellow
    $blockingUntracked | ForEach-Object { Write-Host "  - $_" }
    Write-Host ""
    Write-Host "If you want to include them, run:" -ForegroundColor Yellow
    Write-Host "  .\publish.cmd -IncludeUntracked" -ForegroundColor Yellow
    exit 1
  }
}

$authorName = Get-GitOutput -Args @("config", "--get", "user.name")
$authorEmail = Get-GitOutput -Args @("config", "--get", "user.email")
if (-not $authorName -or -not $authorEmail) {
  throw "Git user.name or user.email is not configured for this repository."
}

if ($IncludeUntracked) {
  Invoke-Git -Args @("add", "-A")
} else {
  Invoke-Git -Args @("add", "-u")
}

$stagedFiles = @(Get-GitOutput -Args @("diff", "--cached", "--name-only") | Where-Object { $_ -and $_.Trim() })
if (-not $stagedFiles -or $stagedFiles.Count -eq 0) {
  if ($aheadCount -gt 0) {
    Write-Host "No new staged changes. Pushing $aheadCount existing local commit(s)..."
    if ($SkipPush) {
      Write-Host "Push skipped."
      exit 0
    }
    Invoke-Git -Args @("push", "origin", "main")
    Write-Host "Publish complete."
    exit 0
  }

  Write-Host "No staged changes to commit."
  exit 0
}

if (-not $Message) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  $Message = "Update jobpilot ($timestamp)"
}

Write-Host "Repository: $($repoRoot[0])"
Write-Host "Author: $($authorName[0]) <$($authorEmail[0])>"
Write-Host "Commit message: $Message"
Write-Host "Files:"
$stagedFiles | ForEach-Object { Write-Host "  - $_" }

Invoke-Git -Args @("commit", "-m", $Message)

if ($SkipPush) {
  Write-Host "Commit created. Push skipped."
  exit 0
}

Invoke-Git -Args @("push", "origin", "main")
Write-Host "Publish complete."
