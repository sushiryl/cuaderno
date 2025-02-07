import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAo9NL9cwWemTzI3O7YvXKReeZhw_wvE3c",
  authDomain: "cuaderno-66757.firebaseapp.com",
  projectId: "cuaderno-66757",
  storageBucket: "cuaderno-66757.appspot.com",  // ← ¡Corrección aquí!
  messagingSenderId: "939431109067",
  appId: "1:939431109067:web:de03a43e43ee0da4fd564e",
  measurementId: "G-SD1PQ89H5G"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
 
// Inicializa Firestore
const db = getFirestore(app);

export { db, collection, addDoc };
