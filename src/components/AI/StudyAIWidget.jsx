import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Mic, MicOff, Send, Sparkles, Volume2, X } from "lucide-react";
import { askStudyCoach, cloudAIConfig } from "../../services/cloudAIService";
import "./StudyAIWidget.css";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function StudyAIWidget({ focusScore = 0, sessionState = "Ready" }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I’m Daily Goal AI. Ask me anything about your study session." },
  ]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const endRef = useRef(null);

  const configured = cloudAIConfig.hasGemini || cloudAIConfig.hasGroq;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
      window.speechSynthesis?.cancel?.();
    };
  }, []);

  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 1.02;
    utterance.lang = "en-IN";
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    if (!SpeechRecognition) {
      speak("Voice input is not supported in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => setInput(event.results?.[0]?.[0]?.transcript || "");
    recognitionRef.current = recognition;
    recognition.start();
  };

  const send = async (event) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const response = configured
        ? await askStudyCoach(text, next, { focusScore, sessionState })
        : { text: "Add a Gemini or Groq key in your .env file to enable cloud AI. Voice read-aloud still works here." };
      setMessages((current) => [...current, { role: "assistant", content: response.text, provider: response.provider, fallback: response.fallback }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error?.message || "AI is temporarily unavailable." }]);
    } finally {
      setLoading(false);
    }
  };

  const status = useMemo(() => {
    if (cloudAIConfig.hasGemini) return "Gemini • Ready";
    if (cloudAIConfig.hasGroq) return "Groq • Fallback";
    return "Offline • Configure AI";
  }, [configured]);

  return (
    <div className={`study-ai-widget ${open ? "is-open" : ""}`}>
      {open && (
        <section className="study-ai-panel" aria-label="Daily Goal AI chat">
          <header className="study-ai-panel__header">
            <div className="study-ai-panel__identity">
              <span className="study-ai-panel__avatar"><Sparkles size={17} /></span>
              <div><strong>Daily Goal AI</strong><small>{status}</small></div>
            </div>
            <button type="button" className="study-ai-icon" onClick={() => setOpen(false)} aria-label="Close AI chat"><X size={17} /></button>
          </header>

          <div className="study-ai-panel__messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`study-ai-message ${message.role}`}>
                <span>{message.content}</span>
                {message.role === "assistant" && message.provider && (
                  <small className="study-ai-provider">{message.provider}{message.fallback ? " • Fallback" : ""}</small>
                )}
                {message.role === "assistant" && (
                  <button type="button" className="study-ai-speak" onClick={() => speak(message.content)} aria-label="Read message aloud"><Volume2 size={13} /></button>
                )}
              </div>
            ))}
            {loading && <div className="study-ai-message assistant typing"><i /><i /><i /></div>}
            <div ref={endRef} />
          </div>

          <form className="study-ai-composer" onSubmit={send}>
            <button type="button" className={`study-ai-icon ${listening ? "is-listening" : ""}`} onClick={toggleVoice} aria-label={listening ? "Stop voice input" : "Start voice input"}>{listening ? <MicOff size={17} /> : <Mic size={17} />}</button>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask your study coach…" aria-label="Ask Daily Goal AI" />
            <button type="submit" className="study-ai-send" disabled={!input.trim() || loading} aria-label="Send"><Send size={16} /></button>
          </form>
        </section>
      )}

      <button type="button" className="study-ai-fab" onClick={() => setOpen((value) => !value)} aria-label="Open Daily Goal AI">
        <span className="study-ai-fab__pulse" />
        <Bot size={20} />
        <span className="study-ai-fab__label">AI Coach</span>
      </button>
    </div>
  );
}
