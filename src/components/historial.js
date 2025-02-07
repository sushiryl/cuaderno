import React, { useState, useEffect } from "react";
import { db } from "./firebaseConfig";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

const Historial = ({ onBack }) => {
  const [movimientos, setMovimientos] = useState({});
  const [loading, setLoading] = useState(true);

  const organizarPorMes = (ingresos, gastos) => {
    const movimientosPorMes = {};
    
    // Función auxiliar para agregar movimientos al objeto organizado
    const agregarMovimiento = (movimiento, tipo) => {
      const fecha = new Date(movimiento.date);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!movimientosPorMes[mesKey]) {
        movimientosPorMes[mesKey] = {
          ingresos: [],
          gastos: [],
          totalIngresos: 0,
          totalGastos: 0,
          balance: 0
        };
      }
      
      if (tipo === 'ingreso') {
        movimientosPorMes[mesKey].ingresos.push(movimiento);
        movimientosPorMes[mesKey].totalIngresos += movimiento.total;
      } else {
        movimientosPorMes[mesKey].gastos.push(movimiento);
        movimientosPorMes[mesKey].totalGastos += movimiento.total;
      }
      
      movimientosPorMes[mesKey].balance = 
        movimientosPorMes[mesKey].totalIngresos - movimientosPorMes[mesKey].totalGastos;
    };

    ingresos.forEach(ingreso => agregarMovimiento(ingreso, 'ingreso'));
    gastos.forEach(gasto => agregarMovimiento(gasto, 'gasto'));

    // Ordenar las claves en orden descendente
    return Object.keys(movimientosPorMes)
      .sort((a, b) => b.localeCompare(a))
      .reduce((obj, key) => {
        obj[key] = movimientosPorMes[key];
        return obj;
      }, {});
  };

  useEffect(() => {
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
          ...doc.data()
        }));

        const gastosData = gastosSnapshot.docs.map(doc => {
          const data = doc.data();
          if (!data.products) {
            return {
              id: doc.id,
              date: data.date,
              products: [{
                name: data.product || '',
                price: data.price || 0
              }],
              total: data.price || 0
            };
          }
          return {
            id: doc.id,
            ...data
          };
        });

        setMovimientos(organizarPorMes(ingresosData, gastosData));
        setLoading(false);
      } catch (error) {
        console.error("Error al obtener datos:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
              <span>Ingresos: ${datosMes.totalIngresos.toFixed(2)}</span>
              <span>Gastos: ${datosMes.totalGastos.toFixed(2)}</span>
              <span className="balance">Balance: ${datosMes.balance.toFixed(2)}</span>
            </div>
          </div>

          <div className="movimientos-container">
            <div className="seccion-ingresos">
              <h4>Ingresos</h4>
              {datosMes.ingresos.map((ingreso) => (
                <div key={ingreso.id} className="registro">
                  <div className="registro-header">
                    <span className="fecha">Fecha: {ingreso.date}</span>
                    <span className="cliente">Cliente: {ingreso.clientName}</span>
                  </div>
                  <div className="productos">
                    {ingreso.products.map((product, index) => (
                      <div key={index} className="producto">
                        <span>{product.name}</span>
                        <span>${parseFloat(product.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="total">Total: ${ingreso.total.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="seccion-gastos">
              <h4>Gastos</h4>
              {datosMes.gastos.map((gasto) => (
                <div key={gasto.id} className="registro">
                  <p className="fecha">Fecha: {gasto.date}</p>
                  <div className="productos">
                    {gasto.products.map((product, index) => (
                      <div key={index} className="producto">
                        <span>{product.name}</span>
                        <span>${parseFloat(product.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="total">Total: ${gasto.total.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button onClick={onBack} className="back-button">Volver al Menú Principal</button>

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
          color: #0d6efd;
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
          margin-bottom: 10px;
          color: #666;
        }

        .cliente {
          font-weight: bold;
          color: #0d6efd;
        }

        .productos {
          margin: 10px 0;
        }

        .producto {
          display: flex;
          justify-content: space-between;
          padding: 5px 15px;
          border-bottom: 1px solid #eee;
        }

        .producto:last-child {
          border-bottom: none;
        }

        .total {
          font-weight: bold;
          text-align: right;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #eee;
        }

        h3 {
          color: #343a40;
          margin: 0;
        }

        h4 {
          color: #495057;
          margin-bottom: 15px;
        }

        .back-button {
          width: 100%;
          padding: 12px;
          background-color: #6c757d;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1em;
          transition: background-color 0.2s;
          margin-top: 20px;
        }

        .back-button:hover {
          background-color: #5a6268;
        }

        @media (max-width: 768px) {
          .movimientos-container {
            grid-template-columns: 1fr;
          }
          
          .mes-resumen {
            flex-direction: column;
            gap: 5px;
          }
        }
      `}</style>
    </div>
  );
};

export default Historial;