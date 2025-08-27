"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Tipe data untuk pesan
type Message = {
  role: "user" | "assistant";
  content: string;
  image?: string;
};

// Tipe data untuk history
type History = {
  id: number;
  title: string;
  messages: Message[];
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const [histories, setHistories] = useState<History[]>([]);
  const [activeHistory, setActiveHistory] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Load history dari sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("histories");
    if (saved) setHistories(JSON.parse(saved));
  }, []);

  // Simpan history ke sessionStorage
  useEffect(() => {
    sessionStorage.setItem("histories", JSON.stringify(histories));
  }, [histories]);

  // Kirim pesan
  const sendMessage = async (prompt?: string) => {
    const question = prompt || input;
    if (!question.trim() && !selectedImage) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: question || "(Gambar dikirim)", image: selectedImage || undefined },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      let res: Response;

      if (selectedImage) {
        const formData = new FormData();
        formData.append("prompt", question);

        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const file = new File([blob], "upload.png", { type: blob.type });

        formData.append("file", file);

        res = await fetch("/api/route", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: question }),
        });
      }

      const data = await res.json();

      let reply: string =
        data.text ||
        data.output?.[0]?.content?.[0]?.text ||
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Maaf, tidak ada jawaban.";

      reply = `Baiklah, saya akan jelaskan ${question || "gambar ini"}... ✨\n\n${reply}`;

      typeMessage(reply, newMessages);

      // Update atau buat history baru
      setHistories((prev) => {
        const updated = [...prev];
        if (activeHistory !== null) {
          updated[activeHistory].messages = [
            ...newMessages,
            { role: "assistant", content: reply },
          ];
        } else {
          updated.push({
            id: Date.now(),
            title: question.slice(0, 30),
            messages: [...newMessages, { role: "assistant", content: reply }],
          });
          setActiveHistory(updated.length - 1);
        }
        return updated;
      });
    } catch (err) {
      console.error("Error:", err);
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Upss... terjadi error saat memproses jawaban 😅." },
      ]);
    } finally {
      setInput("");
      setSelectedImage(null);
      setLoading(false);
    }
  };

  // Ambil berita
  const getNews = async () => {
    try {
      const res = await fetch("/api/berita");
      const data = await res.json();
      const newsText: string = data.result || data.data?.text || "Tidak ada berita hari ini.";

      const newMessages: Message[] = [...messages, { role: "assistant", content: newsText }];
      setMessages(newMessages);

      setHistories((prev) => {
        const updated = [...prev];
        if (activeHistory !== null) {
          updated[activeHistory].messages = newMessages;
        } else {
          updated.push({ id: Date.now(), title: "Berita Hari Ini", messages: newMessages });
          setActiveHistory(updated.length - 1);
        }
        return updated;
      });
    } catch (err) {
      console.error("Error:", err);
    }
  };

  // Buat history baru
  const newHistory = () => {
    setMessages([]);
    setActiveHistory(null);
  };

  // Hapus semua history
  const clearHistories = () => {
    setHistories([]);
    setMessages([]);
    setActiveHistory(null);
    sessionStorage.removeItem("histories");
  };

  // Hapus satu history
  const deleteHistory = (id: number) => {
    setHistories((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      if (activeHistory !== null && prev[activeHistory]?.id === id) {
        setMessages([]);
        setActiveHistory(null);
      }
      return updated;
    });
  };

  // Efek mengetik balasan
  const typeMessage = (fullText: string, currentMessages: Message[]) => {
    let index = 0;
    let displayed = "";
    const interval = setInterval(() => {
      displayed += fullText[index];
      index++;
      setMessages([...currentMessages, { role: "assistant", content: displayed }]);
      if (index >= fullText.length) {
        clearInterval(interval);
      }
    }, 7);
  };

  // Copy ke clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("✅ Teks berhasil disalin!");
  };

  const quickQuestions: string[] = [
    "💡 Berikan ide usaha kecil untuk anak muda",
    "📖 Ringkas artikel panjang jadi poin-poin",
    "⚽ Siapa pemain bola terbaik saat ini?",
    "💻 Buatkan kode sederhana game di HTML",
    "💱 Perbandingan mata uang rupiah dengan mata uang diseluruh negara/dunia",
    "🆙 Negara dengan kemajuan teknologi tertinggi",
  ];

  // Sidebar
  const toggleSidebar = () => {
    if (sidebarOpen) {
      setSidebarClosing(true);
      setTimeout(() => {
        setSidebarOpen(false);
        setSidebarClosing(false);
      }, 400);
    } else {
      setSidebarOpen(true);
    }
  };

  // Upload gambar
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative flex flex-col min-h-screen text-white bg-[#1e1e1e]">
      {/* Sidebar */}
      {(sidebarOpen || sidebarClosing) && (
        <div
          className={`w-64 bg-gray-900 text-white p-4 flex flex-col fixed top-0 left-0 h-full z-20 
          transform transition-all duration-400 ease-in-out
          ${sidebarClosing ? "-translate-x-full opacity-0" : "translate-x-0 opacity-100"}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Menu</h2>
            <button onClick={toggleSidebar} className="text-white text-xl hover:text-red-400 transition duration-200">
              ❌
            </button>
          </div>

          <button onClick={getNews} className="w-full p-2 mb-4 bg-gray-600 rounded-lg hover:bg-black-700 transition duration-300">
            📰 Berita Hari Ini
          </button>

          <div className="flex-1 overflow-y-auto">
            <h3 className="font-semibold mb-2">History</h3>
            <ul className="space-y-2">
              {histories.map((h, i) => (
                <li
                  key={h.id}
                  className={`p-2 rounded flex justify-between items-center transition duration-300 ${
                    i === activeHistory ? "bg-green-700" : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <span
                    className="cursor-pointer flex-1"
                    onClick={() => {
                      setActiveHistory(i);
                      setMessages(h.messages);
                    }}
                  >
                    💬 {h.title}
                  </span>
                  <button
                    onClick={() => deleteHistory(h.id)}
                    className="ml-2 text-red-400 hover:text-red-600"
                  >
                    ✖
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <button onClick={newHistory} className="w-full p-2 mt-4 bg-green-600 rounded-lg hover:bg-green-700 transition duration-300">
            + New History
          </button>
          <button onClick={clearHistories} className="w-full p-2 mt-2 bg-red-600 rounded-lg hover:bg-red-700 transition duration-300">
            🗑 Clear All
          </button>
        </div>
      )}

      {/* Konten utama */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <header
          style={{
            padding: "15px",
            textAlign: "center",
            fontWeight: "italic",
            fontSize: "22px",
            backgroundColor: "#323032ff",
            position: "relative",
          }}
        >
          <button
            onClick={toggleSidebar}
            style={{
              position: "absolute",
              left: "15px",
              top: "15px",
              background: "transparent",
              border: "none",
              fontSize: "28px",
              cursor: "pointer",
              color: "white",
            }}
          >
            ☰
          </button>
          <img
            src="/header.png"
            alt="Andrea Logo"
            style={{
              height: "100px",
              width: "auto",
              display: "inline-block",
              filter: "drop-shadow(0 0 8px #ffae00)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "8px",
              background:
                "linear-gradient(90deg, transparent, #facc15, #fff176, #facc15, transparent)",
              backgroundSize: "200% 100%",
              filter:
                "blur(3px) brightness(160%) drop-shadow(0 0 7px #facc15) drop-shadow(0 0 10px #facc15) drop-shadow(0 0 20px #facc15)",
              animation: "glowLine 2.5s linear infinite",
            }}
          ></div>
        </header>

        {/* Opening screen */}
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              gap: "20px",
              padding: "20px",
              animation: "fadeIn 1s ease-in-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img src="/logo.png" alt="Andrea Logo" style={{ width: "70px", height: "70px" }} />
              <h1 style={{ fontSize: "32px", fontWeight: "bold" }}>Selamat Datang di ANDREA ✨</h1>
            </div>
            <p style={{ fontSize: "18px", color: "#ddd", maxWidth: "600px" }}>
              Asisten AI siap membantu menjawab pertanyaanmu dengan gaya yang seru dan rapi 😎
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "15px",
                marginTop: "20px",
                width: "100%",
                maxWidth: "800px",
              }}
            >
              {quickQuestions.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    padding: "15px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "0.3s",
                  }}
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              maxWidth: "900px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: "center",
                  backgroundColor: msg.role === "user" ? "#0095ffff" : "#333",
                  padding: "15px 20px",
                  borderRadius: "15px",
                  maxWidth: "100%",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.6",
                  animation: "fadeIn 0.6s ease-in-out",
                  fontSize: "16px",
                  width: "100%",
                }}
              >
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="uploaded"
                    style={{ maxWidth: "100%", borderRadius: "8px", marginBottom: "8px" }}
                  />
                )}
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                <button
                  onClick={() => copyToClipboard(msg.content)}
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    padding: "4px 8px",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: "#555",
                    color: "white",
                  }}
                >
                  📋
                </button>
              </div>
            ))}
            {loading && (
              <div
                style={{
                  alignSelf: "center",
                  backgroundColor: "#333",
                  padding: "12px 18px",
                  borderRadius: "15px",
                  fontWeight: "bold",
                  display: "flex",
                  gap: "6px",
                }}
              >
                <span className="dot">•</span>
                <span className="dot">•</span>
                <span className="dot">•</span>
              </div>
            )}
          </div>
        )}

        {/* Input bar */}
        <div
          style={{
            padding: "15px",
            backgroundColor: "#292929ff",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <label
            style={{
              backgroundColor: "#555",
              borderRadius: "10px",
              padding: "10px",
              cursor: "pointer",
            }}
          >
            🖼
            <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ketik pertanyaanmu..."
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              outline: "none",
              backgroundColor: "#444",
              color: "white",
              fontSize: "15px",
            }}
          />
          <button
            onClick={() => sendMessage()}
            style={{
              backgroundColor: "#ffae00ff",
              border: "none",
              padding: "12px 18px",
              borderRadius: "10px",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Kirim
          </button>
        </div>
        {selectedImage && (
          <div
            style={{
              padding: "10px",
              backgroundColor: "#222",
              textAlign: "center",
              borderTop: "1px solid #444",
            }}
          >
            <p>📷 Preview Gambar:</p>
            <img
              src={selectedImage}
              alt="preview"
              style={{ maxHeight: "200px", margin: "10px auto", borderRadius: "8px" }}
            />
          </div>
        )}
      </div>

      {/* Animasi */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dot {
          animation: blink 1.4s infinite both;
          font-size: 20px;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
        @keyframes glowLine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}