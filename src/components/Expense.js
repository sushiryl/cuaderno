import React, { useState } from "react";
import { db } from "./firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

const Expense = ({ onSubmit, onBack }) => {
  const [expenseForm, setExpenseForm] = useState({
    date: "",
    products: [{ name: "", price: "" }]
  });

  const handleExpenseSubmit = async () => {
    if (!expenseForm.date || expenseForm.products.some(p => !p.name || !p.price)) {
      alert("Por favor, complete todos los campos");
      return;
    }

    const formattedDate = new Date(expenseForm.date).toISOString().split("T")[0];
    const total = expenseForm.products.reduce((sum, p) => sum + parseFloat(p.price || 0), 0);

    try {
      await addDoc(collection(db, "gastos"), {
        date: formattedDate,
        products: expenseForm.products,
        total: total
      });
      alert("Gasto guardado en Firebase 🎉");
      setExpenseForm({ 
        date: "", 
        products: [{ name: "", price: "" }] 
      });
    } catch (error) {
      console.error("Error al guardar en Firebase:", error);
    }
  };

  const addProduct = () => {
    setExpenseForm({
      ...expenseForm,
      products: [...expenseForm.products, { name: "", price: "" }]
    });
  };

  const removeProduct = (index) => {
    if (expenseForm.products.length > 1) {
      const newProducts = expenseForm.products.filter((_, i) => i !== index);
      setExpenseForm({
        ...expenseForm,
        products: newProducts
      });
    }
  };

  return (
    <div className="container">
      <h2>Registrar Gastos</h2>
      
      <div className="form-group">
        <label>Fecha:</label>
        <input
          type="date"
          value={expenseForm.date}
          onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
        />
      </div>

      {expenseForm.products.map((product, index) => (
        <div key={index} className="product-row">
          <input
            type="text"
            placeholder="Producto"
            value={product.name}
            onChange={(e) => {
              const newProducts = [...expenseForm.products];
              newProducts[index].name = e.target.value;
              setExpenseForm({ ...expenseForm, products: newProducts });
            }}
          />
          <input
            type="number"
            placeholder="Precio"
            value={product.price}
            onChange={(e) => {
              const newProducts = [...expenseForm.products];
              newProducts[index].price = e.target.value;
              setExpenseForm({ ...expenseForm, products: newProducts });
            }}
          />
          {expenseForm.products.length > 1 && (
            <button 
              onClick={() => removeProduct(index)}
              className="remove-button"
            >
              ✖
            </button>
          )}
        </div>
      ))}

      <button onClick={addProduct} className="add-button">
        + Agregar Producto
      </button>

      <div className="button-group">
        <button onClick={handleExpenseSubmit} className="save-button">
          Guardar
        </button>
        <button onClick={onBack} className="back-button">
          Volver al Menú Principal
        </button>
      </div>

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 600px;
          margin: 0 auto;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
        }

        .product-row {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
          align-items: center;
        }

        input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        input[type="text"] {
          flex: 2;
        }

        input[type="number"] {
          flex: 1;
        }

        .remove-button {
          padding: 8px 12px;
          background-color: #ff4444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .add-button {
          margin-top: 10px;
          padding: 8px 16px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          width: 100%;
        }

        .button-group {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }

        .save-button, .back-button {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .save-button {
          background-color: #007bff;
          color: white;
        }

        .back-button {
          background-color: #6c757d;
          color: white;
        }

        button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default Expense;