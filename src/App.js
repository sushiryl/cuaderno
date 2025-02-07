import React, { useState, useEffect } from 'react';
import './App.css';
import { db } from './components/firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import Income from './components/Income';
import Expense from './components/Expense';
import Historial from './components/historial';

function App() {
  const [view, setView] = useState("main");
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    console.log('Iniciando fetch de transacciones en App.js...');
    
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    console.log('Query creado');
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Snapshot recibido:', snapshot.size, 'documentos');
      
      const fetchedTransactions = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Documento:', doc.id, data);
        return { 
          id: doc.id, 
          ...data 
        };
      });
      
      console.log('Transacciones procesadas:', fetchedTransactions);
      setTransactions(fetchedTransactions);
    }, (error) => {
      console.error('Error en snapshot:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleTransactionSubmit = async (newTransaction) => {
    try {
      console.log('Guardando nueva transacción:', newTransaction);
      await addDoc(collection(db, 'transactions'), newTransaction);
      setView("main");
    } catch (error) {
      console.error("Error al guardar la transacción: ", error);
    }
  };


  const handleBackToMain = () => {
    setView("main");
  };

  const renderMainView = () => (
    <div className="container">
      <h2>Menú Principal</h2>
      <div className="button-container">
        <button className="income-button" onClick={() => setView("income")}>
          Registrar Ganancias
        </button>
        <button className="expense-button" onClick={() => setView("expenses")}>
          Registrar Gastos
        </button>
        <button className="history-button" onClick={() => setView("dates")}>
          Ver Historial
        </button>
      </div>
    </div>
  );

  return (
    <div className="App">
      {view === "main" && renderMainView()}
      {view === "income" && <Income onSubmit={handleTransactionSubmit} onBack={() => setView("main")} />}
      {view === "expenses" && <Expense onSubmit={handleTransactionSubmit} onBack={() => setView("main")} />}
      {view === "dates" && (
        <Historial 
          onBack={handleBackToMain} 
          transactions={transactions} 
        />
      )}
    </div>
  );
}

export default App;