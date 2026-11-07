"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";

interface Message {
  id: number;
  from: "user" | "bot";
  text: string;
  links?: { label: string; href: string }[];
}

/** Render **bold** segments and keep line breaks. */
function renderText(text: string) {
  return text.split("\n").map((line, i) => (
    <span key={i} className="block min-h-[1em]">
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j}>{part.slice(2, -2)}</strong>
        ) : (
          <React.Fragment key={j}>{part}</React.Fragment>
        )
      )}
    </span>
  ));
}

const ChatWidget = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      from: "bot",
      text: "Hi, I'm FastBot 👋 Ask me about orders, product availability, deals or shipping.",
    },
  ]);
  const idRef = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  // Load role-aware quick replies the first time the chat opens.
  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.suggestions && setSuggestions(d.suggestions))
      .catch(() => undefined);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, open]);

  if (pathname?.startsWith("/studio")) return null;

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;

    setMessages((m) => [...m, { id: idRef.current++, from: "user", text: message }]);
    setInput("");
    setSuggestions([]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages((m) => [
        ...m,
        {
          id: idRef.current++,
          from: "bot",
          text: data.text ?? "Sorry, something went wrong. Please try again.",
          links: data.links,
        },
      ]);
      if (data.suggestions) setSuggestions(data.suggestions);
    } catch {
      setMessages((m) => [
        ...m,
        { id: idRef.current++, from: "bot", text: "I can't reach the server right now. Please check your connection." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat assistant"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-shop_dark_green text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-shop_light_green focus-visible:ring-offset-2"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="FastBot chat assistant"
          className="fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden border bg-white shadow-2xl sm:bottom-5 sm:right-5 sm:h-[560px] sm:w-[380px] sm:rounded-2xl"
        >
          <header className="flex items-center justify-between bg-shop_dark_green px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold leading-none">FastBot</p>
                <p className="mt-1 text-[11px] opacity-80">Orders · Products · Help</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded p-1 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.from === "user"
                      ? "rounded-br-sm bg-shop_dark_green text-white"
                      : "rounded-bl-sm border bg-white text-gray-800"
                  }`}
                >
                  {renderText(m.text)}
                  {m.links && m.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.links.slice(0, 6).map((l) => (
                        <Link
                          key={l.href + l.label}
                          href={l.href}
                          onClick={() => setOpen(false)}
                          className="rounded-full border border-shop_light_green px-2.5 py-1 text-xs text-shop_dark_green hover:bg-shop_light_green/10"
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border bg-white px-3 py-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Looking that up…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {suggestions.length > 0 && !busy && (
            <div className="flex flex-wrap gap-2 border-t bg-white px-3 pt-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 bg-white p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Ask about an order or product…"
              aria-label="Message"
              className="flex-1 rounded-full border px-4 py-2 text-sm outline-none focus:border-shop_light_green"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-shop_dark_green text-white disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}
    </>
  );
};

export default ChatWidget;
