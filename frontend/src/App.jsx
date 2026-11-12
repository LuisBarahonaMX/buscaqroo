
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "./App.css";
import logoBuscaQroo from "./assets/logo_buscaqroo_guinda.png";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminConsultas from "./pages/AdminConsultas";
import ProtectedRoute from "./components/ProtectedRoute";

// ============================================
// CONFIGURACION GENERAL
// ============================================

const API_URL = "/api/chat";

const MENSAJE_BIENVENIDA =
  "Hola, estoy para ayudarte en tus consultas sobre información de instituciones públicas de Quintana Roo.";

// ============================================
// IDENTIFICADOR DE SESION
// ============================================

const obtenerSessionId = () => {
  let sessionId = localStorage.getItem(
    "buscaqroo_session_id"
  );

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    localStorage.setItem(
      "buscaqroo_session_id",
      sessionId
    );
  }

  return sessionId;
};

// ============================================
// RENDERIZADO MARKDOWN PARA RESPUESTAS RAG
// ============================================

function RespuestaMarkdown({ texto }) {
  return (
    <div className="respuesta-rag">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="mensaje-link"
            />
          ),
        }}
      >
        {String(texto ?? "")}
      </ReactMarkdown>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL DEL CHAT PUBLICO
// ============================================

function PublicChat() {
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const [mensajes, setMensajes] = useState([
    {
      rol: "bot",
      texto: MENSAJE_BIENVENIDA,
    },
  ]);

  // ==========================================
  // ENVIAR MENSAJE AL BACKEND
  // ==========================================

  const enviarMensaje = async (e) => {
    e.preventDefault();

    const textoUsuario = mensaje.trim();

    if (!textoUsuario || cargando) {
      return;
    }

    const nuevoMensajeUsuario = {
      rol: "user",
      texto: textoUsuario,
    };

    setMensajes((prev) => [
      ...prev,
      nuevoMensajeUsuario,
    ]);

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
        throw new Error(
          data?.detalle ||
          data?.error ||
          `HTTP ${response.status}`
        );
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
      console.error(
        "Error al conectar con el backend:",
        error
      );

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

  // ==========================================
  // LIMPIAR CONVERSACION
  // ==========================================

  const limpiarChat = () => {
    setMensajes([
      {
        rol: "bot",
        texto: MENSAJE_BIENVENIDA,
      },
    ]);

    setMensaje("");
  };

  // ==========================================
  // ENVIAR CON ENTER
  // SHIFT + ENTER PARA SALTO DE LINEA
  // ==========================================

  const manejarEnter = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent?.isComposing
    ) {
      e.preventDefault();

      if (!cargando && mensaje.trim()) {
        enviarMensaje(e);
      }
    }
  };

  // ==========================================
  // INTERFAZ PUBLICA
  // ==========================================

  return (
    <div className="app">

      {/* Fondo visual */}
      <div className="background-overlay"></div>

      <div className="main-container">

        {/* ==================================
            LOGOTIPO Y TITULO
           ================================== */}

        <div className="logo-container">

          <img
            src={logoBuscaQroo}
            alt="Logotipo de Busca Qroo"
            className="logo-img"
          />

          <h1 className="titulo">
            Busca Qroo
          </h1>

          <p className="subtitulo">
            Asistente inteligente de consulta institucional
          </p>

        </div>

        {/* ==================================
            CONTENEDOR PRINCIPAL DEL CHAT
           ================================== */}

        <div className="chat-wrapper">

          {/* Encabezado */}

          <div className="chat-header">

            <h2>
              Realizar consulta
            </h2>

          </div>

          {/* ==================================
              AREA DE MENSAJES
             ================================== */}

          <div className="chat-body">

            {mensajes.map((msg, index) => (

              <div
                key={index}
                className={`mensaje ${
                  msg.rol === "user"
                    ? "mensaje-user"
                    : "mensaje-bot"
                }`}
              >

                {msg.rol === "bot" ? (

                  <RespuestaMarkdown
                    texto={msg.texto}
                  />

                ) : (

                  msg.texto

                )}

              </div>

            ))}

            {/* Indicador de carga */}

            {cargando && (

              <div className="mensaje mensaje-bot">
                Buscando información...
              </div>

            )}

          </div>

          {/* ==================================
              FORMULARIO DE CONSULTA
             ================================== */}

          <form
            className="chat-input-area"
            onSubmit={enviarMensaje}
          >

            <textarea
              className="chat-input"
              placeholder="Escribe tu consulta aquí..."
              value={mensaje}
              onChange={(e) => {
                setMensaje(e.target.value);
              }}
              onKeyDown={manejarEnter}
              rows={2}
              disabled={cargando}
            />

            {/* ==================================
                BOTONES DE ACCION
               ================================== */}

            <div className="buttons-area">

              {/* Boton Enviar */}

              <button
                type="submit"
                className="btn-enviar"
                disabled={
                  cargando ||
                  !mensaje.trim()
                }
              >

                {cargando
                  ? "Enviando..."
                  : "Enviar"}

              </button>

              {/* Boton Limpiar chat */}

              <button
                type="button"
                className="btn-limpiar"
                onClick={limpiarChat}
                disabled={cargando}
              >
                Limpiar chat
              </button>

            </div>

          </form>

        </div>

        {/* ==================================
            ACCESO ADMINISTRADOR
            UBICADO AL FINAL
           ================================== */}

        <div className="admin-footer">

          <button
            type="button"
            className="btn-admin"
            onClick={() => {
              window.location.href =
                "/login-admin";
            }}
          >
            Acceso administrador
          </button>

        </div>

      </div>

    </div>
  );
}

// ============================================
// ENRUTAMIENTO PRINCIPAL DE LA APLICACION
// ============================================

function App() {
  const path = window.location.pathname;

  // Acceso administrativo
  if (path === "/login-admin") {
    return <AdminLogin />;
  }

  // Panel administrativo protegido
  if (path === "/admin") {
    return (
      <ProtectedRoute
        fallback={<AdminLogin />}
      >
        <AdminDashboard />
      </ProtectedRoute>
    );
  }

  // Consultas administrativas protegidas
  if (path === "/admin/consultas") {
    return (
      <ProtectedRoute
        fallback={<AdminLogin />}
      >
        <AdminConsultas />
      </ProtectedRoute>
    );
  }

  // Interfaz ciudadana
  return <PublicChat />;
}

export default App;
