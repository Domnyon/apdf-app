$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backupDirectory = Join-Path $projectRoot "backups"
$timestamp = Get-Date
$archivePath = Join-Path $backupDirectory ("apdf-backup-{0}.zip" -f $timestamp.ToString("yyyy-MM-dd"))
$temporaryArchivePath = Join-Path $backupDirectory ([guid]::NewGuid().ToString("N") + ".zip")

New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$files = Get-ChildItem -LiteralPath $projectRoot -Force -Recurse -File | Where-Object {
    $relativePath = $_.FullName.Substring($projectRoot.Length).TrimStart("\")
    $pathSegments = $relativePath -split "[\\/]"
    $excludedDirectory = $pathSegments | Where-Object {
        $_ -in @(".git", "node_modules", ".next")
    }

    -not $excludedDirectory -and $_.Extension -ne ".zip"
}

$archive = [System.IO.Compression.ZipFile]::Open(
    $temporaryArchivePath,
    [System.IO.Compression.ZipArchiveMode]::Create
)

try {
    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($projectRoot.Length).TrimStart("\").Replace("\", "/")
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive,
            $file.FullName,
            $relativePath,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
}
finally {
    $archive.Dispose()
}

Move-Item -LiteralPath $temporaryArchivePath -Destination $archivePath -Force
$archiveSize = [math]::Round((Get-Item -LiteralPath $archivePath).Length / 1MB, 2)

Write-Output ("Backup created at: {0}" -f $archivePath)
Write-Output ("Size: {0} MB" -f $archiveSize)
