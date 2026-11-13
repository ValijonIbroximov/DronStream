<#
.SYNOPSIS  PowerShell skriptlarining statik tekshiruvi (Windows PowerShell 5.1 parser bilan).
.DESCRIPTION
  Har bir .ps1 uchun:
    1) sintaksis xatolari (PS 5.1 parser);
    2) ASCII bo'lmagan baytlar (PS 5.1 BOM'siz faylni ANSI deb o'qiydi);
    3) hech qayerda qiymat berilmagan o'zgaruvchini o'qish (StrictMode ostida ish vaqtida xato beradi);
    4) skalyar bo'lishi mumkin bo'lgan natijada to'g'ridan-to'g'ri .Count (PS 5.1 StrictMode xatosi) - ogohlantirish;
    5) ds-*.ps1 / packaging skriptlari StrictMode yoqilgan umumiy faylni ulashi.
  Xato topilsa chiqish kodi 1.
.EXAMPLE   powershell -NoProfile -ExecutionPolicy Bypass -File tests\ps-lint.ps1
#>
param([string]$Repo = (Split-Path $PSScriptRoot -Parent))
$ErrorActionPreference = "Stop"
Set-StrictMode -Version 3.0
$files = @()
foreach ($d in "scripts", "packaging\scripts", "tests") { $files += @(Get-ChildItem (Join-Path $Repo $d) -Filter *.ps1 -File) }
$files += Get-Item (Join-Path $Repo "build.ps1")
$auto = @('true', 'false', 'null', '_', 'psitem', 'args', 'input', 'this', 'psscriptroot', 'pscommandpath', 'lastexitcode', 'erroractionpreference',
  'progresspreference', 'warningpreference', 'verbosepreference', 'confirmpreference', 'myinvocation', 'psboundparameters', 'error', 'host', 'pid',
  'matches', 'executioncontext', 'home', 'pwd', 'psversiontable', '?', 'pshome', 'ofs', 'foreach', 'switch', 'stacktrace', 'pscmdlet', 'profile')
