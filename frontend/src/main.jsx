
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// ============================================
// BUSCA QROO
// Limpieza automática de parámetros UTM
// ============================================

const limpiarParametrosSeguimiento = () => {
  try {
    const url = new URL(window.location.href);

    // Identificar los parámetros de seguimiento UTM
    const parametrosUTM = [...url.searchParams.keys()].filter(
      (parametro) => parametro.toLowerCase().startsWith("utm_")
    );

    // Si no existen parámetros UTM, no modificar la URL
    if (parametrosUTM.length === 0) {
      return;
    }

    // Eliminar únicamente parámetros de seguimiento
    parametrosUTM.forEach((parametro) => {
      url.searchParams.delete(parametro);
    });

    // Actualizar la dirección sin recargar la página
    const nuevaURL =
      url.pathname +
      url.search +
      url.hash;

    window.history.replaceState(
      window.history.state,
      "",
      nuevaURL
    );

  } catch (error) {
    console.error(
      "No fue posible limpiar los parámetros de la URL:",
      error
    );
  }
};

// Ejecutar la limpieza antes de iniciar React
limpiarParametrosSeguimiento();

// ============================================
// INICIALIZACIÓN DE REACT
// ============================================

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
