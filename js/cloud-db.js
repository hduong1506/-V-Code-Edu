// V-CODE EDU v15.0 — CLOUD DATABASE ENGINE (FIREBASE FIRESTORE REAL-TIME + FASTAPI + LOCAL CACHE)
window.VCodeCloudDB = {
  _db: null,

  isReady() {
    const cfg = window.VCODE_FIREBASE_CONFIG;
    return Boolean(cfg && cfg.apiKey && cfg.projectId && typeof firebase !== 'undefined' && firebase.firestore);
  },

  db() {
    if (!this.isReady()) return null;
    if (!firebase.apps.length) firebase.initializeApp(window.VCODE_FIREBASE_CONFIG);
    if (!this._db) {
      this._db = firebase.firestore();
      try { this._db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch {}
    }
    return this._db;
  },

  docKey(email) {
    return String(email || '').trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  },

  async hashPass(str) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vcode_salt_2026_' + str));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return btoa(unescape(encodeURIComponent('vc_' + str)));
    }
  },

  async getUser(email) {
    const fdb = this.db();
    if (!fdb) return null;
    const snap = await fdb.collection('users').doc(this.docKey(email)).get();
    return snap.exists ? snap.data() : null;
  },

  async saveUser(userObj) {
    const fdb = this.db();
    if (!fdb || !userObj?.email) return false;
    await fdb.collection('users').doc(this.docKey(userObj.email)).set({ ...userObj, updated_at: Date.now() }, { merge: true });
    return true;
  },

  async createClass(clsObj) {
    const fdb = this.db();
    if (!fdb) return false;
    await fdb.collection('classrooms').doc(clsObj.code).set({ ...clsObj, created_at: Date.now() });
    return true;
  },

  async getClass(code) {
    const fdb = this.db();
    if (!fdb) return null;
    const snap = await fdb.collection('classrooms').doc(code.trim().toUpperCase()).get();
    return snap.exists ? snap.data() : null;
  },

  async listTeacherClasses(teacherEmail) {
    const fdb = this.db();
    if (!fdb) return null;
    const snap = await fdb.collection('classrooms').where('teacher_email', '==', teacherEmail.toLowerCase()).get();
    return snap.docs.map((d) => d.data()).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  },

  async listStudentClasses(studentEmail) {
    const fdb = this.db();
    if (!fdb) return null;
    const snap = await fdb.collection('classrooms').where('student_emails', 'array-contains', studentEmail.toLowerCase()).get();
    return snap.docs.map((d) => d.data());
  },

  async joinClass(code, student) {
    const fdb = this.db();
    if (!fdb) return null;
    const ref = fdb.collection('classrooms').doc(code.trim().toUpperCase());
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`Không tìm thấy lớp học với mã '${code}'. Hãy kiểm tra lại mã thầy/cô gửi!`);
    const data = snap.data();
    const emails = Array.isArray(data.student_emails) ? data.student_emails : [];
    const students = Array.isArray(data.students) ? data.students : [];
    const emailLow = student.email.toLowerCase();
    if (!emails.includes(emailLow)) {
      emails.push(emailLow);
      students.push({ username: student.username, full_name: student.full_name, email: emailLow, xp: student.xp || 100, joined_at: Date.now() });
      await ref.update({ student_emails: emails, students });
    }
    return { ...data, student_emails: emails, students };
  },

  async updateClass(code, patchObj) {
    const fdb = this.db();
    if (!fdb) return false;
    await fdb.collection('classrooms').doc(code.trim().toUpperCase()).update(patchObj);
    return true;
  },

  async deleteClass(code) {
    const fdb = this.db();
    if (!fdb) return false;
    await fdb.collection('classrooms').doc(code.trim().toUpperCase()).delete();
    return true;
  }
};