function Get-Assigned($ast) {
  $names = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($a in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.AssignmentStatementAst] }, $true)) {
    foreach ($v in $a.Left.FindAll({ param($n) $n -is [System.Management.Automation.Language.VariableExpressionAst] }, $true)) { [void]$names.Add(($v.VariablePath.UserPath.ToLowerInvariant() -replace '^(script|global|local|private):', '')) }
  }
  foreach ($p in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.ParameterAst] }, $true)) { [void]$names.Add($p.Name.VariablePath.UserPath.ToLowerInvariant()) }
  foreach ($f in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.ForEachStatementAst] }, $true)) { [void]$names.Add($f.Variable.VariablePath.UserPath.ToLowerInvariant()) }
  return , $names
}
$problems = @(); $warnings = @()
$sharedCache = @{}
foreach ($f in $files) {
  $rel = $f.FullName.Substring($Repo.Length + 1)
  $bytes = [IO.File]::ReadAllBytes($f.FullName)
  for ($i = 0; $i -lt $bytes.Length; $i++) { if ($bytes[$i] -gt 127) { $problems += "${rel}: ASCII bo'lmagan bayt (pozitsiya $i)"; break } }
  $tokens = $null; $errs = $null
  $ast = [System.Management.Automation.Language.Parser]::ParseFile($f.FullName, [ref]$tokens, [ref]$errs)
  foreach ($e in @($errs)) { $problems += ("{0}:{1} sintaksis: {2}" -f $rel, $e.Extent.StartLineNumber, $e.Message) }
  $assigned = Get-Assigned $ast
  # names defined by dot-sourced shared files in the same folder
  $text = [Text.Encoding]::ASCII.GetString($bytes)
  $strict = $text -match '(?m)^\s*Set-StrictMode\s+-Version\s+(3\.0|Latest)'
  foreach ($shared in "ds-common.ps1", "common.ps1") {
    if ($f.Name -ne $shared -and $text -match [regex]::Escape($shared)) {
      $sp = Join-Path $f.DirectoryName $shared
      if (Test-Path $sp) {
        if (-not $sharedCache.ContainsKey($sp)) {
          $t2 = $null; $e2 = $null
          $sharedCache[$sp] = @{ names = (Get-Assigned ([System.Management.Automation.Language.Parser]::ParseFile($sp, [ref]$t2, [ref]$e2))); strict = ((Get-Content $sp -Raw) -match '(?m)^\s*Set-StrictMode\s+-Version\s+(3\.0|Latest)') }
        }
        foreach ($n in $sharedCache[$sp].names) { [void]$assigned.Add($n) }
        if ($sharedCache[$sp].strict) { $strict = $true }
      }
    }
  }
  if (-not $strict) { $problems += "${rel}: StrictMode yoqilmagan (Set-StrictMode -Version 3.0 yoki uni yoqadigan umumiy fayl yo'q)" }
  foreach ($v in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.VariableExpressionAst] }, $true)) {
    $up = $v.VariablePath.UserPath
    if ($v.VariablePath.IsDriveQualified -or $up -match '^(env|function|variable|alias):') { continue }
    $n = $up.ToLowerInvariant() -replace '^(script|global|local|private|using):', ''
    if ($auto -contains $n -or $assigned.Contains($n)) { continue }
    $problems += ("{0}:{1} qiymat berilmagan o'zgaruvchi: `${2}" -f $rel, $v.Extent.StartLineNumber, $up)
  }
  # direct .Count on something that may be a scalar/null in PS 5.1 strict mode
  foreach ($m in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.MemberExpressionAst] -and $n.Member.Extent.Text -eq 'Count' }, $true)) {
    $t = $m.Expression
    if ($t -is [System.Management.Automation.Language.ArrayExpressionAst]) { continue }                # @(...).Count
    if ($t -is [System.Management.Automation.Language.VariableExpressionAst]) {
      $vn = $t.VariablePath.UserPath.ToLowerInvariant() -replace '^(script|global|local|private):', ''
      # safe when every assignment to that variable is an array expression, a hashtable or a -split
      $safe = $true; $seen = $false
      foreach ($a in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.AssignmentStatementAst] }, $true)) {
        $l = $a.Left; if ($l -is [System.Management.Automation.Language.ConvertExpressionAst]) { $l = $l.Child }
        if ($l -isnot [System.Management.Automation.Language.VariableExpressionAst]) { continue }
        if (($l.VariablePath.UserPath.ToLowerInvariant() -replace '^(script|global|local|private):', '') -ne $vn) { continue }
        $seen = $true
        if ($a.Operator -ne 'Equals') { continue }   # += keeps the type
        $rt = $a.Right.Extent.Text.Trim()
        $isSplit = ($rt -match '-split ') -and ($rt -notmatch '\|')   # -split always yields an array; a pipeline after it may not
        if (-not ($isSplit -or $rt -match '^(@\(|@\{|\[ordered\]@\{|New-Object)')) { $safe = $false }
      }
      if ($seen -and $safe) { continue }
    }
    if ($t -is [System.Management.Automation.Language.MemberExpressionAst] -or $t -is [System.Management.Automation.Language.IndexExpressionAst]) { continue } # e.g. $x.Values.Count, $st.fixable.Count: reviewed collections
    $warnings += ("{0}:{1} .Count skalyar/bo'sh qiymatda PS 5.1 StrictMode xatosi berishi mumkin: {2}" -f $rel, $m.Extent.StartLineNumber, $m.Extent.Text)
  }
}
$warnings | ForEach-Object { Write-Host ("OGOHLANTIRISH " + $_) -ForegroundColor Yellow }
$problems | ForEach-Object { Write-Host ("XATO " + $_) -ForegroundColor Red }
Write-Host ("{0} fayl tekshirildi (PowerShell {1}); xato: {2}; ogohlantirish: {3}" -f $files.Count, $PSVersionTable.PSVersion, $problems.Count, $warnings.Count)
if ($problems.Count -gt 0 -or $warnings.Count -gt 0) { exit 1 }
exit 0
