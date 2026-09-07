import React, { useState } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

function AdminLogin() {
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const validarAdmin = async (email) => {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await signOut(auth);
      throw new Error("Tu cuenta no tiene permisos administrativos.");
    }

    const data = snapshot.docs[0].data();

    if (data.role !== "admin" || data.active !== true) {
      await signOut(auth);
      throw new Error("Acceso denegado. No eres administrador activo.");
    }
  };

  const iniciarConGoogle = async () => {
    setMensaje("");
    setCargando(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      if (!email) {
        throw new Error("No se pudo obtener el correo del usuario.");
      }

      await validarAdmin(email);
      window.location.href = "/admin";
    } catch (error) {
      console.error("Error en login con Google:", error);

      if (error.code === "auth/popup-blocked") {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          console.error("Error con redirect:", redirectError);
          setMensaje(
            `Error: ${redirectError.code || ""} ${redirectError.message || ""}`
          );
        }
      } else {
        setMensaje(`Error: ${error.code || ""} ${error.message || ""}`);
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Login Administrador</h1>
        <p style={styles.subtitle}>Acceso al panel de control de BuscaQroo</p>

        <button onClick={iniciarConGoogle} style={styles.button} disabled={cargando}>
          {cargando ? "Ingresando..." : "Entrar con Google"}
        </button>

        {mensaje && <p style={styles.error}>{mensaje}</p>}

        <button
          style={styles.linkButton}
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Volver al chat público
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(180deg, #7a0026, #b2124b)",
    padding: "2rem",
  },
  card: {
    background: "#ffffff",
    padding: "2rem",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    textAlign: "center",
  },
  title: { margin: 0, marginBottom: "0.5rem" },
  subtitle: { marginTop: 0, marginBottom: "1.5rem", color: "#555" },
  button: {
    padding: "0.9rem",
    borderRadius: "10px",
    border: "none",
    background: "#8b0030",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    width: "100%",
  },
  error: {
    color: "#b00020",
    marginTop: "1rem",
    whiteSpace: "pre-wrap",
  },
  linkButton: {
    display: "inline-block",
    marginTop: "1rem",
    background: "none",
    border: "none",
    color: "#8b0030",
    fontWeight: "bold",
    cursor: "pointer",
    padding: 0,
  },
};

export default AdminLogin;