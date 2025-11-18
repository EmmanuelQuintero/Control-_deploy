import { GoogleGenerativeAI } from "@google/generative-ai";
import express from "express";

const router = express.Router();

// Inicializa la IA con tu clave API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages) {
      return res.status(400).json({ error: "Faltan mensajes" });
    }

    // ⭐ LA CORRECCIÓN ESTÁ AQUÍ ⭐
    // Cambiamos "gemini-pro" por un modelo actual, como "gemini-2.5-flash"
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro", 
    });

    // Mapea y une los mensajes en un solo prompt
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n");

    // Llama a la API de Gemini
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    res.json({ reply });

  } catch (e) {
    // Si hay un error, imprímelo y envía una respuesta 500
    console.error("🔥 ERROR EN /api/ai:", e);
    // Asegúrate de que 'e' tiene una propiedad 'message' antes de acceder a ella
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
    res.status(500).json({ error: "Error en IA", detail: errorMessage });
  }
});

export default router;