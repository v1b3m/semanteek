import * as vscode from "vscode";
import {
  initEmbedder,
  indexWorkspace,
  indexFiles,
  removeFiles,
} from "./indexer";
import { activateSearch, semanticSearch } from "./search";
import { SearchPanelProvider } from "./searchPanel";
import { SearchInputProvider } from "./searchInputProvider";
import { loadConfig } from "./config";

export async function activate(context: vscode.ExtensionContext) {
  // preload the model once at start-up so the first index is faster
  await initEmbedder();

  activateSearch(context);

  // Create search panel provider
  const searchPanelProvider = new SearchPanelProvider();
  const searchInputProvider = new SearchInputProvider(
    context.extensionUri,
    searchPanelProvider
  );

  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{py,js,ts,jsx,tsx,go,rs,java,c,cpp,h}"
  );

  const cfg = await loadConfig();

  if (cfg?.watch) {
    watcher.onDidChange((uri) => indexFiles([uri])); // file modified
    watcher.onDidCreate((uri) => indexFiles([uri])); // new file
    watcher.onDidDelete((uri) => removeFiles([uri])); // file deleted
  }

  // Register the providers
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "semanteek.searchPanel",
      searchPanelProvider
    ),
    vscode.window.registerWebviewViewProvider(
      "semanteek.searchInput",
      searchInputProvider
    ),
    vscode.commands.registerCommand("semanteek.index", indexWorkspace),
    vscode.commands.registerCommand("semanteek.search", () =>
      semanticSearch(searchPanelProvider)
    ),
    vscode.commands.registerCommand("semanteek.searchInPanel", () =>
      searchPanelProvider.searchFromCommand()
    ),
    vscode.commands.registerCommand("semanteek.refresh", () =>
      searchPanelProvider.refresh()
    ),
    vscode.commands.registerCommand("semanteek.clear", () =>
      searchPanelProvider.clearResults()
    ),
    watcher
  );
}

export function deactivate() {}
