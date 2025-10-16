import * as vscode from "vscode";
import { initEmbedder, indexWorkspace } from "./indexer";
import { activateSearch, semanticSearch } from "./search";
import { SearchPanelProvider } from "./searchPanel";
import { SearchInputProvider } from "./searchInputProvider";

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
