import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";
import { admin, db } from "./config/firebase.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: true,
  })
);
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ragFileName = "instituciones.txt";
const promptFileName = "preprompt.txt";

const ragPath = path.join(__dirname, "..", "data", ragFileName);
const promptPath = path.join(__dirname, "..", "prompts", promptFileName);

function leerArchivo(ruta, nombre) {
  try {
    if (!fs.existsSync(ruta)) {
      throw new Error(`No se encontró el archivo: ${nombre} en ${ruta}`);
    }
    return fs.readFileSync(ruta, "utf8");
  } catch (error) {
    console.error(`Error leyendo ${nombre}:`, error.message);
    return "";
  }
}

function detectarCategoria(texto = "") {
  const t = texto.toLowerCase();

  if (
    t.includes("trámite") ||
    t.includes("tramite") ||
    t.includes("requisito") ||
    t.includes("licencia") ||
    t.includes("permiso")
  ) {
    return "tramites";
  }

  if (
    t.includes("teléfono") ||
    t.includes("telefono") ||
    t.includes("correo") ||
    t.includes("contacto") ||
    t.includes("dirección") ||
    t.includes("direccion")
  ) {
    return "contacto";
  }

  if (
    t.includes("ubicación") ||
    t.includes("ubicacion") ||
    t.includes("dónde") ||
    t.includes("donde") ||
    t.includes("oficina")
  ) {
    return "ubicacion";
  }

  return "general";
}

function detectarInstitucion(texto = "") {
  const t = texto.toLowerCase();

  const instituciones = [
    "imoveqroo",
    "capa",
    "apiqroo",
    "fge",
    "seq",
    "sedetur",
    "sesa",
    "ssc",
    "registro civil",
    "finanzas",
    "recaudadora",
  ];

  const encontrada = instituciones.find((item) => t.includes(item));
  return encontrada ? encontrada.toUpperCase() : "No clasificada";
}

app.get("/", (req, res) => {
  res.send("BuscaQroo backend activo");
});

app.post("/chat", async (req, res) => {
  const inicio = Date.now();
  const sourceName = ragFileName;

  try {
    const { message, sessionId } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        error: "Debes enviar un mensaje en el campo 'message'.",
      });
    }

    const ragContent = leerArchivo(ragPath, ragFileName);
    const prePrompt = leerArchivo(promptPath, promptFileName);

    const fullPrompt = `
${prePrompt}

CONTEXTO:
${ragContent}

PREGUNTA DEL USUARIO:
${message}
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: fullPrompt,
    });

    const reply =
      response.output_text || "No se recibió respuesta del modelo.";

    const responseTimeMs = Date.now() - inicio;
    const category = detectarCategoria(message);
    const institution = detectarInstitucion(message);

    await db.collection("queries").add({
      question: message,
      answer: reply,
      category,
      institution,
      status: "success",
      responseTimeMs,
      sessionId: sessionId || "anon_session",
      source: sourceName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      reply,
      source: sourceName,
    });
  } catch (error) {
    console.error("Error en /chat:", error);

    const responseTimeMs = Date.now() - inicio;

    try {
      await db.collection("queries").add({
        question: req.body?.message || "",
        answer: "",
        category: "error",
        institution: "No clasificada",
        status: "error",
        responseTimeMs,
        sessionId: req.body?.sessionId || "anon_session",
        source: sourceName,
        errorMessage: error.message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (firestoreError) {
      console.error("Error guardando historial en Firestore:", firestoreError);
    }

    res.status(500).json({
      error: "Error procesando la solicitud.",
      detalle: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});