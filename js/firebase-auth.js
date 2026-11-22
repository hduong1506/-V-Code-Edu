// V-CODE EDU — OAUTH THẬT (GOOGLE / FACEBOOK / GITHUB) QUA FIREBASE AUTHENTICATION
window.VCODE_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBJcl1zkrtRReiteKkErge12oh0FDi2LmA",
  authDomain: "v-code-edu.firebaseapp.com",
  projectId: "v-code-edu"
};

window.VCodeOAuth = {
  isConfigured() {
    return Boolean(window.VCODE_FIREBASE_CONFIG && window.VCODE_FIREBASE_CONFIG.apiKey && window.VCODE_FIREBASE_CONFIG.authDomain);
  },

  async signInWithProvider(providerName) {
    if (!this.isConfigured() || typeof firebase === 'undefined') {
      return { configured: false };
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(window.VCODE_FIREBASE_CONFIG);
    }
    let provider;
    if (providerName === 'google') provider = new firebase.auth.GoogleAuthProvider();
    else if (providerName === 'facebook') provider = new firebase.auth.FacebookAuthProvider();
    else provider = new firebase.auth.GithubAuthProvider();

    const result = await firebase.auth().signInWithPopup(provider);
    const u = result.user;
    return {
      configured: true,
      email: u.email || `${u.uid}@${providerName}.vcode.edu`,
      full_name: u.displayName || 'Thành viên V-Code Edu',
      avatar_url: u.photoURL || ''
    };
  }
};
