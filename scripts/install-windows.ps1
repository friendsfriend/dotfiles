#Requires -Version 5.1
<#
.SYNOPSIS
    Links dotfile config directories into their correct Windows locations.

.DESCRIPTION
    Creates directory junctions (no admin rights required) for:
      - GlazeWM:  %USERPROFILE%\.glzr\glazewm  ->  <dotfiles>/glazewm
      - Neovim:   %LOCALAPPDATA%\nvim           ->  <dotfiles>/nvim

    A junction is Windows' equivalent of a symlink for directories and is
    transparent to all applications. If you prefer real symbolic links
    (requires admin or Developer Mode), run with -UseSymlink.

.PARAMETER UseSymlink
    Create symbolic links instead of junctions.
    Requires either admin privileges or Developer Mode to be enabled.
#>
param(
    [switch]$UseSymlink
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$dotfiles = Resolve-Path (Join-Path $PSScriptRoot '..')

# ── Preflight ──────────────────────────────────────────────────────────────────

if ($UseSymlink) {
    $isAdmin = ([Security.Principal.WindowsPrincipal] `
        [Security.Principal.WindowsIdentity]::GetCurrent() `
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    $devMode = (Get-ItemProperty `
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' `
        -ErrorAction SilentlyContinue).AllowDevelopmentWithoutDevLicense -eq 1

    if (-not $isAdmin -and -not $devMode) {
        Write-Error (
            "Symbolic links require either admin privileges or Developer Mode.`n" +
            "Enable Developer Mode in Settings > System > For developers, " +
            "or re-run this script as Administrator.`n" +
            "Alternatively, run without -UseSymlink to use a junction instead."
        )
        exit 1
    }
}

# ── Helper ─────────────────────────────────────────────────────────────────────

function Install-Link {
    param(
        [string]$Source,
        [string]$Target
    )

    # Ensure source exists
    if (-not (Test-Path $Source)) {
        Write-Error "Source path does not exist: $Source"
        exit 1
    }

    # Create parent directory if needed
    $parent = Split-Path $Target
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
        Write-Host "Created $parent"
    }

    # Handle existing target
    if (Test-Path $Target) {
        $existing = Get-Item $Target -Force
        $isLink = $existing.LinkType -in @('Junction', 'SymbolicLink')

        if ($isLink -and $existing.Target -eq $Source) {
            Write-Host "Already linked: $Target -> $Source"
            return
        }

        if ($isLink) {
            Write-Host "Removing existing link at $Target"
            $existing.Delete()
        } else {
            Write-Error (
                "$Target already exists and is not a link.`n" +
                "Back it up and remove it manually before running this script."
            )
            exit 1
        }
    }

    # Create the link
    if ($UseSymlink) {
        New-Item -ItemType SymbolicLink -Path $Target -Target $Source | Out-Null
        Write-Host "Symlink created: $Target -> $Source"
    } else {
        New-Item -ItemType Junction -Path $Target -Target $Source | Out-Null
        Write-Host "Junction created: $Target -> $Source"
    }
}

# ── Installs ───────────────────────────────────────────────────────────────────

Install-Link `
    -Source (Join-Path $dotfiles 'glazewm') `
    -Target (Join-Path $env:USERPROFILE '.glzr\glazewm')

Install-Link `
    -Source (Join-Path $dotfiles 'nvim') `
    -Target (Join-Path $env:LOCALAPPDATA 'nvim')

Install-Link `
    -Source (Join-Path $dotfiles 'zebar') `
    -Target (Join-Path $env:USERPROFILE '.glzr\zebar\minimal')

Install-Link `
    -Source (Join-Path $dotfiles 'wezterm') `
    -Target (Join-Path $env:USERPROFILE '.config\wezterm')
