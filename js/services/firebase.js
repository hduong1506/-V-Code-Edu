// V-Code Edu — Firebase bootstrap (modular SDK via official gstatic CDN, same project as before).
// Loaded lazily so the rest of the app starts even when offline on a first visit.
import { FIREBASE_CONFIG, FIREBASE_SDK_BASE } from '../config.js';

let ready = null;

/** Lowercased email → Firestore document key. Identical to the legacy docKey() so existing data maps 1:1. */
export function emailKey(email) {
  return String(email || '').trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}

export function loadFirebase() {
  if (!ready) {
    ready = (async () => {
      const [appMod, authMod, fs] = await Promise.all([
        import(`${FIREBASE_SDK_BASE}/firebase-app.js`),
        import(`${FIREBASE_SDK_BASE}/firebase-auth.js`),
        import(`${FIREBASE_SDK_BASE}/firebase-firestore.js`),
      ]);
      const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
      const auth = authMod.getAuth(app);
      auth.languageCode = 'vi';
      let db;
      try {
        // Persistent cache: reads work offline, writes are queued and synced automatically when back online.
        db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
      } catch (err) {
        console.warn('[firebase] persistent cache unavailable, using memory cache:', err?.message);
        db = fs.getFirestore(app);
      }
      return { app, auth, db, A: authMod, fs };
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

/** Map Firebase error codes to friendly Vietnamese messages. */
export function firebaseErrorMessage(err) {
  const code = err?.code || '';
  const map = {
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/missing-password': 'Vui lòng nhập mật khẩu.',
    'auth/weak-password': 'Mật khẩu quá yếu — cần ít nhất 6 ký tự.',
    'auth/email-already-in-use': 'Email này đã được đăng ký. Hãy chuyển sang Đăng nhập.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/wrong-password': 'Email hoặc mật khẩu không đúng.',
    'auth/user-not-found': 'Email hoặc mật khẩu không đúng.',
    'auth/user-disabled': 'Tài khoản này đã bị vô hiệu hóa.',
    'auth/too-many-requests': 'Bạn thử quá nhiều lần. Hãy đợi vài phút rồi thử lại.',
    'auth/network-request-failed': 'Không kết nối được máy chủ xác thực. Kiểm tra Internet rồi thử lại.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.',
    'auth/cancelled-popup-request': 'Yêu cầu đăng nhập đã bị hủy.',
    'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập.',
    'auth/operation-not-allowed': 'Phương thức đăng nhập này chưa được bật trong Firebase Console (Authentication → Sign-in method).',
    'auth/requires-recent-login': 'Vì lý do bảo mật, hãy đăng nhập lại rồi thực hiện thao tác này.',
    'auth/user-token-expired': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    'auth/unauthorized-domain': 'Tên miền hiện tại chưa được cho phép trong Firebase Console (Authentication → Settings → Authorized domains).',
    'auth/account-exists-with-different-credential': 'Email này đã đăng ký bằng phương thức khác. Hãy đăng nhập bằng phương thức đó.',
    'permission-denied': 'Bạn không có quyền thực hiện thao tác này.',
    unavailable: 'Máy chủ dữ liệu tạm thời không truy cập được. Dữ liệu sẽ được đồng bộ khi có mạng.',
    'not-found': 'Không tìm thấy dữ liệu.',
  };
  if (map[code]) return map[code];
  if (/Failed to fetch|dynamically imported module|NetworkError/i.test(err?.message || '')) {
    return 'Không tải được dịch vụ Firebase (có thể bạn đang ngoại tuyến). Tính năng học offline vẫn dùng được.';
  }
  return err?.message || 'Đã xảy ra lỗi không xác định.';
}
