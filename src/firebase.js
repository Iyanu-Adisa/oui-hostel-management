// Import the functions we need from Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your exact web app's Firebase configuration keys
const firebaseConfig = {
  apiKey: "AIzaSyAfAhJTqnLqGd-0g80bkAnl4DgBRyoCCtE",
  authDomain: "oui-hostel-mangement-system.firebaseapp.com",
  projectId: "oui-hostel-mangement-system",
  storageBucket: "oui-hostel-mangement-system.firebasestorage.app",
  messagingSenderId: "303551008769",
  appId: "1:303551008769:web:a7dc806927d9f34609f000",
};

// 1. Initialize the Firebase app
const app = initializeApp(firebaseConfig);

// 2. Turn on the "Security Guard" (Authentication)
export const auth = getAuth(app);

// 3. Turn on the "Receptionist" (Database)
export const db = getFirestore(app);
