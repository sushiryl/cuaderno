import React, { useState } from "react";
import { db } from "./firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

const Income = ({ onSubmit, onBack }) => {
  const [incomeForm, setIncomeForm] = useState({
    date: "",
    clientName: "",
    products: [{ name: "", price: "" }],
  });

  const handleIncomeSubmit = async () => {
    if (!incomeForm.date || !incomeForm.clientName || incomeForm.products.some(p => !p.name || !p.price)) {
      alert("Por favor, complete todos los campos");
      return;
    }

    const total = incomeForm.products.reduce((sum, p) => sum + parseFloat(p.price || 0), 0);
    const formattedDate = new Date(incomeForm.date).toISOString().split("T")[0];

    try {
      await addDoc(collection(db, "ingresos"), {
        date: formattedDate,
        clientName: incomeForm.clientName,
        products: incomeForm.products,
        total,
      });
      alert("Ingreso guardado en Firebase 🎉");
      setIncomeForm({ 
        date: "", 
        clientName: "",
        products: [{ name: "", price: "" }] 
      });
    } catch (error) {
      console.error("Error al guardar en Firebase:", error);
    }
  };

  const addProduct = () => {
    setIncomeForm({
      ...incomeForm,
      products: [...incomeForm.products, { name: "", price: "" }]
    });
  };

  const removeProduct = (index) => {
    if (incomeForm.products.length > 1) {
      const newProducts = incomeForm.products.filter((_, i) => i !== index);
      setIncomeForm({
        ...incomeForm,
        products: newProducts
      });
    }
  };

  return (
    <div className="container">
      <h2>Registrar Ganancias</h2>

      <div className="form-group">
        <label>Fecha:</label>
        <input
          type="date"
          value={incomeForm.date}
          onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Nombre del Cliente:</label>
        <input
          type="text"
          placeholder="Nombre del cliente"
          value={incomeForm.clientName}
          onChange={(e) => setIncomeForm({ ...incomeForm, clientName: e.target.value })}
        />
      </div>

      {incomeForm.products.map((product, index) => (
        <div key={index} className="product-row">
          <input
            type="text"
            placeholder="Producto"
            value={product.name}
            onChange={(e) => {
              const newProducts = [...incomeForm.products];
              newProducts[index].name = e.target.value;
              setIncomeForm({ ...incomeForm, products: newProducts });
            }}
          />
          <input
            type="number"
            placeholder="Precio"
            value={product.price}
            onChange={(e) => {
              const newProducts = [...incomeForm.products];
              newProducts[index].price = e.target.value;
              setIncomeForm({ ...incomeForm, products: newProducts });
            }}
          />
          {incomeForm.products.length > 1 && (
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
        <button onClick={handleIncomeSubmit} className="save-button">
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
          width: 100%;
        }

        .product-row input[type="text"] {
          flex: 2;
        }

        .product-row input[type="number"] {
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

export default Income;