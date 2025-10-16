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
  const rows = hits
    .map(
      (h, idx) =>
        `<tr>
        <td>${idx + 1}</td>
        <td>
          <code>
            ${h.payload.file}:${h.payload.start}
          </code>
        </td>
        <td>
          <pre>${escapeHtml(h.payload.text)}</pre>
        </td>
        <td>
          <button onclick="openFile('${h.payload.file}', ${h.payload.start})">
            Go
          </button>
        </td>
      </tr>`
    )
    .join("");
  return `<!DOCTYPE html>
  <html>
  <head>
    <style>table{font-size:12px;} pre{background:#f6f8fa;padding:4px;}</style>
  </head>
  <body>
    <h3>Semantic search results</h3>
    <table border="1">${rows}</table>
    <script>
      const vscode = acquireVsCodeApi();
      function openFile(f,l){ vscode.postMessage({command:'open', file:f, line:l}) }
    </script>
  </body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}
