# Firebase 설정 가이드

이 문서는 **Ingyu's AI World** 프로젝트에 Firebase를 설정하는 방법을 안내합니다.

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속합니다.
2. "프로젝트 추가" 버튼을 클릭합니다.
3. 프로젝트 이름을 입력합니다 (예: `ingyu-ai-world`).
4. Google Analytics는 선택사항입니다 (필요시 활성화).
5. "프로젝트 만들기"를 클릭하고 완료될 때까지 기다립니다.

## 2. 웹 앱 추가

1. Firebase Console에서 생성한 프로젝트를 선택합니다.
2. 프로젝트 개요 페이지에서 **웹 아이콘** (`</>`)을 클릭합니다.
3. 앱 닉네임을 입력합니다 (예: `Ingyu's AI World Web`).
4. "Firebase Hosting 설정"은 선택 해제합니다 (나중에 필요시 설정 가능).
5. "앱 등록"을 클릭합니다.
6. **Firebase SDK 구성 정보가 표시됩니다**. 이 정보를 복사해 둡니다.

## 3. Authentication 설정

1. Firebase Console의 왼쪽 메뉴에서 **"Authentication"**을 클릭합니다.
2. "시작하기" 버튼을 클릭합니다.
3. "Sign-in method" 탭으로 이동합니다.
4. **"이메일/비밀번호"**를 클릭하여 활성화합니다.
5. "사용 설정" 스위치를 켭니다.
6. "저장" 버튼을 클릭합니다.

## 4. Firestore Database 생성

1. Firebase Console의 왼쪽 메뉴에서 **"Firestore Database"**를 클릭합니다.
2. "데이터베이스 만들기" 버튼을 클릭합니다.
3. **"프로덕션 모드에서 시작"**을 선택합니다 (보안 규칙을 직접 설정).
4. Cloud Firestore 위치를 선택합니다 (권장: `asia-northeast3 (Seoul)`).
5. "사용 설정" 버튼을 클릭합니다.

## 5. Firestore 보안 규칙 설정

1. Firestore Database 페이지에서 "규칙" 탭으로 이동합니다.
2. 다음 보안 규칙을 복사하여 붙여넣습니다:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection: 교사는 모든 접근, 학생은 자신만 읽기
    match /users/{userId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == userId || 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher');
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
      allow create: if request.auth != null; // 신규 계정 생성을 위해
    }
    
    // Usage logs: 인증된 사용자는 쓰기, 교사만 읽기
    match /usage_logs/{logId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
  }
}
```

3. "게시" 버튼을 클릭하여 규칙을 적용합니다.

## 6. Firebase 설정 파일 업데이트

1. 프로젝트 폴더에서 `firebase-config.js` 파일을 엽니다.
2. Firebase Console에서 복사한 설정 정보로 다음 부분을 교체합니다:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",                    // 여기에 복사한 정보 입력
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

3. 파일을 저장합니다.

## 7. 초기 교사 계정 생성

첫 번째 교사 계정은 수동으로 생성해야 합니다:

### 방법 1: Firebase Console 사용 (권장)

1. Firebase Console의 **Authentication** > **Users** 탭으로 이동합니다.
2. "사용자 추가" 버튼을 클릭합니다.
3. 이메일과 비밀번호를 입력합니다 (예: `teacher@school.com`, `teacher123`).
4. "사용자 추가"를 클릭합니다.
5. 생성된 사용자의 **UID**를 복사합니다.

6. **Firestore Database**로 이동합니다.
7. **컬렉션 시작**을 클릭합니다.
8. 컬렉션 ID: `users` 입력 후 "다음"
9. 문서 ID: 복사한 UID 붙여넣기
10. 다음 필드를 추가합니다:
    - `email` (string): 교사 이메일
    - `name` (string): 교사 이름 (예: "백인규 교사")
    - `role` (string): **"teacher"** (매우 중요!)
    - `createdAt` (timestamp): 현재 시간 설정
    - `updatedAt` (timestamp): 현재 시간 설정

11. "저장" 버튼을 클릭합니다.

### 방법 2: 브라우저 콘솔 사용

1. 웹 브라우저에서 `login.html`을 엽니다.
2. 브라우저 개발자 도구(F12)를 엽니다.
3. Console 탭에서 다음 코드를 실행합니다:

```javascript
// 교사 계정 생성
const teacherEmail = "teacher@school.com";
const teacherPassword = "teacher123";  // 6자 이상
const teacherName = "백인규 교사";

