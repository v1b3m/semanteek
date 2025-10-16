import * as vscode from "vscode";
import { SearchPanelProvider } from "./searchPanel";

export class SearchInputProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "semanteek.searchInput";

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly searchPanelProvider: SearchPanelProvider
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "search":
            this.searchPanelProvider.performSearch(message.query);
            return;
          case "clear":
            this.searchPanelProvider.clearResults();
            return;
          case "index":
            vscode.commands.executeCommand("semanteek.index");
            return;
        }
      },
      undefined,
      []
    );
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Semanteek Search</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 8px;
            box-sizing: border-box;
        }
        
        .search-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .search-input-container {
            display: flex;
            gap: 4px;
            align-items: center;
        }
        
        .search-input {
            flex: 1;
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 2px;
            font-family: inherit;
            font-size: inherit;
        }
        
        .search-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .search-input::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        
        .search-button {
            padding: 6px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-family: inherit;
            font-size: inherit;
            transition: background-color 0.2s;
        }
        
        .search-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .search-button:active {
            background-color: var(--vscode-button-activeBackground);
        }
        
        .clear-button {
            padding: 4px 8px;
            background-color: transparent;
            color: var(--vscode-foreground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 2px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            transition: all 0.2s;
        }
        
        .clear-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .status-text {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
            margin-top: 4px;
        }
        
        .index-button {
            width: 100%;
            padding: 6px 8px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            margin-top: 4px;
            transition: background-color 0.2s;
        }
        
        .index-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="search-container">
        <div class="search-input-container">
            <input 
                type="text" 
                class="search-input" 
                placeholder="Search your codebase semantically..." 
                id="searchInput"
            />
            <button class="search-button" id="searchButton">Search</button>
        </div>
        <button class="clear-button" id="clearButton">Clear Results</button>
        <button class="index-button" id="indexButton">Index Workspace</button>
        <div class="status-text" id="statusText">Enter a search query above</div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const clearButton = document.getElementById('clearButton');
        const indexButton = document.getElementById('indexButton');
        const statusText = document.getElementById('statusText');

        function performSearch() {
            const query = searchInput.value.trim();
            if (query) {
                statusText.textContent = 'Searching...';
                vscode.postMessage({
                    command: 'search',
                    query: query
                });
            }
        }

        function clearResults() {
            searchInput.value = '';
            statusText.textContent = 'Enter a search query above';
            vscode.postMessage({
                command: 'clear'
            });
        }

        function indexWorkspace() {
            statusText.textContent = 'Indexing workspace...';
            vscode.postMessage({
                command: 'index'
            });
        }

        searchButton.addEventListener('click', performSearch);
        clearButton.addEventListener('click', clearResults);
        indexButton.addEventListener('click', indexWorkspace);

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // Focus the input when the view becomes visible
        searchInput.focus();
    </script>
</body>
</html>`;
  }
}
