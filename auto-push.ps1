# 자동 커밋 및 푸시 스크립트
# 파일 변경 감지 후 자동으로 커밋하고 푸시

$repoPath = $PSScriptRoot
$branch = "main"

# Git 상태 확인
Set-Location $repoPath

# 변경사항 확인
$status = git status --porcelain

if ($status) {
    Write-Host "변경사항 발견, 자동 커밋 및 푸시 중..." -ForegroundColor Green
    
    # 모든 변경사항 추가
    git add .
    
    # 커밋 메시지 생성 (변경된 파일 목록)
    $changedFiles = git diff --cached --name-only
    $commitMessage = "자동 커밋: " + ($changedFiles -join ", ")
    
    # 커밋
    git commit -m $commitMessage
    
    # 푸시
    git push origin $branch
    
    Write-Host "푸시 완료!" -ForegroundColor Green
} else {
    Write-Host "변경사항 없음" -ForegroundColor Yellow
}
