# 자동 푸시 설정 스크립트

Write-Host "자동 푸시 설정 중..." -ForegroundColor Cyan

# Git hook 설정 확인
$hookPath = ".git\hooks\post-commit"
if (Test-Path $hookPath) {
    Write-Host "✓ Git hook이 이미 설정되어 있습니다." -ForegroundColor Green
} else {
    Write-Host "✗ Git hook을 찾을 수 없습니다." -ForegroundColor Red
}

# Git 설정 확인
$autoPush = git config --local --get push.auto
if (-not $autoPush) {
    Write-Host "Git 자동 푸시 설정 중..." -ForegroundColor Yellow
    # Git 2.4+ 버전에서는 push.auto 설정 사용 가능
    git config --local push.auto true 2>$null
}

Write-Host ""
Write-Host "설정 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "사용 방법:" -ForegroundColor Yellow
Write-Host "1. 파일을 수정하고 커밋하면 자동으로 푸시됩니다"
Write-Host "2. 또는 watch-and-push.ps1 스크립트를 실행하여 파일 변경 감지 모드 사용"
Write-Host ""
