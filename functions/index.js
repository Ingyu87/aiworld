const crypto = require('crypto');
const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp();

const db = admin.firestore();
const STUDENT_EMAIL_DOMAIN = 'ingyu-ai-world.com';
const DEFAULT_TEACHER_EMAIL = 'teacher@ingyu-ai-world.com';
const PIN_HASH_ITERATIONS = 120000;
const PIN_HASH_KEY_LENGTH = 32;
const PIN_HASH_DIGEST = 'sha256';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeStudentEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new functions.https.HttpsError('invalid-argument', '아이디를 입력해주세요.');
  }
  return normalized.includes('@') ? normalized : `${normalized}@${STUDENT_EMAIL_DOMAIN}`;
}

function normalizeClassCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

function assertFourDigitPin(pin) {
  if (!/^\d{4}$/.test(String(pin || ''))) {
    throw new functions.https.HttpsError('invalid-argument', '비밀번호는 숫자 4자리여야 합니다.');
  }
}

function createPinHash(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(String(pin), salt, PIN_HASH_ITERATIONS, PIN_HASH_KEY_LENGTH, PIN_HASH_DIGEST)
    .toString('hex');
  return { salt, hash };
}

function verifyPin(pin, salt, expectedHash) {
  if (!salt || !expectedHash) return false;
  const actualHash = crypto
    .pbkdf2Sync(String(pin), salt, PIN_HASH_ITERATIONS, PIN_HASH_KEY_LENGTH, PIN_HASH_DIGEST)
    .toString('hex');
  const actual = Buffer.from(actualHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function generateClassCode(seed = 'CLASS') {
  const cleanSeed = String(seed || 'CLASS')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5) || 'CLASS';
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${cleanSeed}-${suffix}`;
}

function appApprovalId(classId, appTitle) {
  const digest = crypto.createHash('sha1').update(String(appTitle)).digest('hex').slice(0, 16);
  return `${classId}_${digest}`;
}

async function getUserDoc(uid) {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', '사용자 정보를 찾을 수 없습니다.');
  }
  return userDoc;
}

async function assertTeacher(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  const teacherDoc = await getUserDoc(context.auth.uid);
  if (teacherDoc.get('role') !== 'teacher' || teacherDoc.get('approved') === false) {
    throw new functions.https.HttpsError('permission-denied', '교사 권한이 필요합니다.');
  }
  return teacherDoc;
}

async function assertAdmin(context) {
  const userDoc = await assertTeacher(context);
  if (userDoc.get('isAdmin') === true) return userDoc;

  const authUser = await admin.auth().getUser(context.auth.uid);
  if (normalizeEmail(authUser.email) === DEFAULT_TEACHER_EMAIL) return userDoc;

  throw new functions.https.HttpsError('permission-denied', '관리자 권한이 필요합니다.');
}

async function findStudentByEmail(email) {
  const snapshot = await db.collection('users')
    .where('email', '==', email)
    .where('role', '==', 'student')
    .limit(1)
    .get();
  return snapshot.empty ? null : snapshot.docs[0];
}

async function findClassByCode(classCode) {
  const code = normalizeClassCode(classCode);
  if (!code) {
    throw new functions.https.HttpsError('invalid-argument', '반 코드를 입력해주세요.');
  }

  const snapshot = await db.collection('classes')
    .where('classCode', '==', code)
    .where('isActive', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new functions.https.HttpsError('not-found', '유효한 반 코드를 찾을 수 없습니다.');
  }

  return snapshot.docs[0];
}

async function ensureDefaultClassForTeacher(teacherUid, teacherData = {}) {
  const teacherRef = db.collection('users').doc(teacherUid);
  const freshTeacherDoc = await teacherRef.get();
  const freshTeacher = freshTeacherDoc.exists ? freshTeacherDoc.data() : teacherData;

  if (freshTeacher.defaultClassId) {
    const classDoc = await db.collection('classes').doc(freshTeacher.defaultClassId).get();
    if (classDoc.exists) {
      return { id: classDoc.id, ...classDoc.data() };
    }
  }

  const classRef = db.collection('classes').doc();
  const teacherName = freshTeacher.name || freshTeacher.displayName || 'Teacher';
  let classCode = generateClassCode(teacherName);
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db.collection('classes').where('classCode', '==', classCode).limit(1).get();
    if (existing.empty) break;
    classCode = generateClassCode(teacherName);
    attempts += 1;
  }

  const classData = {
    teacherId: teacherUid,
    className: `${teacherName} 반`,
    classCode,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const batch = db.batch();
  batch.set(classRef, classData);
  batch.set(teacherRef, {
    defaultClassId: classRef.id,
    defaultClassCode: classCode,
    approved: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  await batch.commit();

  return { id: classRef.id, ...classData };
}

async function resolveClassForStudent({ classCode, teacherUid }) {
  if (classCode) {
    const classDoc = await findClassByCode(classCode);
    return { id: classDoc.id, ...classDoc.data(), classCodeUsed: normalizeClassCode(classCode) };
  }

  if (teacherUid) {
    const teacherDoc = await db.collection('users').doc(teacherUid).get();
    if (!teacherDoc.exists || teacherDoc.get('role') !== 'teacher') {
      throw new functions.https.HttpsError('not-found', '교사 정보를 찾을 수 없습니다.');
    }
    const classInfo = await ensureDefaultClassForTeacher(teacherUid, teacherDoc.data());
    return { ...classInfo, classCodeUsed: classInfo.classCode };
  }

  throw new functions.https.HttpsError('invalid-argument', '반 코드가 필요합니다.');
}

async function createStudent({ email, name, pin, classCode, teacherUid }) {
  const studentEmail = normalizeStudentEmail(email);
  assertFourDigitPin(pin);

  const existingStudent = await findStudentByEmail(studentEmail);
  if (existingStudent) {
    throw new functions.https.HttpsError('already-exists', '이미 사용 중인 아이디입니다.');
  }

  const classInfo = await resolveClassForStudent({ classCode, teacherUid });
  const { salt, hash } = createPinHash(pin);
  const randomPassword = crypto.randomBytes(24).toString('base64url');
  const displayName = String(name || studentEmail).trim();
  const userRecord = await admin.auth().createUser({
    email: studentEmail,
    password: randomPassword,
    displayName
  });

  await db.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    email: studentEmail,
    name: displayName,
    role: 'student',
    teacherId: classInfo.teacherId,
    classId: classInfo.id,
    classCodeUsed: classInfo.classCodeUsed,
    pinSalt: salt,
    pinHash: hash,
    pinHashVersion: 1,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { uid: userRecord.uid, teacherId: classInfo.teacherId, classId: classInfo.id };
}

exports.signupStudent = functions.https.onCall(async (data) => {
  return createStudent(data || {});
});

exports.createStudentByTeacher = functions.https.onCall(async (data, context) => {
  const teacherDoc = await assertTeacher(context);
  const classInfo = await ensureDefaultClassForTeacher(context.auth.uid, teacherDoc.data());
  return createStudent({ ...(data || {}), teacherUid: context.auth.uid, classCode: data && data.classCode || classInfo.classCode });
});

exports.verifyStudentPin = functions.https.onCall(async (data) => {
  const email = normalizeStudentEmail(data && data.email);
  const pin = data && data.pin;
  assertFourDigitPin(pin);

  const studentDoc = await findStudentByEmail(email);
  if (!studentDoc) {
    throw new functions.https.HttpsError('not-found', '등록되지 않은 학생입니다.');
  }

  const student = studentDoc.data();
  let pinMatches = verifyPin(pin, student.pinSalt, student.pinHash);

  if (!pinMatches && student.simplePassword && student.simplePassword === pin) {
    const { salt, hash } = createPinHash(pin);
    await studentDoc.ref.update({
      pinSalt: salt,
      pinHash: hash,
      pinHashVersion: 1,
      simplePassword: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    pinMatches = true;
  }

  if (!pinMatches) {
    throw new functions.https.HttpsError('permission-denied', '비밀번호가 올바르지 않습니다.');
  }

  await studentDoc.ref.update({
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    loginCount: admin.firestore.FieldValue.increment(1)
  });

  const token = await admin.auth().createCustomToken(studentDoc.id, {
    role: 'student',
    teacherId: student.teacherId || null,
    classId: student.classId || null
  });
  return { token, uid: studentDoc.id };
});

exports.updateStudentPin = functions.https.onCall(async (data, context) => {
  await assertTeacher(context);

  const uid = String(data && data.uid || '').trim();
  const pin = data && data.pin;
  assertFourDigitPin(pin);

  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', '학생 UID가 필요합니다.');
  }

  const studentRef = db.collection('users').doc(uid);
  const studentDoc = await studentRef.get();
  if (!studentDoc.exists || studentDoc.get('role') !== 'student') {
    throw new functions.https.HttpsError('not-found', '학생을 찾을 수 없습니다.');
  }
  if (studentDoc.get('teacherId') && studentDoc.get('teacherId') !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', '내 반 학생만 변경할 수 있습니다.');
  }

  const { salt, hash } = createPinHash(pin);
  await studentRef.update({
    pinSalt: salt,
    pinHash: hash,
    pinHashVersion: 1,
    simplePassword: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { ok: true };
});

exports.deleteStudentAccount = functions.https.onCall(async (data, context) => {
  await assertTeacher(context);

  const uid = String(data && data.uid || '').trim();
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', '학생 UID가 필요합니다.');
  }

  const studentRef = db.collection('users').doc(uid);
  const studentDoc = await studentRef.get();
  if (!studentDoc.exists || studentDoc.get('role') !== 'student') {
    throw new functions.https.HttpsError('not-found', '학생을 찾을 수 없습니다.');
  }
  if (studentDoc.get('teacherId') && studentDoc.get('teacherId') !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', '내 반 학생만 삭제할 수 있습니다.');
  }

  const logsSnapshot = await db.collection('usage_logs').where('userId', '==', uid).get();
  const emotionsSnapshot = await db.collection('emotional_checkins').where('userId', '==', uid).get();
  const batch = db.batch();
  logsSnapshot.forEach(doc => batch.delete(doc.ref));
  emotionsSnapshot.forEach(doc => batch.delete(doc.ref));
  batch.delete(studentRef);
  await batch.commit();

  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }

  return { ok: true };
});

exports.createDefaultClassForTeacher = functions.https.onCall(async (data, context) => {
  const requesterDoc = await assertTeacher(context);
  const requestedTeacherUid = String(data && data.teacherUid || context.auth.uid).trim();
  if (requestedTeacherUid !== context.auth.uid) {
    await assertAdmin(context);
  }
  const teacherDoc = requestedTeacherUid === context.auth.uid
    ? requesterDoc
    : await db.collection('users').doc(requestedTeacherUid).get();
  if (!teacherDoc.exists || teacherDoc.get('role') !== 'teacher') {
    throw new functions.https.HttpsError('not-found', '교사를 찾을 수 없습니다.');
  }
  const classInfo = await ensureDefaultClassForTeacher(requestedTeacherUid, teacherDoc.data());
  return { classId: classInfo.id, classCode: classInfo.classCode };
});

exports.rotateClassCode = functions.https.onCall(async (data, context) => {
  const teacherDoc = await assertTeacher(context);
  const classId = String(data && data.classId || teacherDoc.get('defaultClassId') || '').trim();
  if (!classId) {
    throw new functions.https.HttpsError('invalid-argument', '반 정보가 필요합니다.');
  }

  const classRef = db.collection('classes').doc(classId);
  const classDoc = await classRef.get();
  if (!classDoc.exists || classDoc.get('teacherId') !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', '내 반 코드만 변경할 수 있습니다.');
  }

  const newCode = generateClassCode(teacherDoc.get('name') || teacherDoc.get('displayName') || 'CLASS');
  await classRef.update({
    classCode: newCode,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  await db.collection('users').doc(context.auth.uid).set({
    defaultClassCode: newCode,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return { classId, classCode: newCode };
});

exports.requestTeacherSignup = functions.https.onCall(async (data) => {
  const email = normalizeEmail(data && data.email);
  const displayName = String(data && data.displayName || '').trim();
  const schoolName = String(data && data.schoolName || '').trim();
  if (!email || !displayName) {
    throw new functions.https.HttpsError('invalid-argument', '교사 이름과 이메일이 필요합니다.');
  }

  const requestRef = await db.collection('teacher_requests').add({
    email,
    displayName,
    schoolName,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { requestId: requestRef.id };
});

exports.approveTeacher = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);

  const requestId = String(data && data.requestId || '').trim();
  const temporaryPassword = String(data && data.temporaryPassword || '').trim();
  if (!requestId || temporaryPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', '요청 ID와 6자리 이상 임시 비밀번호가 필요합니다.');
  }

  const requestRef = db.collection('teacher_requests').doc(requestId);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists || requestDoc.get('status') !== 'pending') {
    throw new functions.https.HttpsError('not-found', '승인 대기 중인 교사 요청을 찾을 수 없습니다.');
  }

  const request = requestDoc.data();
  const userRecord = await admin.auth().createUser({
    email: request.email,
    password: temporaryPassword,
    displayName: request.displayName
  });

  await db.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    email: request.email,
    name: request.displayName,
    displayName: request.displayName,
    schoolName: request.schoolName || '',
    role: 'teacher',
    approved: true,
    isAdmin: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  const classInfo = await ensureDefaultClassForTeacher(userRecord.uid, {
    name: request.displayName,
    displayName: request.displayName
  });
  await requestRef.update({
    status: 'approved',
    approvedBy: context.auth.uid,
    teacherUid: userRecord.uid,
    classId: classInfo.id,
    classCode: classInfo.classCode,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { teacherUid: userRecord.uid, classId: classInfo.id, classCode: classInfo.classCode };
});

exports.migrateExistingStudentsToDefaultClass = functions.https.onCall(async (data, context) => {
  const teacherDoc = await assertTeacher(context);
  const classInfo = await ensureDefaultClassForTeacher(context.auth.uid, teacherDoc.data());

  const snapshot = await db.collection('users')
    .where('role', '==', 'student')
    .get();

  let updated = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const student = doc.data();
    if (student.teacherId && student.classId) continue;

    batch.update(doc.ref, {
      teacherId: context.auth.uid,
      classId: classInfo.id,
      classCodeUsed: classInfo.classCode,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    updated += 1;
    batchCount += 1;

    if (batchCount === 450) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { updated, classId: classInfo.id, classCode: classInfo.classCode };
});

exports.setClassAppApproval = functions.https.onCall(async (data, context) => {
  const teacherDoc = await assertTeacher(context);
  const classId = String(data && data.classId || teacherDoc.get('defaultClassId') || '').trim();
  const appTitle = String(data && data.appTitle || '').trim();
  const category = String(data && data.category || '').trim();
  const isApproved = data && data.isApproved === true;
  if (!classId || !appTitle) {
    throw new functions.https.HttpsError('invalid-argument', '반과 앱 정보가 필요합니다.');
  }

  const classDoc = await db.collection('classes').doc(classId).get();
  if (!classDoc.exists || classDoc.get('teacherId') !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', '내 반 앱 승인만 변경할 수 있습니다.');
  }

  const id = appApprovalId(classId, appTitle);
  await db.collection('class_app_approvals').doc(id).set({
    classId,
    teacherId: context.auth.uid,
    appTitle,
    category,
    isApproved,
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedBy: context.auth.uid
  }, { merge: true });
  return { ok: true, id };
});
