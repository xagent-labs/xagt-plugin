'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import type { Extension } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, placeholder as placeholderExt } from '@codemirror/view';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { json as jsonLanguage } from '@codemirror/lang-json';
import { markdown as markdownLanguage } from '@codemirror/lang-markdown';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { tags } from '@lezer/highlight';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="code-block animate-pulse h-32" />,
});

type Language = 'json' | 'markdown' | 'bash' | 'toml' | 'plain';

interface ConfigCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  editorClassName?: string;
  minHeight?: number | string;
  /** Constrain the editor to this height (enables scrolling). Use "100%" to fill parent. */
  height?: number | string;
  padding?: number;
  /** Enable highlighting of <encrypted>...</encrypted> tags */
  highlightEncrypted?: boolean;
  /** Language for syntax highlighting */
  language?: Language;
}

const encryptedTag = Decoration.mark({ class: 'cm-encrypted-tag' });
const encryptedFailedTag = Decoration.mark({ class: 'cm-encrypted-failed-tag' });

const encryptedTagHighlighter = ViewPlugin.fromClass(
  class {
    decorations: ReturnType<typeof Decoration.set>;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: { view: EditorView; docChanged: boolean; viewportChanged: boolean }) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      const failedRegex = /<encrypted-failed(?:\s+v="\d+")?>[\s\S]*?<\/encrypted-failed>/gi;
      const encryptedRegex = /<encrypted(?:\s+v="\d+")?>[\s\S]*?<\/encrypted>/gi;
      const ranges: Array<{ from: number; to: number; deco: Decoration }> = [];

      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        for (const match of text.matchAll(failedRegex)) {
          if (match.index === undefined) continue;
          const start = from + match.index;
          const end = start + match[0].length;
          ranges.push({ from: start, to: end, deco: encryptedFailedTag });
        }
        for (const match of text.matchAll(encryptedRegex)) {
          if (match.index === undefined) continue;
          const start = from + match.index;
          const end = start + match[0].length;
          ranges.push({ from: start, to: end, deco: encryptedTag });
        }
      }

      ranges.sort((a, b) => (a.from === b.from ? a.to - b.to : a.from - b.from));
      for (const range of ranges) {
        builder.add(range.from, range.to, range.deco);
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

function editorTheme(padding: number | undefined): Extension {
  const paddingValue = typeof padding === 'number' ? `${padding}px` : '12px';
  return EditorView.theme(
    {
      '&': {
        backgroundColor: 'transparent',
        color: 'rgb(var(--code-foreground))',
      },
      '&.cm-editor': {
        backgroundColor: 'transparent',
      },
      '.cm-scroller': {
        backgroundColor: 'transparent',
        fontFamily:
          '"JetBrainsMono Nerd Font Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        fontSize: '14px',
        lineHeight: '1.5',
        maxHeight: '100%',
        overflowX: 'auto',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(110, 110, 115, 0.8) transparent',
      },
      '.cm-scroller::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '.cm-scroller::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '.cm-scroller::-webkit-scrollbar-thumb': {
        background: 'rgba(110, 110, 115, 0.8)',
        borderRadius: '4px',
      },
      '.cm-scroller::-webkit-scrollbar-thumb:hover': {
        background: 'rgba(160, 160, 165, 0.9)',
      },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        border: 'none',
        color: 'rgb(var(--foreground-tertiary) / 0.72)',
      },
      '.cm-content': {
        backgroundColor: 'transparent',
        padding: paddingValue,
        caretColor: 'rgb(var(--foreground))',
        fontVariantLigatures: 'none',
        fontFeatureSettings: '"liga" 0, "calt" 0',
        fontKerning: 'none',
        letterSpacing: '0',
      },
      '.cm-placeholder': {
        color: 'rgb(var(--foreground-tertiary) / 0.72)',
      },
      '.cm-activeLine': {
        backgroundColor: 'transparent',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'rgb(var(--accent) / 0.22)',
      },
      '.cm-matchingBracket': {
        backgroundColor: 'rgb(var(--accent) / 0.12)',
        outline: '1px solid rgb(var(--accent) / 0.28)',
      },
      '.cm-encrypted-tag': {
        color: '#f59e0b',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderRadius: '2px',
        padding: '0 2px',
      },
      '.cm-encrypted-failed-tag': {
        color: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderRadius: '2px',
        padding: '0 2px',
        textDecoration: 'line-through',
        textDecorationColor: 'rgba(239, 68, 68, 0.5)',
      },
    }
  );
}

const codeHighlightTheme = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: 'rgb(79 70 229)' },
    { tag: [tags.string, tags.special(tags.string)], color: 'rgb(4 120 87)' },
    { tag: [tags.number, tags.bool, tags.null], color: 'rgb(180 83 9)' },
    { tag: [tags.propertyName, tags.attributeName], color: 'rgb(37 99 235)' },
    { tag: [tags.variableName, tags.definition(tags.variableName)], color: 'rgb(var(--code-foreground))' },
    { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'rgb(var(--foreground-tertiary) / 0.86)' },
    { tag: [tags.heading], color: 'rgb(var(--foreground))', fontWeight: '600' },
    { tag: [tags.link], color: 'rgb(67 56 202)', textDecoration: 'underline' },
    { tag: [tags.invalid], color: 'rgb(185 28 28)' },
  ])
);

export function ConfigCodeEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  editorClassName,
  minHeight = '100%',
  height,
  padding = 12,
  highlightEncrypted = false,
  language = 'plain',
}: ConfigCodeEditorProps) {
  // Check if value contains encrypted tags for visual indicator
  const hasEncryptedContent = highlightEncrypted && /<encrypted(?:\s+v="\d+")?>/i.test(value);
  const hasFailedEncryptedContent = highlightEncrypted && /<encrypted-failed/i.test(value);

  const extensions = useMemo<Extension[]>(() => {
    const list: Extension[] = [editorTheme(padding), codeHighlightTheme, EditorView.lineWrapping];
    if (placeholder) {
      list.push(placeholderExt(placeholder));
    }
    if (highlightEncrypted) {
      list.push(encryptedTagHighlighter);
    }
    switch (language) {
      case 'json':
        list.push(jsonLanguage());
        break;
      case 'markdown':
        list.push(markdownLanguage());
        break;
      case 'bash':
        list.push(StreamLanguage.define(shell));
        break;
      case 'toml':
        list.push(StreamLanguage.define(toml));
        break;
      default:
        break;
    }
    return list;
  }, [highlightEncrypted, language, padding, placeholder]);

  return (
    <div
      className={cn(
        'code-block p-0 focus-within:border-indigo-500/50 transition-colors relative overflow-hidden',
        disabled && 'opacity-60',
        className
      )}
      aria-disabled={disabled}
    >
      {hasFailedEncryptedContent && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30 pointer-events-none z-10">
          ⚠️ Decryption failed - re-enter values
        </div>
      )}
      {hasEncryptedContent && !hasFailedEncryptedContent && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 pointer-events-none z-10">
          Contains encrypted values
        </div>
      )}
      <CodeMirror
        value={value}
        onChange={onChange}
        editable={!disabled}
        extensions={extensions}
        theme="none"
        minHeight={typeof minHeight === 'number' ? `${minHeight}px` : minHeight}
        height={height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined}
        className={cn('config-code-editor', height && 'h-full', editorClassName)}
        basicSetup={{
          lineNumbers: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          foldGutter: false,
          bracketMatching: true,
          closeBrackets: true,
        }}
      />
    </div>
  );
}
