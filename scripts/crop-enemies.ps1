Add-Type -AssemblyName System.Drawing

$root = $env:CC_ROOT

function Crop-And-Trim {
    param([string]$srcFile, [int]$x, [int]$y, [int]$w, [int]$h, [string]$outFile)
    $src = [System.Drawing.Bitmap]::FromFile($srcFile)
    $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $crop = $src.Clone($rect, $src.PixelFormat)
    $src.Dispose()

    # Find bounding box of non-transparent pixels
    $minX = $crop.Width; $minY = $crop.Height; $maxX = 0; $maxY = 0
    $bmpData = $crop.LockBits(
        (New-Object System.Drawing.Rectangle(0,0,$crop.Width,$crop.Height)),
        [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $bmpData.Stride
    $bytes = New-Object byte[] ($stride * $crop.Height)
    [System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $bytes, 0, $bytes.Length)
    $crop.UnlockBits($bmpData)

    for ($py = 0; $py -lt $crop.Height; $py++) {
        for ($px = 0; $px -lt $crop.Width; $px++) {
            $a = $bytes[$py * $stride + $px * 4 + 3]
            if ($a -gt 20) {
                if ($px -lt $minX) { $minX = $px }
                if ($py -lt $minY) { $minY = $py }
                if ($px -gt $maxX) { $maxX = $px }
                if ($py -gt $maxY) { $maxY = $py }
            }
        }
    }

    if ($maxX -lt $minX) { $minX=0; $minY=0; $maxX=$crop.Width-1; $maxY=$crop.Height-1 }
    $pad = 6
    $minX = [Math]::Max(0, $minX - $pad)
    $minY = [Math]::Max(0, $minY - $pad)
    $maxX = [Math]::Min($crop.Width-1, $maxX + $pad)
    $maxY = [Math]::Min($crop.Height-1, $maxY + $pad)

    $tw = $maxX - $minX + 1
    $th = $maxY - $minY + 1
    $trimRect = New-Object System.Drawing.Rectangle($minX, $minY, $tw, $th)
    $trim = $crop.Clone($trimRect, $crop.PixelFormat)
    $crop.Dispose()
    $trim.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $trim.Dispose()
    Write-Output "$outFile : ${tw}x${th}"
}

# Sheets are 1448x1086. Top row 3 cols (~482 wide, 0..543 high). Bottom row 2 cols (~724 wide, 543..1086 high).
$TOP_H = 543
$TOP_W = [int](1448 / 3)   # 482
$BOT_H = 1086 - 543
$BOT_W = [int](1448 / 2)   # 724

# memory-giant: idle (top-left), run (bottom-right)
Crop-And-Trim "$root\memory-giant.png" 0 0 $TOP_W $TOP_H "$root\memory-giant-idle.png"
Crop-And-Trim "$root\memory-giant.png" $BOT_W 543 $BOT_W $BOT_H "$root\memory-giant-run.png"

# question-goblin: idle (top-left, has staff)
Crop-And-Trim "$root\question-goblin.png" 0 0 $TOP_W $TOP_H "$root\question-goblin-idle.png"

# mistake-bat: idle (top-left, wings spread)
Crop-And-Trim "$root\mistake-bat.png" 0 0 $TOP_W $TOP_H "$root\mistake-bat-idle.png"

# confusion-wizard: 5 columns in top row actually — pick leftmost
# Re-check: this sheet appears to have 5 figures in row. Use 1/5 width to be safe.
$WIZ_W = [int](1448 / 5)
Crop-And-Trim "$root\confusion-wizard.png" 0 0 $WIZ_W 1086 "$root\confusion-wizard-idle.png"
