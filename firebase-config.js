// ===========================
// Firebase Configuration
// ===========================
// Firebase 프로젝트 설정 정보

const firebaseConfig = {
    apiKey: "AIzaSyCWO1MU3WLZi-a45eM6y-EeMdG75d40M8I",
    authDomain: "ingyu-s-ai-world.firebaseapp.com",
    projectId: "ingyu-s-ai-world",
    storageBucket: "ingyu-s-ai-world.firebasestorage.app",
    messagingSenderId: "405546094718",
    appId: "1:405546094718:web:c2b8d8caa5481a4c10082f",
    measurementId: "G-T1RB7WDPB6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other files
window.auth = auth;
window.db = db;

console.log('Firebase initialized successfully');
