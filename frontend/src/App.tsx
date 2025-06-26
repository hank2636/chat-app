import { useState, useEffect, useRef } from 'react';
import axios from "axios";
import "./App.css";

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    opacity: number;
};

const LightningParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);

  const particleCount = 80;
  const maxDistance = 120;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      radius: 2 + Math.random() * 1.5,
      opacity: 0.6 + Math.random() * 0.4,
    });

    particles.current = Array.from({ length: particleCount }, createParticle);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(51, 160, 138, ${p.opacity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(51, 160, 138, 0.8)';
        ctx.fill();
      }

      for (let i = 0; i < particles.current.length; i++) {
        for (let j = i + 1; j < particles.current.length; j++) {
          const a = particles.current[i];
          const b = particles.current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const opacity = 1 - dist / maxDistance;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(51, 160, 138, ${opacity * 0.4})`;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(51, 160, 138, 0.5)';
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
};

function TypingMessage({ text, onDone }) {
  const [displayedText, setDisplayedText] = useState("");
  const messageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + text[i]);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        onDone && onDone();
      }
    }, 30);

    return () => clearInterval(interval);
  }, [text, onDone]);

  useEffect(() => {
    // 滾動到最底部
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayedText]); // 每次顯示的新文字都會觸發

  return <div ref={messageRef} className="msg bot"  style={{ whiteSpace: 'pre-wrap' }}>{displayedText}</div>;
}

function App() {
  const [messages, setMessages] = useState<{ text: string; from: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null); // Corrected state for file
  const [fileName, setFileName] = useState("");
  const [flashHover, setFlashHover] = useState(false);
  const [clipHover, setClipHover] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);
  
  const sendMessage = async (inputText = input, fileObj = file, fileObjName = fileName) => {
    if (!inputText.trim() && !fileObjName) return;

    const userMessage = {
      text: inputText + (fileObjName ? `（傳送檔案：${fileObjName}）` : ""),
      from: "user",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setFile(null);
    setFileName("");
    setIsLoading(true);

    try {
      // 如果有檔案，先上傳檔案
      if (fileObjName) {
        await axios.post("http://localhost:4000/upload_file", {
          file_name: fileObjName,
        });

        setMessages((prev) => [
          ...prev,
          { text: `檔案 ${fileObjName} 已成功上傳！`, from: "bot" },
        ]);
      } else if (inputText) {
        // 傳送訊息給聊天 API
        const chatRes = await axios.post(
          "http://localhost:4000/chat",
          {
            message: inputText,
            sessionId: "user_123",
          },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (chatRes.status === 200 && chatRes.data.reply) {
          const botMessage = { text: chatRes.data.reply, from: "bot-typing" };
          setMessages((prev) => [...prev, botMessage]);
        } else {
          setMessages((prev) => [...prev, { text: "⚠️ 未收到回應", from: "bot" }]);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { text: "⚠️ 發生錯誤", from: "bot" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null; // 處理檔案選擇，避免為 null

    if (selectedFile && selectedFile.size > 50 * 1024 * 1024) {
      alert("檔案大小不能超過 50MB");
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : "");

    // 檔案選擇後自動發送訊息
    if (selectedFile) {
      sendMessage(input, selectedFile, selectedFile.name); // 直接發送訊息
    }
  };
  
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // 防止換行
      sendMessage();
    }
  };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    sendMessage(input, file, fileName); // 傳遞狀態中的 input, file 和 fileName
  };


  return (
    <div className="chat-container">
      <LightningParticles />
      <div className="header">
        <img
          src={flashHover ? "/flash_light.svg" : "/flash.svg"}
          alt="flash icon"
          className="icon"
          onMouseEnter={() => setFlashHover(true)}
          onMouseLeave={() => setFlashHover(false)}
          onClick={() => alert("歐立威股份有限公司出品, 必為精品")}
        />
        <h1 onClick={() => alert("Wellcome RAG demo system!")} style={{ cursor: "pointer" }}>
          RAG Chat-UI
        </h1>
      </div>

      <div className="chat-box">
        {messages.map((msg, idx) => {
          if (msg.from === "bot-typing") {
            return (
              <TypingMessage
                key={idx}
                text={msg.text}
                onDone={() => {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[idx] = { text: msg.text, from: "bot" };
                    return updated;
                  });
                }}
              />
            );
          }
          console.log(msg.text);
          return <div key={idx} className={`msg ${msg.from}`} style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>;
        })}
        {isLoading && (
          <div className="msg bot typing-indicator">
            <span></span><span></span><span></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <label
          className="file-upload"
          onMouseEnter={() => setClipHover(true)}
          onMouseLeave={() => setClipHover(false)}
        >
          <img src={clipHover ? "/paper_clip_light.svg" : "/paper_clip.svg"} alt="Upload" />
          <input
            type="file"
            accept=".pdf, .txt"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="輸入訊息..."
        />
        <button onClick={handleClick}>送出</button>
      </div>
    </div>
  );
}

export default App;
