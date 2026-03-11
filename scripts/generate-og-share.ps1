$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630
$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$bg = [System.Drawing.Color]::FromArgb(248, 242, 232)
$panel = [System.Drawing.Color]::FromArgb(255, 251, 246)
$navy = [System.Drawing.Color]::FromArgb(19, 35, 50)
$blue = [System.Drawing.Color]::FromArgb(15, 99, 255)
$blueSoft = [System.Drawing.Color]::FromArgb(215, 228, 255)
$greenSoft = [System.Drawing.Color]::FromArgb(210, 232, 224)
$muted = [System.Drawing.Color]::FromArgb(90, 103, 121)
$white = [System.Drawing.Color]::White

$graphics.Clear($bg)

$panelBrush = New-Object System.Drawing.SolidBrush $panel
$graphics.FillRectangle($panelBrush, 78, 82, 650, 466)

$blueBrush = New-Object System.Drawing.SolidBrush $blueSoft
$greenBrush = New-Object System.Drawing.SolidBrush $greenSoft
$graphics.FillEllipse($blueBrush, 760, 70, 340, 340)
$graphics.FillEllipse($greenBrush, 895, 275, 220, 220)

$brandFont = New-Object System.Drawing.Font('Segoe UI', 22, [System.Drawing.FontStyle]::Bold)
$titleFont = New-Object System.Drawing.Font('Segoe UI', 34, [System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font('Segoe UI', 18, [System.Drawing.FontStyle]::Regular)
$pointFont = New-Object System.Drawing.Font('Segoe UI', 18, [System.Drawing.FontStyle]::Bold)

$navyBrush = New-Object System.Drawing.SolidBrush $navy
$blueTextBrush = New-Object System.Drawing.SolidBrush $blue
$mutedBrush = New-Object System.Drawing.SolidBrush $muted
$whiteBrush = New-Object System.Drawing.SolidBrush $white

$graphics.DrawString('TAXDY', $brandFont, $blueTextBrush, 118, 110)
$graphics.DrawString('Direct Review by a', $titleFont, $navyBrush, 118, 170)
$graphics.DrawString('10-Year Tax Accountant', $titleFont, $navyBrush, 118, 224)
$graphics.DrawString('Corporate bookkeeping, accountant switch, payroll and 4 insurances', $subFont, $mutedBrush, 118, 320)
$graphics.DrawString('Tax operations made simpler for business owners.', $subFont, $mutedBrush, 118, 354)

$graphics.DrawString('Less repeated explanation', $pointFont, $whiteBrush, 782, 180)
$graphics.DrawString('Direct tax review', $pointFont, $whiteBrush, 782, 230)
$graphics.DrawString('Monthly tax reports', $pointFont, $whiteBrush, 782, 280)

$outPath = Join-Path $PSScriptRoot '..\assets\images\og-share-20260311.png'
$outPath = [System.IO.Path]::GetFullPath($outPath)
$bitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$whiteBrush.Dispose()
$mutedBrush.Dispose()
$blueTextBrush.Dispose()
$navyBrush.Dispose()
$pointFont.Dispose()
$subFont.Dispose()
$titleFont.Dispose()
$brandFont.Dispose()
$greenBrush.Dispose()
$blueBrush.Dispose()
$panelBrush.Dispose()
$graphics.Dispose()
$bitmap.Dispose()

Write-Output $outPath
