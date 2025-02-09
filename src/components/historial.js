import React, { useState, useEffect } from "react";
import { db } from "./firebaseConfig";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";

const Historial = ({ onBack }) => {
  const [movimientos, setMovimientos] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingType, setEditingType] = useState(null);

  const formatearCLP = (numero) => {
    return Math.round(numero).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const obtenerPeriodoMensual = (fecha) => {
    const date = new Date(fecha);
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    if (day < 6) {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      return `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
    }
    
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  };

  const organizarPorMes = (ingresos, gastos) => {
    const movimientosPorMes = {};
    
    const agregarMovimiento = (movimiento, tipo) => {
      const mesKey = obtenerPeriodoMensual(movimiento.date);
      const diaKey = movimiento.date;
      
      if (!movimientosPorMes[mesKey]) {
        movimientosPorMes[mesKey] = {
          ingresos: [],
          gastos: [],
          totalIngresos: 0,
          totalGastos: 0,
          balance: 0,
          movimientosDiarios: {}
        };
      }

      if (!movimientosPorMes[mesKey].movimientosDiarios[diaKey]) {
        movimientosPorMes[mesKey].movimientosDiarios[diaKey] = {
          ingresos: [],
          gastos: [],
          totalIngresos: 0,
          totalGastos: 0,
          balance: 0
        };
      }
      
      const movimientosArray = tipo === 'ingreso' ? 
        movimientosPorMes[mesKey].ingresos : 
        movimientosPorMes[mesKey].gastos;
      
      movimientosArray.push(movimiento);
      
      const total = movimiento.total || 
        movimiento.products.reduce((sum, p) => sum + (p.price * (p.quantity || 1)), 0);
      
      if (tipo === 'ingreso') {
        movimientosPorMes[mesKey].totalIngresos += total;
        movimientosPorMes[mesKey].movimientosDiarios[diaKey].totalIngresos += total;
        movimientosPorMes[mesKey].movimientosDiarios[diaKey].ingresos.push(movimiento);
      } else {
        movimientosPorMes[mesKey].totalGastos += total;
        movimientosPorMes[mesKey].movimientosDiarios[diaKey].totalGastos += total;
        movimientosPorMes[mesKey].movimientosDiarios[diaKey].gastos.push(movimiento);
      }
      
      movimientosPorMes[mesKey].balance = 
        movimientosPorMes[mesKey].totalIngresos - movimientosPorMes[mesKey].totalGastos;
      movimientosPorMes[mesKey].movimientosDiarios[diaKey].balance = 
        movimientosPorMes[mesKey].movimientosDiarios[diaKey].totalIngresos - 
        movimientosPorMes[mesKey].movimientosDiarios[diaKey].totalGastos;
    };

    ingresos.forEach(ingreso => agregarMovimiento(ingreso, 'ingreso'));
    gastos.forEach(gasto => agregarMovimiento(gasto, 'gasto'));

    return Object.keys(movimientosPorMes)
      .sort((a, b) => b.localeCompare(a))
      .reduce((obj, key) => {
        obj[key] = movimientosPorMes[key];
        return obj;
      }, {});
  };

  const handleDelete = async (id, type) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      try {
        const docRef = doc(db, type === 'ingreso' ? 'ingresos' : 'gastos', id);
        await deleteDoc(docRef);
        fetchData();
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  const handleEdit = async (id, type, updatedData) => {
    try {
      const docRef = doc(db, type === 'ingreso' ? 'ingresos' : 'gastos', id);
      
      // Calcular subtotales y total
      const productsWithSubtotals = updatedData.products.map(product => ({
        ...product,
        subtotal: product.price * (product.quantity || 1)
      }));
      
      const total = productsWithSubtotals.reduce((sum, product) => sum + product.subtotal, 0);
      
      await updateDoc(docRef, {
        ...updatedData,
        products: productsWithSubtotals,
        total
      });
      
      fetchData();
      setEditingId(null);
      setEditingType(null);
    } catch (error) {
      console.error("Error al actualizar:", error);
    }
  };

  const fetchData = async () => {
    try {
      const ingresosQuery = query(
        collection(db, "ingresos"),
        orderBy("date", "desc")
      );
      const gastosQuery = query(
        collection(db, "gastos"),
        orderBy("date", "desc")
      );

      const [ingresosSnapshot, gastosSnapshot] = await Promise.all([
        getDocs(ingresosQuery),
        getDocs(gastosQuery)
      ]);

      const ingresosData = ingresosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        products: doc.data().products.map(p => ({
          ...p,
          quantity: p.quantity || 1,
          subtotal: p.price * (p.quantity || 1)
        }))
      }));

      const gastosData = gastosSnapshot.docs.map(doc => {
        const data = doc.data();
        if (!data.products) {
          return {
            id: doc.id,
            date: data.date,
            products: [{
              name: data.product || '',
              price: data.price || 0,
              quantity: 1,
              subtotal: data.price || 0
            }],
            total: data.price || 0
          };
        }
        return {
          id: doc.id,
          ...data,
          products: data.products.map(p => ({
            ...p,
            quantity: p.quantity || 1,
            subtotal: p.price * (p.quantity || 1)
          }))
        };
      });

      setMovimientos(organizarPorMes(ingresosData, gastosData));
      setLoading(false);
    } catch (error) {
      console.error("Error al obtener datos:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const EditForm = ({ data, type, onSave, onCancel }) => {
    const [formData, setFormData] = useState(data);

    const handleProductChange = (index, field, value) => {
      const newProducts = [...formData.products];
      newProducts[index] = { 
        ...newProducts[index], 
        [field]: value,
        quantity: field === 'quantity' ? value : (newProducts[index].quantity || 1)
      };
      
      // Recalcular subtotales y total
      const productsWithSubtotals = newProducts.map(product => ({
        ...product,
        subtotal: product.price * (product.quantity || 1)
      }));
      
      const newTotal = productsWithSubtotals.reduce((sum, product) => sum + product.subtotal, 0);
      
      setFormData({
        ...formData,
        products: productsWithSubtotals,
        total: newTotal
      });
    };

    const handleRemoveProduct = (index) => {
      const newProducts = formData.products.filter((_, i) => i !== index);
      const newTotal = newProducts.reduce((sum, product) => 
        sum + (product.price * (product.quantity || 1)), 0);
      
      setFormData({
        ...formData,
        products: newProducts,
        total: newTotal
      });
    };

    const handleAddProduct = () => {
      setFormData({
        ...formData,
        products: [
          ...formData.products,
          { name: '', price: 0, quantity: 1, subtotal: 0 }
        ]
      });
    };

    return (
      <div className="edit-form">
        <div className="form-group">
          <label>Fecha:</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
          />
        </div>
        {type === 'ingreso' && (
          <div className="form-group">
            <label>Cliente:</label>
            <input
              type="text"
              value={formData.clientName || ''}
              onChange={(e) => setFormData({...formData, clientName: e.target.value})}
            />
          </div>
        )}
        {formData.products.map((product, index) => (
          <div key={index} className="product-form">
            <input
              type="text"
              value={product.name}
              onChange={(e) => handleProductChange(index, 'name', e.target.value)}
              placeholder="Nombre del producto"
            />
            <input
              type="number"
              value={product.price}
              onChange={(e) => handleProductChange(index, 'price', parseFloat(e.target.value))}
              placeholder="Precio"
            />
            <input
              type="number"
              value={product.quantity}
              onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value))}
              placeholder="Cantidad"
              min="1"
            />
            <span className="subtotal">
              Subtotal: ${formatearCLP(product.subtotal || 0)}
            </span>
            <button 
              type="button" 
              onClick={() => handleRemoveProduct(index)}
              className="remove-button"
            >
              Eliminar
            </button>
          </div>
        ))}
        <button 
          type="button" 
          onClick={handleAddProduct}
          className="add-button"
        >
          Agregar Producto
        </button>
        <div className="form-actions">
          <button onClick={() => onSave(formData)}>Guardar</button>
          <button onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    );
  };

  const formatearMes = (mesKey) => {
    const [año, mes] = mesKey.split('-');
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${meses[parseInt(mes) - 1]} ${año}`;
  };

  if (loading) {
    return <div className="container">Cargando datos...</div>;
  }

  return (
    <div className="container">
      <h2>Historial de Movimientos</h2>

      {Object.entries(movimientos).map(([mesKey, datosMes]) => (
        <div key={mesKey} className="mes-seccion">
          <div className="mes-header">
            <h3>{formatearMes(mesKey)}</h3>
            <div className="mes-resumen">
              <span>Ingresos: ${formatearCLP(datosMes.totalIngresos)}</span>
              <span>Gastos: ${formatearCLP(datosMes.totalGastos)}</span>
              <span className={`balance ${datosMes.balance < 0 ? 'negative' : ''}`}>
                Balance: ${formatearCLP(datosMes.balance)}
              </span>
            </div>
          </div>

          <div className="balance-diario">
            <h4>Balance Diario</h4>
            {Object.entries(datosMes.movimientosDiarios)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([fecha, datos]) => (
                <div key={fecha} className="dia-resumen">
                  <span className="fecha">{fecha}</span>
                  <span>Ingresos: ${formatearCLP(datos.totalIngresos)}</span>
                  <span>Gastos: ${formatearCLP(datos.totalGastos)}</span>
                  <span className={`balance ${datos.balance < 0 ? 'negative' : ''}`}>
                    Balance: ${formatearCLP(datos.balance)}
                  </span>
                </div>
              ))}
          </div>

          <div className="movimientos-container">
            <div className="seccion-ingresos">
              <h4>Ingresos</h4>
              {datosMes.ingresos.map((ingreso) => (
                <div key={ingreso.id} className="registro">
                  {editingId === ingreso.id ? (
                    <EditForm
                      data={ingreso}
                      type="ingreso"
                      onSave={(data) => handleEdit(ingreso.id, 'ingreso', data)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <div className="registro-header">
                        <span className="fecha">Fecha: {ingreso.date}</span>
                        <span className="cliente">Cliente: {ingreso.clientName}</span>
                        <div className="action-buttons">
                          <button 
                            className="edit-button"
                            onClick={() => {
                              setEditingId(ingreso.id);
                              setEditingType('ingreso');
                            }}
                          >
                            Editar
                          </button>
                          <button 
                            className="delete-button"
                            onClick={() => handleDelete(ingreso.id, 'ingreso')}
                          >
                            Eliminar</button>
                        </div>
                      </div>
                      <div className="productos">
                        {ingreso.products.map((product, index) => (
                          <div key={index} className="producto">
                            <span className="producto-nombre">{product.name}</span>
                            <div className="producto-detalles">
                              <span>Precio: ${formatearCLP(product.price)}</span>
                              <span>Cantidad: {product.quantity}</span>
                              <span>Subtotal: ${formatearCLP(product.subtotal)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="total">Total: ${formatearCLP(ingreso.total)}</p>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="seccion-gastos">
              <h4>Gastos</h4>
              {datosMes.gastos.map((gasto) => (
                <div key={gasto.id} className="registro">
                  {editingId === gasto.id ? (
                    <EditForm
                      data={gasto}
                      type="gasto"
                      onSave={(data) => handleEdit(gasto.id, 'gasto', data)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <div className="registro-header">
                        <span className="fecha">Fecha: {gasto.date}</span>
                        <div className="action-buttons">
                          <button 
                            className="edit-button"
                            onClick={() => {
                              setEditingId(gasto.id);
                              setEditingType('gasto');
                            }}
                          >
                            Editar
                          </button>
                          <button 
                            className="delete-button"
                            onClick={() => handleDelete(gasto.id, 'gasto')}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                      <div className="productos">
                        {gasto.products.map((product, index) => (
                          <div key={index} className="producto">
                            <span className="producto-nombre">{product.name}</span>
                            <div className="producto-detalles">
                              <span>Precio: ${formatearCLP(product.price)}</span>
                              <span>Cantidad: {product.quantity}</span>
                              <span>Subtotal: ${formatearCLP(product.subtotal)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="total">Total: ${formatearCLP(gasto.total)}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button onClick={onBack} className="back-button">Atrás</button>

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .mes-seccion {
          margin-bottom: 40px;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 20px;
        }

        .mes-header {
          border-bottom: 2px solid #eee;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }

        .mes-resumen {
          display: flex;
          gap: 20px;
          margin-top: 10px;
          font-size: 1.1em;
        }

        .balance {
          font-weight: bold;
          color: #28a745;
        }

        .balance.negative {
          color: #dc3545;
        }

        .balance-diario {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }

        .dia-resumen {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          border-bottom: 1px solid #dee2e6;
        }

        .movimientos-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .registro {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 8px;
        }

        .registro-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          color: #666;
        }

        .action-buttons {
          display: flex;
          gap: 10px;
        }

        .edit-button, .delete-button {
          padding: 5px 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
          transition: background-color 0.2s;
        }

        .edit-button {
          background-color: #007bff;
          color: white;
        }

        .edit-button:hover {
          background-color: #0056b3;
        }

        .delete-button {
          background-color: #dc3545;
          color: white;
        }

        .delete-button:hover {
          background-color: #c82333;
        }

        .cliente {
          font-weight: bold;
          color: #0d6efd;
        }

        .productos {
          margin: 10px 0;
        }

        .producto {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }

        .producto:last-child {
          border-bottom: none;
        }

        .producto-nombre {
          font-weight: bold;
          color: #495057;
          display: block;
          margin-bottom: 5px;
        }

        .producto-detalles {
          display: flex;
          justify-content: space-between;
          color: #666;
          font-size: 0.9em;
        }

        .total {
          font-weight: bold;
          text-align: right;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #eee;
          color: #0d6efd;
        }

        .edit-form {
          background-color: #fff;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          color: #495057;
        }

        .form-group input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
        }

        .product-form {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr auto;
          gap: 10px;
          align-items: center;
          margin-bottom: 10px;
          padding: 10px;
          background-color: #f8f9fa;
          border-radius: 4px;
        }

        .product-form input {
          padding: 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .form-actions button {
          padding: 8px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .form-actions button:first-child {
          background-color: #28a745;
          color: white;
        }

        .form-actions button:first-child:hover {
          background-color: #218838;
        }

        .form-actions button:last-child {
          background-color: #6c757d;
          color: white;
        }

        .form-actions button:last-child:hover {
          background-color: #5a6268;
        }

        .add-button {
          background-color: #28a745;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
          transition: background-color 0.2s;
        }

        .add-button:hover {
          background-color: #218838;
        }

        .remove-button {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8em;
        }

        .remove-button:hover {
          background-color: #c82333;
        }

        .subtotal {
          color: #0d6efd;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .movimientos-container {
            grid-template-columns: 1fr;
          }
          
          .mes-resumen {
            flex-direction: column;
            gap: 5px;
          }

          .product-form {
            grid-template-columns: 1fr;
          }

          .producto-detalles {
            flex-direction: column;
            gap: 5px;
          }

          .action-buttons {
            flex-direction: column;
            gap: 5px;
          }
        }
      `}</style>
    </div>
  );
};

export default Historial;
