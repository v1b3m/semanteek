import * as vscode from "vscode";
import { pipeline } from "@xenova/transformers";
import * as path from "path";
import * as fs from "fs/promises";
import { ensureCollection, upsert } from "./qdrant";
import { randomUUID } from "crypto";
import { OpenAI } from "openai";
import { GoogleAuth } from "google-auth-library";
import { loadConfig } from "./config";

let embedder: any; // cached pipeline instance
let embedFn: (text: string) => Promise<number[]>;

export async function initEmbedder() {
  const cfg = await loadConfig();
  switch (cfg?.provider ?? "local") {
    case "openai":
      return initOpenAI(cfg);
    case "google":
      return initGoogle(cfg);
    default:
      return initLocal();
  }

  // if (embedder) return embedder;
  // embedder = await vscode.window.withProgress(
  //   {
  //     location: vscode.ProgressLocation.Notification,
  //     title: "Semanteek: loading embedding model…",
  //     cancellable: false,
  //   },
  //   () => pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  // );
  // return embedder;
}

async function initOpenAI(cfg: any) {
  const openai = new OpenAI({ apiKey: resolveKey(cfg.apiKey) });
  const model = cfg.model ?? "text-embedding-3-small";
  embedFn = async (text: string) => {
    const r = await openai.embeddings.create({ model, input: text });
    return r.data[0].embedding; // 1536-D by default
  };
}

async function initGoogle(cfg: any) {
  const auth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/cloud-platform",
  });
  const project = await auth.getProjectId();
  const url = `https://textembedding.googleapis.com/v1/projects/${project}/locations/us-central1/models/textembedding-gecko:predict`;
  const client = await auth.getClient();
  embedFn = async (text: string) => {
    const body = { instances: [{ content: text }] };
    const r = await client.request({ url, method: "POST", data: body });
    // @ts-expect-error
    return r.data.predictions[0].embedding; // 768-D
  };
}

async function initLocal() {
  const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  embedFn = async (text: string) => {
    const res = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(res.data);
  };
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
          const vector = await embed(ch.text);
          batch.push({
            id: randomUUID(),
            vector,
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

export const embed = (text: string) => embedFn(text);

function resolveKey(key: string) {
  const m = key?.match(/^\${env\.(.+)}$/);
  return m ? process.env[m[1]] : key;
}