auth.createUserWithEmailAndPassword(teacherEmail, teacherPassword)
  .then((userCredential) => {
    const uid = userCredential.user.uid;
    return db.collection('users').doc(uid).set({
      email: teacherEmail,
      name: teacherName,
      role: 'teacher',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  })
  .then(() => {
    console.log('교사 계정이 생성되었습니다!');
  })
  .catch((error) => {
    console.error('오류:', error);
  });
```

## 8. 테스트

1. 웹 브라우저에서 `login.html`을 엽니다.
2. **교사** 탭을 선택합니다.
3. 생성한 교사 이메일과 비밀번호로 로그인합니다.
4. 교사 대시보드로 이동하는지 확인합니다.
5. 대시보드에서 학생을 추가해봅니다.
6. 추가한 학생 계정으로 로그아웃 후 로그인해봅니다.
7. 메인 페이지가 표시되고 앱 클릭 시 통계가 기록되는지 확인합니다.

## 9. 주요 제한사항 및 개선사항

### 현재 구현의 제한사항

1. **비밀번호 초기화**: 현재 클라이언트 측에서는 다른 사용자의 비밀번호를 변경할 수 없습니다.
   - **해결 방법**: Firebase Admin SDK를 사용하는 Cloud Function 구현 필요

2. **사용자 삭제**: Firestore 데이터만 삭제되고 Authentication 계정은 수동 삭제 필요
   - **해결 방법**: Firebase Admin SDK를 사용하는 Cloud Function 구현 필요

### 권장 개선사항 (프로덕션 환경)

1. **Cloud Functions 구현**:
   ```javascript
   // functions/index.js
   const functions = require('firebase-functions');
   const admin = require('firebase-admin');
   admin.initializeApp();
   
   // 비밀번호 초기화
   exports.resetStudentPassword = functions.https.onCall(async (data, context) => {
     // 교사 권한 체크
     const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
     if (!callerDoc.exists || callerDoc.data().role !== 'teacher') {
       throw new functions.https.HttpsError('permission-denied', '권한이 없습니다.');
     }
     
     // 비밀번호 업데이트
     await admin.auth().updateUser(data.userId, {
       password: data.newPassword
     });
     
     return { success: true };
   });
   
   // 사용자 삭제
   exports.deleteStudent = functions.https.onCall(async (data, context) => {
     // 교사 권한 체크
     const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
     if (!callerDoc.exists || callerDoc.data().role !== 'teacher') {
       throw new functions.https.HttpsError('permission-denied', '권한이 없습니다.');
     }
     
     // Authentication에서 삭제
     await admin.auth().deleteUser(data.userId);
     
     // Firestore에서 삭제
     await admin.firestore().collection('users').doc(data.userId).delete();
     
     return { success: true };
   });
   ```

2. **HTTPS 강제**: Firebase Hosting으로 배포 시 자동 HTTPS 적용

3. **이메일 인증**: 학생 계정 생성 시 이메일 인증 추가

4. **비밀번호 복잡도**: Firebase Authentication 설정에서 비밀번호 정책 강화

## 10. 로컬 개발 서버 실행

Firebase 에뮬레이터를 사용하여 로컬에서 테스트할 수 있습니다:

```bash
# Firebase CLI 설치 (최초 1회)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 초기화
firebase init

# 에뮬레이터 실행
firebase emulators:start
```

## 11. 배포 (선택사항)

Firebase Hosting으로 배포:

```bash
# Firebase Hosting 초기화
firebase init hosting

# 배포
firebase deploy --only hosting
```

## 문제 해결

### 로그인이 안 될 때
- Firebase Console > Authentication에서 이메일/비밀번호 로그인이 활성화되었는지 확인
- `firebase-config.js`의 설정 정보가 정확한지 확인
- 브라우저 콘솔에서 에러 메시지 확인

### 데이터가 저장되지 않을 때
- Firestore 보안 규칙이 올바르게 설정되었는지 확인
- 사용자의 `role` 필드가 정확히 "student" 또는 "teacher"인지 확인

### 통계가 표시되지 않을 때
- 앱을 클릭한 후 교사 대시보드를 새로고침
- Firestore Database에서 `usage_logs` 컬렉션이 생성되었는지 확인

## 문의

문제가 발생하면 Firebase Console의 에러 로그와 브라우저 콘솔 로그를 확인하세요.
