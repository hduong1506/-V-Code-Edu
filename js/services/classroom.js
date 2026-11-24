// V-Code Edu — classroom service (Firestore). Permissions are enforced server-side by firestore.rules.
// Data model (v2): classrooms/{CODE} + subcollections assignments, submissions, presence, messages.
// Legacy classes (arrays embedded in the class document) are migrated by the owning teacher on open.
import { firestore } from './auth.js';
import { emailKey } from './firebase.js';
import { appState } from '../core/store.js';
import { throttle } from '../core/dom.js';

function me() {
  const u = appState.get().user;
  if (!u) throw new Error('Bạn cần đăng nhập để dùng lớp học.');
  return u;
}

function normCode(code) {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `VC${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
}

// ---------- roles ----------
export async function chooseRole(role, { school_name = '', class_name = '' } = {}) {
  const u = me();
  if (!['teacher', 'student'].includes(role)) throw new Error('Vai trò không hợp lệ.');
  const { db, fs } = await firestore();
  await fs.updateDoc(fs.doc(db, 'users', u.key), { role, school_name: school_name.trim().slice(0, 120), class_name: class_name.trim().slice(0, 40), updated_at: fs.serverTimestamp() });
}

// ---------- classes ----------
export async function listMyClasses() {
  const u = me();
  const { db, fs } = await firestore();
  const col = fs.collection(db, 'classrooms');
  const q = u.role === 'teacher' || u.role === 'admin'
    ? fs.query(col, fs.where('teacher_email', '==', u.key))
    : fs.query(col, fs.where('student_emails', 'array-contains', u.key));
  const snap = await fs.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => toMs(b.created_at) - toMs(a.created_at));
}

function toMs(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  return 0;
}

export async function createClass({ name, grade_subject = '', description = '' }) {
  const u = me();
  const { db, fs } = await firestore();
  let code = randomCode();
  for (let i = 0; i < 5; i++) {
    const exists = await fs.getDoc(fs.doc(db, 'classrooms', code)).then((s) => s.exists()).catch(() => false);
    if (!exists) break;
    code = randomCode();
  }
  const data = {
    code,
    name: String(name).trim().slice(0, 120),
    grade_subject: String(grade_subject).trim().slice(0, 80),
    description: String(description).trim().slice(0, 1000),
    teacher_email: u.key,
    teacher_name: u.displayName,
    student_emails: [],
    students: [],
    schema: 2,
    created_at: fs.serverTimestamp(),
  };
  await fs.setDoc(fs.doc(db, 'classrooms', code), data);
  return { ...data, created_at: Date.now() };
}

export async function getClass(code) {
  const { db, fs } = await firestore();
  const snap = await fs.getDoc(fs.doc(db, 'classrooms', normCode(code)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function watchClass(code, cb, onError) {
  const { db, fs } = await firestore();
  return fs.onSnapshot(fs.doc(db, 'classrooms', normCode(code)), (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null), onError);
}

export async function updateClass(code, patch) {
  const { db, fs } = await firestore();
  const allowed = {};
  for (const k of ['name', 'grade_subject', 'description']) if (patch[k] !== undefined) allowed[k] = String(patch[k]).trim().slice(0, k === 'description' ? 1000 : 120);
  await fs.updateDoc(fs.doc(db, 'classrooms', normCode(code)), allowed);
}

export async function deleteClass(code) {
  const { db, fs } = await firestore();
  const c = normCode(code);
  for (const sub of ['assignments', 'submissions', 'presence', 'messages']) {
    const snap = await fs.getDocs(fs.collection(db, 'classrooms', c, sub));
    let batch = fs.writeBatch(db);
    let n = 0;
    for (const d of snap.docs) {
      batch.delete(d.ref);
      if (++n % 400 === 0) { await batch.commit(); batch = fs.writeBatch(db); }
    }
    await batch.commit();
  }
  await fs.deleteDoc(fs.doc(db, 'classrooms', c));
}

export async function joinClass(code) {
  const u = me();
  const { db, fs } = await firestore();
  const c = normCode(code);
  const ref = fs.doc(db, 'classrooms', c);
  const snap = await fs.getDoc(ref);
  if (!snap.exists()) throw new Error(`Không tìm thấy lớp có mã "${c}". Hãy kiểm tra lại mã thầy/cô gửi.`);
  const data = snap.data();
  if (data.teacher_email === u.key) throw new Error('Bạn là giáo viên của lớp này.');
  if ((data.student_emails || []).includes(u.key)) return { id: c, ...data, alreadyMember: true };
  await fs.updateDoc(ref, {
    student_emails: fs.arrayUnion(u.key),
    students: fs.arrayUnion({ email: u.key, full_name: u.displayName, joined_at: Date.now() }),
  });
  return { id: c, ...data };
}

export async function leaveClass(code) {
  const u = me();
  const { db, fs } = await firestore();
  const ref = fs.doc(db, 'classrooms', normCode(code));
  const snap = await fs.getDoc(ref);
  if (!snap.exists()) return;
  const mine = (snap.data().students || []).filter((s) => s.email === u.key);
  await fs.updateDoc(ref, { student_emails: fs.arrayRemove(u.key), ...(mine.length ? { students: fs.arrayRemove(...mine) } : {}) });
}

export async function removeStudent(code, studentKey) {
  const { db, fs } = await firestore();
  const ref = fs.doc(db, 'classrooms', normCode(code));
  const snap = await fs.getDoc(ref);
  if (!snap.exists()) return;
  const entries = (snap.data().students || []).filter((s) => s.email === studentKey);
  await fs.updateDoc(ref, { student_emails: fs.arrayRemove(studentKey), ...(entries.length ? { students: fs.arrayRemove(...entries) } : {}) });
}

// ---------- legacy migration (teacher only) ----------
export async function migrateLegacyClass(cls) {
  const hasLegacy = Array.isArray(cls.assignments) || Array.isArray(cls.submissions) || cls.live_sessions;
  if (!hasLegacy) return false;
  const u = me();
  if (cls.teacher_email !== u.key) return false;
  const { db, fs } = await firestore();
  const code = normCode(cls.code || cls.id);
  const batch = fs.writeBatch(db);
  for (const a of cls.assignments || []) {
    const id = String(a.id || a.code || `asg_${Math.random().toString(36).slice(2)}`).replace(/[/\s]/g, '_');
    batch.set(fs.doc(db, 'classrooms', code, 'assignments', id), {
      id, title: a.title || 'Bài tập', description: a.description || '', language: a.language || 'python',
      starter_code: a.starter_code || '', test_cases: Array.isArray(a.test_cases) ? a.test_cases : [],
      deadline_ts: Number(a.deadline_ts) || 0, points: 10, created_at: Number(a.created_at) || Date.now(), legacy: true,
    }, { merge: true });
  }
  for (const s of cls.submissions || []) {
    const aid = String(s.assignment_id || s.assignment_code || 'unknown').replace(/[/\s]/g, '_');
    const email = emailKey(s.email || s.username || '');
    if (!email) continue;
    batch.set(fs.doc(db, 'classrooms', code, 'submissions', `${aid}__${email}`), {
      assignment_id: aid, email, full_name: s.full_name || s.username || email, code: s.code || '',
      score: Number(s.score) || 0, passed: Number(s.passed) || 0, total: Number(s.total) || 0,
      submitted_at: Number(s.submitted_at) || Date.now(),
      ...(s.teacher_score !== undefined ? { teacher_score: Number(s.teacher_score), teacher_note: s.teacher_note || '', graded_at: Date.now() } : {}),
      legacy: true,
    }, { merge: true });
  }
  batch.update(fs.doc(db, 'classrooms', code), { assignments: fs.deleteField(), submissions: fs.deleteField(), live_sessions: fs.deleteField(), schema: 2 });
  await batch.commit();
  return true;
}

// ---------- assignments ----------
export async function watchAssignments(code, cb, onError) {
  const { db, fs } = await firestore();
  return fs.onSnapshot(fs.collection(db, 'classrooms', normCode(code), 'assignments'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.created_at || 0) - (a.created_at || 0)));
  }, onError);
}

export async function saveAssignment(code, a) {
  const { db, fs } = await firestore();
  const id = a.id || `asg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const data = {
    id,
    title: String(a.title).trim().slice(0, 160),
    description: String(a.description || '').slice(0, 8000),
    language: a.language || 'python',
    starter_code: String(a.starter_code || '').slice(0, 20000),
    test_cases: (a.test_cases || []).slice(0, 20).map((t) => ({ input: String(t.input ?? ''), expected: String(t.expected ?? ''), hidden: Boolean(t.hidden) })),
    deadline_ts: Number(a.deadline_ts) || 0,
    points: 10,
    created_at: a.created_at || Date.now(),
    updated_at: Date.now(),
  };
  await fs.setDoc(fs.doc(db, 'classrooms', normCode(code), 'assignments', id), data);
  return data;
}

