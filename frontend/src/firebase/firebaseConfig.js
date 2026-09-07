import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBfNUof5H-8Jzc6qBkyCaiwudb9o7cMx98",
  authDomain: "buscaqroo.firebaseapp.com",
  projectId: "buscaqroo",
  storageBucket: "buscaqroo.firebasestorage.app",
  messagingSenderId: "118325519509",
  appId: "1:118325519509:web:f14b3e1720e5db0bd0679c",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;