param(
    [string]$ArchivePath,
    [string]$DestinationPath = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($ArchivePath)) {
    $backupDirectory = Join-Path $projectRoot "backups"
    $latestBackup = Get-ChildItem -LiteralPath $backupDirectory -Filter "apdf-backup-*.zip" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1

    if (-not $latestBackup) {
        throw "No backup ZIP was found in '$backupDirectory'. Pass an archive path or create a backup first."
    }

    $ArchivePath = $latestBackup.FullName
}

$archivePathResolved = (Resolve-Path -LiteralPath $ArchivePath).Path
$destinationResolved = [System.IO.Path]::GetFullPath($DestinationPath)
if (-not (Test-Path -LiteralPath $destinationResolved -PathType Container)) {
    New-Item -ItemType Directory -Path $destinationResolved -Force | Out-Null
}
$destinationResolved = (Resolve-Path -LiteralPath $destinationResolved).Path

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePathResolved)

try {
    $entries = $archive.Entries
    if (-not ($entries | Where-Object { $_.FullName -eq "package.json" })) {
        throw "The selected archive does not contain package.json at its root."
    }

    $destinationPrefix = $destinationResolved.TrimEnd("\") + "\"
    foreach ($entry in $entries) {
        $entryPath = $entry.FullName.Replace("/", "\")
        if ([System.IO.Path]::IsPathRooted($entryPath) -or $entryPath -match '(^|\\)\.\.(\\|$)') {
            throw "Unsafe path in archive: '$($entry.FullName)'"
        }

        $targetPath = [System.IO.Path]::GetFullPath((Join-Path $destinationResolved $entryPath))
        if (-not $targetPath.StartsWith($destinationPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Archive entry is outside the destination directory: '$($entry.FullName)'"
        }
    }

    foreach ($entry in $entries) {
        if ([string]::IsNullOrEmpty($entry.Name)) {
            continue
        }

        $entryPath = $entry.FullName.Replace("/", "\")
        $targetPath = [System.IO.Path]::GetFullPath((Join-Path $destinationResolved $entryPath))
        $targetDirectory = Split-Path -Parent $targetPath
        New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null

        $inputStream = $entry.Open()
        try {
            $outputStream = [System.IO.File]::Open(
                $targetPath,
                [System.IO.FileMode]::Create,
                [System.IO.FileAccess]::Write,
                [System.IO.FileShare]::None
            )
            try {
                $inputStream.CopyTo($outputStream)
            }
            finally {
                $outputStream.Dispose()
            }
        }
        finally {
            $inputStream.Dispose()
        }
    }
}
finally {
    $archive.Dispose()
}

Write-Output ("Restored files from: {0}" -f $archivePathResolved)
Write-Output ("Destination: {0}" -f $destinationResolved)

Push-Location $destinationResolved
try {
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed with exit code $LASTEXITCODE."
    }

    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
