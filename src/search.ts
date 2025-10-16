import * as vscode from "vscode";
import { pipeline } from "@xenova/transformers";
import { search } from "./qdrant";
let embedder: any;

export async function activateSearch(context: vscode.ExtensionContext) {
  embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
}

export async function semanticSearch() {
  const query = await vscode.window.showInputBox({
    placeHolder: 'e.g. "where do we handle OAuth refresh tokens?"',
  });
  if (!query) return;
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Searching…" },
    async () => {
      const vector = await embedder(query, {
        pooling: "mean",
        normalize: true,
      });
      const hits = await search(Array.from(vector.data), 12);
      if (hits.length === 0) {
        vscode.window.showInformationMessage("No matches");
        return;
      }
      const panel = vscode.window.createWebviewPanel(
        "semanteekResults",
        "Semanteek results",
        vscode.ViewColumn.Two,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(vscode.Uri.file(__dirname), "..", "media"),
          ],
        }
      );
      const html = renderWebview(hits, panel.webview);
      panel.webview.html = html;

      // Allow clicking a result to open the file
      panel.webview.onDidReceiveMessage((msg) => {
        if (msg.command === "open") {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (workspaceFolder) {
            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, msg.file);
            vscode.workspace.openTextDocument(fileUri).then((doc) =>
              vscode.window.showTextDocument(doc, {
                selection: new vscode.Range(msg.line - 1, 0, msg.line - 1, 0),
              })
            );
          }
        }
      });
    }
  );
}

