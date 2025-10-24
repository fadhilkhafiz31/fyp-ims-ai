import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// your config (✅ same one you used)
const firebaseConfig = {
  apiKey: "AIzaSyBt6Es1l-WNPM3Ss8mjwI1t4X1bbnKiVzs",
  authDomain: "ims-ai-821f0.firebaseapp.com",
  projectId: "ims-ai-821f0",
  storageBucket: "ims-ai-821f0.appspot.com",
  messagingSenderId: "601293142427",
  appId: "1:601293142427:web:0a6ae66714d8145ec0893e",
  measurementId: "G-8YNLJ61C6C"
};

// initialize Firebase app
const app = initializeApp(firebaseConfig);

// export reusable instances
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ define and export login + logout helpers
export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}
