import type { Monaco } from '@monaco-editor/react';

export const MONOKAI_THEME = 'monokai';

// Classic Monokai for the editor body. The dark surface is intentional in both
// app themes: the editor reads as a focused code block on light pages too.
const MONOKAI_BASE = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'comment', foreground: '88846f', fontStyle: 'italic' },
    { token: 'string', foreground: 'e6db74' },
    { token: 'string.escape', foreground: 'ae81ff' },
    { token: 'number', foreground: 'ae81ff' },
    { token: 'keyword', foreground: 'f92672' },
    { token: 'keyword.flow', foreground: 'f92672' },
    { token: 'type', foreground: '66d9ef', fontStyle: 'italic' },
    { token: 'type.identifier', foreground: 'a6e22e' },
    { token: 'identifier', foreground: 'f8f8f2' },
    { token: 'delimiter', foreground: 'f8f8f2' },
    { token: 'tag', foreground: 'f92672' },
    { token: 'attribute.name', foreground: 'a6e22e' },
    { token: 'attribute.value', foreground: 'e6db74' },
    { token: 'variable', foreground: 'f8f8f2' },
    { token: 'variable.predefined', foreground: 'ae81ff' },
    { token: 'variable.parameter', foreground: 'fd971f' },
    { token: 'function', foreground: 'a6e22e' },
    { token: 'constant', foreground: 'ae81ff' },
    { token: 'property', foreground: '66d9ef' },
    { token: 'operator', foreground: 'f92672' },
  ],
  colors: {
    'editor.background': '#272822',
    'editor.foreground': '#f8f8f2',
    'editorLineNumber.foreground': '#75715e',
    'editorLineNumber.activeForeground': '#f8f8f2',
    'editor.selectionBackground': '#49483e',
    'editor.lineHighlightBackground': '#3e3d32',
    'editorCursor.foreground': '#f8f8f0',
    'editorIndentGuide.background': '#464741',
    'editorIndentGuide.activeBackground': '#75715e',
  },
};

export function defineMonacoThemes(monaco: Monaco): void {
  monaco.editor.defineTheme(MONOKAI_THEME, MONOKAI_BASE);
}