function renderWebview(hits: any[], webview: vscode.Webview): string {
  const markdownContent = hits
    .map(
      (h, idx) => `## ${idx + 1}. ${h.payload.file}:${h.payload.start}

\`\`\`${getLanguageFromFile(h.payload.file)}
${h.payload.text}
\`\`\`

[Open file](command:semanteek.openFile?${encodeURIComponent(
        JSON.stringify({ file: h.payload.file, line: h.payload.start })
      )})
`
    )
    .join("\n---\n");

  const fullMarkdown = `# Semantic Search Results

${markdownContent}`;

  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { 
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; 
        line-height: 1.5; 
        max-width: 1200px; 
        margin: 0 auto; 
        padding: 16px;
        background: #2E3440; /* nord0 - dark background */
        color: #D8DEE9; /* nord4 - light text */
        font-size: 14px;
      }
      .markdown-body { 
        background: #3B4252; /* nord1 - slightly lighter dark background */
        padding: 16px; 
        border-radius: 8px; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        border: 1px solid #4C566A; /* nord3 - subtle border */
      }
      h1 { 
        color: #ECEFF4; /* nord6 - brightest text */
        border-bottom: 2px solid #5E81AC; /* nord9 - blue accent */
        padding-bottom: 8px; 
        margin-bottom: 16px;
        font-size: 24px;
        font-weight: 600;
      }
      h2 { 
        color: #88C0D0; /* nord7 - cyan */
        margin-top: 16px; 
        margin-bottom: 8px;
        font-size: 18px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      h2::before {
        content: "▶";
        font-size: 12px;
        color: #5E81AC;
      }
      h3 { 
        color: #A3BE8C; /* nord14 - green */
        margin-top: 12px;
        margin-bottom: 8px;
        font-size: 16px;
      }
      .code-block {
        background: #2E3440; /* nord0 - dark background for code */
        color: #D8DEE9; /* nord4 - light text */
        padding: 12px 16px; 
        border-radius: 6px; 
        overflow-x: auto;
        border: 1px solid #4C566A; /* nord3 - subtle border */
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
        margin: 8px 0;
        position: relative;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.4;
      }
      .code-block::before {
        content: attr(data-lang);
        position: absolute;
        top: 4px;
        right: 8px;
        background: #4C566A;
        color: #D8DEE9;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        text-transform: uppercase;
        opacity: 0.7;
      }
      .code-block code {
        background: none;
        border: none;
        padding: 0;
        color: inherit;
        font-size: inherit;
      }
      .inline-code { 
        background: #434C5E; /* nord2 - dark background for inline code */
        color: #E5E9F0; /* nord5 - light text */
        padding: 2px 4px; 
        border-radius: 3px; 
        font-size: 12px;
        border: 1px solid #4C566A; /* nord3 - subtle border */
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      }
      .file-link { 
        color: #81A1C1; /* nord8 - blue */
        text-decoration: none; 
        font-weight: 500;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(129, 161, 193, 0.1);
        border: 1px solid rgba(129, 161, 193, 0.2);
        font-size: 12px;
        margin-top: 4px;
      }
      .file-link::before {
        content: "📁";
        font-size: 10px;
      }
      .file-link:hover { 
        color: #88C0D0; /* nord7 - cyan on hover */
        background: rgba(136, 192, 208, 0.15);
        border-color: rgba(136, 192, 208, 0.3);
        transform: translateY(-1px);
      }
      .separator { 
        border: none; 
        border-top: 1px solid #4C566A; /* nord3 - subtle border */
        margin: 12px 0; 
        opacity: 0.5;
      }
      /* Syntax highlighting for common languages */
      .token.keyword { color: #81A1C1; font-weight: 500; }
      .token.string { color: #A3BE8C; }
      .token.number { color: #B48EAD; }
      .token.comment { color: #4C566A; font-style: italic; opacity: 0.8; }
      .token.function { color: #88C0D0; }
      .token.class-name { color: #A3BE8C; }
      .token.operator { color: #81A1C1; }
      .token.punctuation { color: #D8DEE9; }
      .token.boolean { color: #B48EAD; }
      .token.null { color: #B48EAD; }
      .token.undefined { color: #B48EAD; }
      /* Custom scrollbar for dark theme */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: #2E3440; /* nord0 */
        border-radius: 3px;
      }
      ::-webkit-scrollbar-thumb {
        background: #4C566A; /* nord3 */
        border-radius: 3px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #5E81AC; /* nord9 */
      }
    </style>
  </head>
  <body>
    <div class="markdown-body">
      ${renderMarkdown(fullMarkdown)}
    </div>
    <script>
      const vscode = acquireVsCodeApi();
      
      // Handle command links
      document.addEventListener('click', function(e) {
        if (e.target.tagName === 'A' && e.target.href.startsWith('command:')) {
          e.preventDefault();
          const command = e.target.href.replace('command:', '');
          const [cmd, ...args] = command.split('?');
          if (args.length > 0) {
            const params = JSON.parse(decodeURIComponent(args[0]));
            vscode.postMessage({command: 'open', file: params.file, line: params.line});
          }
        }
      });
    </script>
  </body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function getLanguageFromFile(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const languageMap: { [key: string]: string } = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    yaml: "yaml",
    yml: "yaml",
    json: "json",
    xml: "xml",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    sql: "sql",
    md: "markdown",
    dockerfile: "dockerfile",
    makefile: "makefile",
  };
  return languageMap[ext || ""] || "";
}

function highlightCode(code: string, language: string): string {
  if (!language) return escapeHtml(code);

  const escaped = escapeHtml(code);

  // Simple syntax highlighting patterns
  const patterns: { [key: string]: Array<[RegExp, string]> } = {
    javascript: [
      [
        /\b(const|let|var|function|if|else|for|while|return|import|export|from|class|extends|async|await|try|catch|finally|throw|new|this|super|typeof|instanceof|in|of|with|switch|case|default|break|continue|do|while|for|in|of)\b/g,
        "keyword",
      ],
      [/"([^"\\]|\\.)*"/g, "string"],
      [/'([^'\\]|\\.)*'/g, "string"],
      [/\b\d+\.?\d*\b/g, "number"],
      [/\/\/.*$/gm, "comment"],
      [/\/\*[\s\S]*?\*\//g, "comment"],
    ],
    typescript: [
      [
        /\b(const|let|var|function|if|else|for|while|return|import|export|from|class|extends|async|await|try|catch|finally|throw|new|this|super|typeof|instanceof|in|of|with|switch|case|default|break|continue|do|while|for|in|of|interface|type|enum|namespace|module|declare|public|private|protected|readonly|static|abstract|implements|extends|as|is|keyof|infer|never|unknown|any|void|string|number|boolean|object|array|tuple|union|intersection)\b/g,
        "keyword",
      ],
      [/"([^"\\]|\\.)*"/g, "string"],
      [/'([^'\\]|\\.)*'/g, "string"],
      [/\b\d+\.?\d*\b/g, "number"],
      [/\/\/.*$/gm, "comment"],
      [/\/\*[\s\S]*?\*\//g, "comment"],
    ],
    python: [
      [
        /\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|lambda|and|or|not|in|is|None|True|False|pass|break|continue|raise|assert|del|global|nonlocal|async|await)\b/g,
        "keyword",
      ],
      [/"([^"\\]|\\.)*"/g, "string"],
      [/'([^'\\]|\\.)*'/g, "string"],
      [/\b\d+\.?\d*\b/g, "number"],
      [/#.*$/gm, "comment"],
    ],
    go: [
      [
        /\b(package|import|func|var|const|type|struct|interface|if|else|for|range|switch|case|default|break|continue|fallthrough|goto|defer|go|chan|select|return|map|slice|make|new|len|cap|append|copy|delete|close|panic|recover)\b/g,
        "keyword",
      ],
      [/"([^"\\]|\\.)*"/g, "string"],
      [/'([^'\\]|\\.)*'/g, "string"],
      [/\b\d+\.?\d*\b/g, "number"],
      [/\/\/.*$/gm, "comment"],
      [/\/\*[\s\S]*?\*\//g, "comment"],
    ],
    rust: [
      [
        /\b(fn|let|mut|const|static|if|else|match|for|while|loop|break|continue|return|pub|priv|struct|enum|impl|trait|use|mod|crate|super|self|Self|as|where|type|dyn|unsafe|extern|move|ref|ref mut|box|vec|option|result|some|none|ok|err|true|false|if let|while let|for|in|break|continue|return|yield|async|await|dyn|impl|trait|where|type|use|mod|crate|super|self|Self|as|move|ref|ref mut|box|vec|option|result|some|none|ok|err|true|false)\b/g,
        "keyword",
      ],
      [/"([^"\\]|\\.)*"/g, "string"],
      [/'([^'\\]|\\.)*'/g, "string"],
      [/\b\d+\.?\d*\b/g, "number"],
      [/\/\/.*$/gm, "comment"],
      [/\/\*[\s\S]*?\*\//g, "comment"],
    ],
  };

  let highlighted = escaped;
  const langPatterns = patterns[language];

  if (langPatterns) {
    for (const [pattern, className] of langPatterns) {
      highlighted = highlighted.replace(
        pattern,
        `<span class="token ${className}">$&</span>`
      );
    }
  }

  return highlighted;
}

function renderMarkdown(markdown: string): string {
  return (
    markdown
      // Headers
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      // Code blocks with language detection
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || "";
        const highlightedCode = highlightCode(code.trim(), language);
        return `<pre class="code-block" data-lang="${language}"><code class="language-${language}">${highlightedCode}</code></pre>`;
      })
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // Links
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="file-link">$1</a>'
      )
      // Horizontal rules
      .replace(/^---$/gim, '<hr class="separator">')
      // Line breaks
      .replace(/\n/g, "<br>")
  );
}
