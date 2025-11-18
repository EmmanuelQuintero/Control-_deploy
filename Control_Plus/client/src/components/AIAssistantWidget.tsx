import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";

export default function AIAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "¡Hola! Soy tu asistente. ¿En qué puedo ayudarte?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      const data = await res.json();
      const aiMsg = { role: "assistant", content: data.reply };
      setMessages((m) => [...m, aiMsg]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Hubo un error. Inténtalo nuevamente." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700"
      >
        <MessageCircle size={28} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 right-6 w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col border"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-3 bg-blue-600 text-white rounded-t-2xl">
              <h2 className="text-lg font-semibold">Asistente IA</h2>
              <button onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-xl max-w-[80%] ${
                    m.role === "assistant"
                      ? "bg-gray-200 text-black self-start"
                      : "bg-blue-600 text-white self-end ml-auto"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {loading && <p className="text-gray-400">Generando respuesta...</p>}
            </div>

            {/* Input */}
            <div className="p-3 border-t flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe aquí..."
                className="flex-1 border rounded-xl px-3 py-2"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600 text-white px-4 rounded-xl hover:bg-blue-700"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
