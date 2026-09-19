import { useCallback, useRef } from 'react';
import { highlightCode, HighlightLanguage } from '../lib/highlight';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  language?: HighlightLanguage;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  label,
  language = 'javascript',
  readOnly = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (preRef.current) {
      preRef.current.scrollTop = textarea.scrollTop;
      preRef.current.scrollLeft = textarea.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = textarea.scrollTop;
    }
  }, []);

  const lineCount = value ? value.split('\n').length : 1;
  const highlighted = highlightCode(value, language);

  return (
    <div className="flex h-full overflow-hidden bg-[#0c0a12] border border-zinc-800 rounded-lg font-mono text-xs leading-5">
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="shrink-0 select-none overflow-hidden text-right text-zinc-600 bg-zinc-900/60 border-r border-zinc-800 px-2 py-2 leading-5"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <div className="relative flex-1 min-w-0">
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 m-0 overflow-hidden px-2 py-2 leading-5 whitespace-pre text-zinc-100 pointer-events-none font-mono"
        >
          <code
            className={`code-highlight language-${language}`}
            dangerouslySetInnerHTML={{ __html: `${highlighted}\n` }}
          />
        </pre>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          readOnly={readOnly}
          aria-label={label}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="relative h-full w-full resize-none overflow-auto border-0 bg-transparent px-2 py-2 leading-5 whitespace-pre text-transparent caret-zinc-100 outline-none font-mono"
        />
      </div>
    </div>
  );
}
