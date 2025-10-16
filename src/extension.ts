import * as vscode from "vscode";
import { initEmbedder, indexWorkspace } from "./indexer";
import { activateSearch, semanticSearch } from "./search";

export async function activate(context: vscode.ExtensionContext) {
  // preload the model once at start-up so the first index is faster
  await initEmbedder();

  activateSearch(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("semanteek.index", indexWorkspace),
    vscode.commands.registerCommand("semanteek.search", semanticSearch)
  );
}

export function deactivate() {}
