# 되돌리기 (Rollback) 가이드

## 백업 시점

- **백업 태그:** `backup-before-full-push`
- **커밋 해시:** `667db9a576d23c8c5db2965acdbe4abde606e6b0`

## 문제 생겼을 때 로컬만 되돌리기

```bash
# 1. 백업 태그 시점으로 완전히 되돌리기 (로컬 변경 모두 삭제)
git reset --hard backup-before-full-push

# 2. 또는 커밋 해시로 되돌리기
git reset --hard 667db9a576d23c8c5db2965acdbe4abde606e6b0
```

## GitHub까지 되돌리기 (이미 푸시한 경우)

```bash
# 1. 로컬을 백업 시점으로 되돌리기
git reset --hard backup-before-full-push

# 2. 강제 푸시 (원격도 백업 시점으로 맞춤)
git push origin main --force
```

⚠️ **주의:** `--force` 푸시는 다른 사람이 같은 브랜치를 쓰면 충돌할 수 있습니다. 혼자 쓰는 저장소일 때만 사용하세요.

## 특정 커밋만 취소하고 싶을 때

```bash
# 최근 1개 커밋만 취소 (변경 내용은 작업 폴더에 남김)
git reset --soft HEAD~1
```
