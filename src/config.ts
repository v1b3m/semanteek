import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";

export interface RepoConfig {
  collection: string;
  dimension?: number;
  distance?: "Cosine" | "Dot" | "Euclid";
  model?: string;
  exclude?: string[];
  chunkSize?: number;
  overlap?: number;
}

export async function loadConfig(): Promise<RepoConfig | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) return;
  const uri = vscode.Uri.joinPath(folders[0].uri, ".semantic-search.json");
  try {
    const data = await fs.readFile(uri.fsPath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    vscode.window.showWarningMessage(
      "No .semantic-search.json found – using defaults."
    );
    return { collection: path.basename(folders[0].uri.fsPath) + "_vectors" };
  }
}
