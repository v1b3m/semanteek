import * as vscode from "vscode";
import { initEmbedder, indexWorkspace } from "./indexer";
import { activateSearch, semanticSearch } from "./search";
import { SearchPanelProvider } from "./searchPanel";

export async function activate(context: vscode.ExtensionContext) {
  // preload the model once at start-up so the first index is faster
  await initEmbedder();

  activateSearch(context);

  // Create search panel provider
  const searchPanelProvider = new SearchPanelProvider();

  // Register the providers
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "semanteek.searchPanel",
      searchPanelProvider
    ),
    vscode.commands.registerCommand("semanteek.index", indexWorkspace),
    vscode.commands.registerCommand("semanteek.search", semanticSearch),
    vscode.commands.registerCommand("semanteek.searchInPanel", () =>
      searchPanelProvider.searchFromCommand()
    ),
    vscode.commands.registerCommand("semanteek.refresh", () =>
      searchPanelProvider.refresh()
    ),
    vscode.commands.registerCommand("semanteek.clear", () =>
      searchPanelProvider.clearResults()
    )
  );
}

export function deactivate() {}
