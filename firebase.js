// Import the functions you need from the SDKs you need
//import { initializeApp } from "firebase/app"; #260618
import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCq7cAd8UbdGNViwpK4mKfyJeGhT36Qspk",
  authDomain: "japantechdb.firebaseapp.com",
  projectId: "japantechdb",
  storageBucket: "japantechdb.firebasestorage.app",
  messagingSenderId: "1010120926525",
  appId: "1:1010120926525:web:f280a7850a70fea1a01154"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db, collection, addDoc };
