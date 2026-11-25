
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyCy9LKRZHL1RK-3Kl2NY2k6xYkxk7YJX64",
    authDomain: "maum-gyeol.firebaseapp.com",
    projectId: "maum-gyeol",
    storageBucket: "maum-gyeol.firebasestorage.app",
    messagingSenderId: "811119001894",
    appId: "1:811119001894:web:be5e5626ad6d2f26b681e7"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 연결
const db = getFirestore(app);

export { app, db };
