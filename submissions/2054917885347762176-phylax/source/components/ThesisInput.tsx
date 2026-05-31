"use client";

import { motion } from "framer-motion";
import { Terminal, Sparkles, CornerDownLeft, AlertCircle, Lightbulb } from "lucide-react";
import { useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

const EXAMPLE = "Copy top KOL signals on X Layer under $50, conservative mode, skip risky tokens";

const SUGGESTIONS = [
  "Find high-volume KOL signals on X Layer, budget $50",
  "Show smart money buys under $100, skip honeypots",
  "Conservative scan of trending tokens on Base L2",
];

function validateThesis(t: string): string | null {
  const trimmed = t.trim();
  if (trimmed.length === 0) return null; // empty = not yet typed, don't show error
  if (trimmed.length < 10) return "Enter a real trading thesis, token idea, or KOL signal to analyze.";
  if (trimmed.split(/\s+/).length < 3) return "Too short — describe what tokens, chain, or strategy you want.";
  const noiseWords = ["hi", "hello", "hey", "test", "asdf", "123", "aaa", "abc"];
  if (noiseWords.includes(trimmed.toLowerCase())) return "That doesn't look like a trading thesis. Try the example or a suggestion below.";
  return null;
}

export function ThesisInput({ value, onChange, onSubmit, disabled }: Props) {
  const [touched, setTouched] = useState(false);
  const validationError = validateThesis(value);
  const showError = touched && validationError;
  const isEmpty = value.trim().length === 0;
  const isValid = !validationError && !isEmpty;

  const loadExample = () => { onChange(EXAMPLE); setTouched(false); };
  const handleSubmit = () => {
    setTouched(true);
    if (!validationError && !isEmpty) onSubmit();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/60 backdrop-blur rounded-3xl border border-border overflow-hidden focus-within:border-electric/50 focus-within:shadow-glow transition-all duration-500 shadow-soft"
    >
      <div className="px-5 sm:px-6 py-4 bg-white/40 border-b border-border/50 flex items-center gap-3">
        <div className="grid place-items-center h-8 w-8 rounded-lg bg-electric/10 text-electric shrink-0">
          <Terminal className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em]">Step 1 — Trading Thesis</span>
        </div>
        <button 
          onClick={loadExample}
          disabled={disabled}
          aria-label="Load example thesis"
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-electric/10 text-electric hover:bg-electric/20 text-xs font-bold transition-colors border border-electric/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-3 h-3" />
          <span className="hidden sm:inline">Example</span>
        </button>
      </div>
      
      <div className="p-5 sm:p-6 relative group">
        <textarea
          className="w-full bg-transparent text-foreground placeholder-muted-foreground/50 focus:outline-none resize-none text-lg sm:text-xl font-medium leading-relaxed"
          placeholder="Describe your strategy. Example: Find top KOL signals on X Layer under $50..."
          value={value}
          onChange={(e) => { onChange(e.target.value); setTouched(false); }}
          rows={3}
          disabled={disabled}
          maxLength={500}
          aria-label="Trading thesis input"
          aria-invalid={showError ? "true" : "false"}
        />

        {/* Quick suggestions — show when empty and not disabled */}
        {isEmpty && !disabled && (
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => { onChange(s); setTouched(false); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 hover:bg-electric/10 hover:text-electric border border-border hover:border-electric/20 text-xs text-muted-foreground transition-colors"
              >
                <Lightbulb className="w-3 h-3" />
                <span className="truncate max-w-[200px]">{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 sm:px-6 py-4 bg-white/40 border-t border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {showError ? (
            <div className="flex items-center gap-2 text-destructive text-xs font-medium bg-destructive/10 px-3 py-1.5 rounded-full w-fit border border-destructive/20">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          ) : isEmpty ? (
            <span className="text-xs text-muted-foreground/60 font-medium">Enter a trading thesis to begin analysis</span>
          ) : isValid ? (
            <span className="text-xs text-emerald-600 font-medium">✓ Ready to analyze</span>
          ) : (
            <span className="text-xs text-muted-foreground font-mono font-medium">{value.length} / 500</span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled || isEmpty}
          aria-label="Run the trading agent"
          className={`group relative flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all duration-500 overflow-hidden shadow-soft shrink-0 w-full sm:w-auto justify-center ${
            disabled || isEmpty
              ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
              : "bg-gradient-brand hover:shadow-glow text-white hover:-translate-y-0.5"
          }`}
        >
          <span className="relative z-10">Run Agent</span>
          <CornerDownLeft className="w-4 h-4 opacity-80 relative z-10" />
        </button>
      </div>
    </motion.div>
  );
}