export async function deleteAssignment(code, id) {
  const { db, fs } = await firestore();
  const c = normCode(code);
  const subs = await fs.getDocs(fs.query(fs.collection(db, 'classrooms', c, 'submissions'), fs.where('assignment_id', '==', id)));
  const batch = fs.writeBatch(db);
  subs.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(fs.doc(db, 'classrooms', c, 'assignments', id));
  await batch.commit();
}

// ---------- submissions ----------
export async function submitAssignment(code, assignment, { source, score, passed, total }) {
  const u = me();
  const { db, fs } = await firestore();
  const sid = `${assignment.id}__${u.key}`;
  await fs.setDoc(fs.doc(db, 'classrooms', normCode(code), 'submissions', sid), {
    assignment_id: assignment.id, email: u.key, full_name: u.displayName,
    code: String(source).slice(0, 50000), score: Number(score) || 0, passed: Number(passed) || 0, total: Number(total) || 0,
    submitted_at: Date.now(),
  }, { merge: true });
}

/** Teacher: all submissions (live). Student: only own submissions (live). */
export async function watchSubmissions(code, { mine = false } = {}, cb, onError) {
  const { db, fs } = await firestore();
  const col = fs.collection(db, 'classrooms', normCode(code), 'submissions');
  const q = mine ? fs.query(col, fs.where('email', '==', me().key)) : col;
  return fs.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

export async function gradeSubmission(code, sid, { teacher_score, teacher_note }) {
  const { db, fs } = await firestore();
  const score = Math.max(0, Math.min(10, Number(teacher_score)));
  await fs.updateDoc(fs.doc(db, 'classrooms', normCode(code), 'submissions', sid), {
    teacher_score: Math.round(score * 100) / 100, teacher_note: String(teacher_note || '').slice(0, 2000), graded_at: Date.now(), graded_by: me().key,
  });
}

// ---------- presence ----------
export function createPresence(code) {
  const send = throttle(async (status, task) => {
    try {
      const u = me();
      const { db, fs } = await firestore();
      await fs.setDoc(fs.doc(db, 'classrooms', normCode(code), 'presence', u.key), { name: u.displayName, status, task: String(task || '').slice(0, 160), updated_at: Date.now() });
    } catch { /* offline: ignore */ }
  }, 15000);
  return { beat: (status, task) => send(status, task) };
}

export async function watchPresence(code, cb, onError) {
  const { db, fs } = await firestore();
  return fs.onSnapshot(fs.collection(db, 'classrooms', normCode(code), 'presence'), (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

// ---------- discussion ----------
export async function watchMessages(code, cb, onError) {
  const { db, fs } = await firestore();
  const q = fs.query(fs.collection(db, 'classrooms', normCode(code), 'messages'), fs.orderBy('created_at', 'desc'), fs.limit(100));
  return fs.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()), onError);
}

export async function postMessage(code, text) {
  const u = me();
  const { db, fs } = await firestore();
  const t = String(text).trim().slice(0, 2000);
  if (!t) return;
  await fs.addDoc(fs.collection(db, 'classrooms', normCode(code), 'messages'), { author_email: u.key, author_name: u.displayName, role: u.role, text: t, created_at: Date.now() });
}

export async function deleteMessage(code, id) {
  const { db, fs } = await firestore();
  await fs.deleteDoc(fs.doc(db, 'classrooms', normCode(code), 'messages', id));
}

// ---------- one-shot reads (dashboard summaries; additive helpers, same data layout) ----------
/** All assignments of a class (one read, newest first). */
export async function listAssignments(code) {
  const { db, fs } = await firestore();
  const snap = await fs.getDocs(fs.collection(db, 'classrooms', normCode(code), 'assignments'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}

/** Teacher: every submission of the class. Student: only their own (rules only allow that). */
export async function listSubmissions(code, { mine = false } = {}) {
  const { db, fs } = await firestore();
  const col = fs.collection(db, 'classrooms', normCode(code), 'submissions');
  const snap = await fs.getDocs(mine ? fs.query(col, fs.where('email', '==', me().key)) : col);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Duplicate an assignment (new id, fresh timestamps). */
export async function duplicateAssignment(code, a, { deadline_ts } = {}) {
  const { id, created_at, updated_at, legacy, ...rest } = a; // eslint-disable-line no-unused-vars
  return saveAssignment(code, { ...rest, title: `${a.title} (bản sao)`.slice(0, 160), deadline_ts: deadline_ts ?? a.deadline_ts ?? 0 });
}

export { normCode };
