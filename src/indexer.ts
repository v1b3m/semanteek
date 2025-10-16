import * as vscode from "vscode";
import { pipeline } from "@xenova/transformers";
import * as path from "path";
import * as fs from "fs/promises";
import { ensureCollection, upsert } from "./qdrant";
import { randomUUID } from "crypto";
import { loadConfig } from "./config";

let embedder: any; // cached pipeline instance

export async function initEmbedder() {
  if (embedder) return embedder;
  embedder = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Semanteek: loading embedding model…",
      cancellable: false,
    },
    () => pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  );
  return embedder;
}

export async function indexWorkspace() {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Semanteek: indexing…",
      cancellable: true,
    },
    async (progress, token) => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders) return;
      const root = folders[0].uri.fsPath;

      const cfg = await loadConfig();
      const defaultExclude = [
        "**/node_modules/**",
        "**/venv/**",
        "**/__pycache__/**",
        "**/build/**",
        "**/dist/**",
        "**/target/**",
        "**/.git/**",
        "**/*.min.js",
        "**/.*/**",
      ];
      const excludeGlob = cfg?.exclude || defaultExclude;
      const excludePattern = `{${excludeGlob.join(",")}}`;
      const files = await vscode.workspace.findFiles(
        "**/*.{py,js,ts,jsx,tsx,go,rs,java,c,cpp,h}",
        excludePattern
      );

      await ensureCollection(cfg?.dimension, cfg?.distance);

      await initEmbedder(); // guarantee embedder is ready

      let done = 0;
      const batchSize = 200;
      let batch: any[] = [];

      for (const file of files) {
        if (token.isCancellationRequested) break;

        const rel = path.relative(root, file.fsPath);
        const content = await fs.readFile(file.fsPath, "utf8");
        const chunks = chunkCode(content, 30);

        for (const ch of chunks) {
          const vector = await embedder(ch.text, {
            pooling: "mean",
            normalize: true,
          });
          batch.push({
            id: randomUUID(),
            vector: Array.from(vector.data),
            payload: { file: rel, start: ch.startLine, text: ch.text },
          });

          if (batch.length >= batchSize) {
            await upsert(batch);
            batch = [];
          }
        }

        done++;
        progress.report({
          increment: 100 / files.length,
          message: `${done}/${files.length}`,
        });
      }

      if (batch.length) await upsert(batch);
      vscode.window.showInformationMessage("Semanteek: index complete");
    }
  );
}

function chunkCode(src: string, stride: number) {
  const lines = src.split("\n");
  const out: { text: string; startLine: number }[] = [];
  for (let i = 0; i < lines.length; i += Math.max(stride / 2, 1)) {
    const slice = lines.slice(i, i + stride).join("\n");
    out.push({ text: slice, startLine: i + 1 });
  }
  return out;
}
