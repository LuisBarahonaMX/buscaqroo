import React, { useState } from "react";
import "./App.css";
import logoBuscaQroo from "./assets/logo_buscaqroo_guinda.png";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminConsultas from "./pages/AdminConsultas";
import ProtectedRoute from "./components/ProtectedRoute";

const API_URL = "/api/chat";

const obtenerSessionId = () => {
  let sessionId = localStorage.getItem("buscaqroo_session_id");

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    localStorage.setItem("buscaqroo_session_id", sessionId);
  }

  return sessionId;
};

const renderTextoConLinks = (texto) => {
  const urlRegex =
    /((https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(gob\.mx|org\.mx|com\.mx|mx|org|com|net)(\/[^\s]*)?))/gi;

  return texto.split(/(\s+)/).map((parte, index) => {
    if (urlRegex.test(parte)) {
      let href = parte.trim();

      if (!href.startsWith("http://") && !href.startsWith("https://")) {
        href = "https://" + href;
      }

      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mensaje-link"
        >
          {parte}
        </a>
      );
    }

    return <React.Fragment key={index}>{parte}</React.Fragment>;
  });
};

function PublicChat() {
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensajes, setMensajes] = useState([
    {
      rol: "bot",
      texto:
        "Hola, soy BuscaQroo. Estoy listo para ayudarte a consultar información institucional de Quintana Roo.",
    },
  ]);

  const enviarMensaje = async (e) => {
    e.preventDefault();

    const textoUsuario = mensaje.trim();
    if (!textoUsuario || cargando) return;

    const nuevoMensajeUsuario = {
      rol: "user",
      texto: textoUsuario,
    };

    setMensajes((prev) => [...prev, nuevoMensajeUsuario]);
    setMensaje("");
    setCargando(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textoUsuario,
          sessionId: obtenerSessionId(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detalle || data?.error || `HTTP ${response.status}`);
      }

      const respuestaBot =
        data.reply ||
        data.response ||
        data.answer ||
        data.message ||
        "No se recibió una respuesta válida del asistente.";

      setMensajes((prev) => [
        ...prev,
        {
          rol: "bot",
          texto: respuestaBot,
        },
      ]);
    } catch (error) {
      console.error("Error al conectar con el backend:", error);

      setMensajes((prev) => [
        ...prev,
        {
          rol: "bot",
          texto: `Error: ${error.message}`,
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const limpiarChat = () => {
    setMensajes([
      {
        rol: "bot",
        texto:
          "Hola, soy BuscaQroo. Estoy listo para ayudarte a consultar información institucional de Quintana Roo.",
      },
    ]);
  };

  const manejarEnter = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje(e);
    }
  };

  return (
    <div className="app">
      <div className="background-overlay"></div>

      <div className="main-container">
        <div className="logo-container">
          <img
            src={logoBuscaQroo}
            alt="Logo BuscaQroo"
            className="logo-img"
          />
          <h1 className="titulo">BUSCAQROO</h1>
          <p className="subtitulo">
            Asistente inteligente de consulta institucional
          </p>

          <button
            style={{
              marginTop: "1rem",
              background: "#ffffff",
              color: "#8b0030",
              border: "none",
              borderRadius: "10px",
              padding: "0.7rem 1rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
            onClick={() => {
              window.location.href = "/login-admin";
            }}
          >
            Acceso administrador
          </button>
        </div>

        <div className="chat-wrapper">
          <div className="chat-header">
            <h2>Consulta pública</h2>
            <button className="btn-limpiar" onClick={limpiarChat}>
              Limpiar chat
            </button>
          </div>

          <div className="chat-body">
            {mensajes.map((msg, index) => (
              <div
                key={index}
                className={`mensaje ${
                  msg.rol === "user" ? "mensaje-user" : "mensaje-bot"
                }`}
              >
                {msg.rol === "bot" ? renderTextoConLinks(msg.texto) : msg.texto}
              </div>
            ))}

            {cargando && (
              <div className="mensaje mensaje-bot">
                Buscando información...
              </div>
            )}
          </div>

          <form className="chat-input-area" onSubmit={enviarMensaje}>
            <textarea
              className="chat-input"
              placeholder="Escribe tu consulta aquí..."
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              onKeyDown={manejarEnter}
              rows="2"
              disabled={cargando}
            ></textarea>

            <div className="buttons-area">
              <button type="submit" className="btn-enviar" disabled={cargando}>
                {cargando ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function App() {
  const path = window.location.pathname;

  if (path === "/login-admin") {
    return <AdminLogin />;
  }

  if (path === "/admin") {
    return (
      <ProtectedRoute fallback={<AdminLogin />}>
        <AdminDashboard />
      </ProtectedRoute>
    );
  }

  if (path === "/admin/consultas") {
    return (
      <ProtectedRoute fallback={<AdminLogin />}>
        <AdminConsultas />
      </ProtectedRoute>
    );
  }

  return <PublicChat />;
}

export default App;