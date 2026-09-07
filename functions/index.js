const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const OpenAI = require("openai");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use((req, res, next) => {
  logger.info("Request recibida", {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
  });
  next();
});

const ragFileName = "instituciones.txt";
const promptFileName = "preprompt.txt";

const ragPath = path.join(__dirname, ragFileName);
const promptPath = path.join(__dirname, promptFileName);

function leerArchivo(ruta, nombre) {
  try {
    if (!fs.existsSync(ruta)) {
      throw new Error(`No se encontró el archivo: ${nombre} en ${ruta}`);
    }
    return fs.readFileSync(ruta, "utf8");
  } catch (error) {
    logger.error(`Error leyendo ${nombre}:`, error.message);
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

async function manejarChat(req, res) {
  const inicio = Date.now();
  const sourceName = ragFileName;

  try {
    const { message, sessionId } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        error: "Debes enviar un mensaje en el campo 'message'.",
      });
    }

    const client = new OpenAI({
      apiKey: OPENAI_API_KEY.value(),
    });

    const ragContent = leerArchivo(ragPath, ragFileName);
    const prePrompt = leerArchivo(promptPath, promptFileName);

    if (!ragContent || !prePrompt) {
      throw new Error(
        "No se pudo cargar instituciones.txt o preprompt.txt dentro de functions."
      );
    }

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

    logger.info("Consulta guardada correctamente", {
      question: message,
      category,
      institution,
      responseTimeMs,
    });

    return res.json({
      reply,
      source: sourceName,
    });
  } catch (error) {
    logger.error("Error en manejarChat", {
      message: error.message,
      stack: error.stack,
    });

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
      logger.error("Error guardando historial en Firestore", {
        message: firestoreError.message,
      });
    }

    return res.status(500).json({
      error: "Error procesando la solicitud.",
      detalle: error.message,
    });
  }
}

app.get("/", (req, res) => {
  res.send("BuscaQroo backend activo en Firebase Functions");
});

app.get("/api", (req, res) => {
  res.send("BuscaQroo backend activo en Firebase Functions");
});

app.post("/chat", manejarChat);
app.post("/api/chat", manejarChat);

exports.api = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 120,
    memory: "512MiB",
    secrets: [OPENAI_API_KEY],
  },
  app
);