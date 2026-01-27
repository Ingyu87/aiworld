# 파일 변경 감지 및 자동 푸시 스크립트
# 이 스크립트를 실행하면 파일 변경을 감지하고 자동으로 커밋 및 푸시합니다

$repoPath = $PSScriptRoot
$branch = "main"

Write-Host "파일 변경 감지 시작... (Ctrl+C로 종료)" -ForegroundColor Cyan
Write-Host "저장소: $repoPath" -ForegroundColor Cyan
Write-Host "브랜치: $branch" -ForegroundColor Cyan
Write-Host ""

# FileSystemWatcher 설정
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $repoPath
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# .git 폴더 제외
$excludePatterns = @(".git", "node_modules", ".vscode", ".cursor")

# 변경 감지 후 처리 (디바운싱을 위해 5초 대기)
$action = {
    $path = $Event.SourceEventArgs.FullPath
    $name = $Event.SourceEventArgs.Name
    $changeType = $Event.SourceEventArgs.ChangeType
    
    # 제외 패턴 확인
    $shouldExclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($path -like "*\$pattern\*" -or $path -like "*\$pattern") {
            $shouldExclude = $true
            break
        }
    }
    
    if (-not $shouldExclude) {
        Write-Host "[$changeType] $name" -ForegroundColor Yellow
        
        # 5초 대기 후 커밋 (디바운싱)
        Start-Sleep -Seconds 5
        
        Set-Location $repoPath
        
        # 변경사항 확인
        $status = git status --porcelain
        
        if ($status) {
            Write-Host "변경사항 커밋 및 푸시 중..." -ForegroundColor Green
            
            # 모든 변경사항 추가
            git add .
            
            # 커밋 메시지
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $commitMessage = "자동 커밋: $timestamp"
            
            # 커밋
            git commit -m $commitMessage 2>&1 | Out-Null
            
            # 푸시
            $pushResult = git push origin $branch 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ 푸시 완료!" -ForegroundColor Green
            } else {
                Write-Host "✗ 푸시 실패: $pushResult" -ForegroundColor Red
            }
        }
    }
}

# 이벤트 등록
Register-ObjectEvent -InputObject $watcher -EventName "Changed" -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName "Created" -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName "Deleted" -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName "Renamed" -Action $action | Out-Null

Write-Host "파일 변경 감지 중... (Ctrl+C로 종료)" -ForegroundColor Green

# 무한 대기
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    Write-Host "`n감시 종료" -ForegroundColor Yellow
}
