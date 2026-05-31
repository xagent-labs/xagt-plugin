'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';

const EXAMPLES = [
  { emoji: '💎', label: 'SOL 现在多少钱？24h 走势？' },
  { emoji: '🔥', label: 'Top 5 gainers on OKX in the last 24h?' },
  { emoji: '👛', label: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 vitalik 这个钱包在主流链上分别有多少资产？' },
  { emoji: '🪐', label: '帮我看看 3JZ7uyDPM3k6gqL2wH8MPALU5DZ91aXBdN5oXxELjvjm 这个 Solana 钱包里有什么 SPL token' },
  { emoji: '🧾', label: 'Decode this ETH tx: 0x88df016429689c079f3b2f6ad39fa052532c56795b733da78a91ebe6a713944b' },
  { emoji: '🌐', label: 'BTC dominance 现在多少？整个加密市场 24h 涨跌如何？' },
];

function Spinner() {
  return (
    <span className="inline-flex items-center gap-1 text-zinc-400 text-sm">
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-zinc-400" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-zinc-400" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-zinc-400" />
    </span>
  );
}

function renderMarkdownLight(text: string): React.ReactElement[] {
  const lines = text.split('\n');
  const out: React.ReactElement[] = [];
  let buf: string[] = [];
  let inList = false;
  const flushPara = (key: string) => {
    if (buf.length === 0) return;
    const inline = buf.join(' ');
    out.push(<p key={key} dangerouslySetInnerHTML={{ __html: inlineMd(inline) }} />);
    buf = [];
  };
  const flushList = (key: string, items: string[]) => {
    out.push(
      <ul key={key}>
        {items.map((it, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inlineMd(it) }} />
        ))}
      </ul>
    );
  };
  let listBuf: string[] = [];
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        flushPara(`p-${i}`);
        inList = true;
        listBuf = [];
      }
      listBuf.push(line.replace(/^[-*]\s+/, ''));
    } else if (line === '') {
      if (inList) {
        flushList(`ul-${i}`, listBuf);
        listBuf = [];
        inList = false;
      } else {
        flushPara(`p-${i}`);
      }
    } else {
      if (inList) {
        flushList(`ul-${i}`, listBuf);
        listBuf = [];
        inList = false;
      }
      buf.push(line);
    }
  });
  if (inList) flushList('ul-end', listBuf);
  else flushPara('p-end');
  return out;
}

function inlineMd(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

export default function Home() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage({ text: trimmed });
    setInput('');
  };

  const busy = status === 'submitted' || status === 'streaming';

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <header className="sticky top-0 z-10 glass">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold">
              C
            </div>
            <div>
              <div className="text-sm font-semibold">ChainScribe</div>
              <div className="text-[11px] text-zinc-400 -mt-0.5">onchain in plain language</div>
            </div>
          </div>
          <a
            href="https://github.com/cytopia/chain-translator"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition"
          >
            GitHub →
          </a>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 pb-44">
        {messages.length === 0 && (
          <div className="pt-20 pb-10">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              Ask anything onchain.
            </h1>
            <p className="mt-3 text-zinc-400 leading-relaxed">
              A chat assistant that taps the <span className="text-zinc-200">OKX OnchainOS toolkit</span> —
              52 tools covering price, wallets, KOL signals, meme launch safety, sentiment, news. Backed by DeepSeek.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => submit(ex.label)}
                  className="text-left px-4 py-3 rounded-xl glass hover:border-white/15 hover:bg-white/[0.04] transition group"
                >
                  <span className="mr-2">{ex.emoji}</span>
                  <span className="text-sm text-zinc-300 group-hover:text-white">{ex.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-8 space-y-5">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            const text = m.parts
              .filter((p) => p.type === 'text')
              .map((p) => (p as { text: string }).text)
              .join('');
            const toolParts = m.parts.filter((p) => p.type.startsWith('tool-'));
            return (
              <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={
                    isUser
                      ? 'max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-indigo-500/20 border border-indigo-500/30 text-zinc-100'
                      : 'max-w-[92%] rounded-2xl rounded-bl-md px-4 py-3 glass'
                  }
                >
                  {!isUser && toolParts.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {toolParts.map((tp, idx) => {
                        const toolName = tp.type.replace(/^tool-/, '');
                        const state = (tp as { state?: string }).state ?? '';
                        const isOutput = state.includes('output') || state === 'output-available';
                        return (
                          <span
                            key={idx}
                            className={
                              'text-[10.5px] px-2 py-0.5 rounded-md font-mono ' +
                              (isOutput
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                                : 'bg-blue-500/15 text-blue-300 border border-blue-500/20')
                            }
                            title={state}
                          >
                            {isOutput ? '✓' : '⏵'} {toolName}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {text && (
                    <div className={isUser ? 'whitespace-pre-wrap text-[15px]' : 'markdown text-[15px]'}>
                      {isUser ? text : renderMarkdownLight(text)}
                    </div>
                  )}
                  {!text && !isUser && busy && <Spinner />}
                </div>
              </div>
            );
          })}
          {busy && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md px-4 py-3 glass">
                <Spinner />
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              Error: {error.message}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 pointer-events-none">
        <div className="max-w-3xl mx-auto px-5 pb-6 pt-10 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/95 to-transparent pointer-events-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="glass rounded-2xl flex items-end gap-2 p-2.5"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              placeholder="Ask about a token, wallet, tx hash, or market trend…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-[15px] py-2 px-2 outline-none glow-input placeholder:text-zinc-500 max-h-32"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="px-3 py-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
              aria-label="Send"
            >
              {busy ? '…' : '↑'}
            </button>
          </form>
          <div className="text-[11px] text-zinc-500 text-center mt-2">
            Powered by OKX OnchainOS MCP · 52 tools · DeepSeek-V4 · Built for the XAgent × OKX Hackathon
          </div>
        </div>
      </div>
    </div>
  );
}
