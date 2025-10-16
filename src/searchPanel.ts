import * as vscode from "vscode";
import { pipeline } from "@xenova/transformers";
import { search } from "./qdrant";

export interface SearchResult {
  file: string;
  line: number;
  content: string;
  score: number;
}

export class SearchResultItem extends vscode.TreeItem {
  constructor(
    public readonly result: SearchResult,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(result.file, collapsibleState);
    this.tooltip = `${result.file}:${result.line}\n${result.content}`;
    this.description = `Line ${result.line}`;

    // Convert relative path to absolute path
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const absolutePath = workspaceFolder
      ? vscode.Uri.joinPath(workspaceFolder.uri, result.file)
      : vscode.Uri.file(result.file);

    this.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [
        absolutePath,
        { selection: new vscode.Range(result.line - 1, 0, result.line - 1, 0) },
      ],
    };
  }
}

export class SearchPanelProvider
  implements vscode.TreeDataProvider<SearchResultItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    SearchResultItem | undefined | null | void
  > = new vscode.EventEmitter<SearchResultItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    SearchResultItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private searchResults: SearchResult[] = [];
  private embedder: any = null;

  constructor() {
    this.initializeEmbedder();
  }

  async searchFromCommand(): Promise<void> {
    const query = await vscode.window.showInputBox({
      placeHolder: 'e.g. "where do we handle OAuth refresh tokens?"',
      prompt: "Enter your semantic search query",
    });
    if (query) {
      await this.performSearch(query);
    }
  }

  private async initializeEmbedder() {
    try {
      this.embedder = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );
    } catch (error) {
      console.error("Failed to initialize embedder:", error);
    }
  }

  async performSearch(query: string): Promise<void> {
    if (!this.embedder) {
      vscode.window.showErrorMessage(
        "Search model is still loading. Please try again in a moment."
      );
      return;
    }

    if (!query.trim()) {
      this.searchResults = [];
      this._onDidChangeTreeData.fire();
      return;
    }

    try {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "Searching…" },
        async () => {
          const vector = await this.embedder(query, {
            pooling: "mean",
            normalize: true,
          });
          const hits = await search(Array.from(vector.data), 12);

          // Convert hits to SearchResult format
          this.searchResults = hits.map((hit: any) => ({
            file: hit.payload.file,
            line: hit.payload.start,
            content: hit.payload.content || "",
            score: hit.score,
          }));

          // Deduplicate by file name, keeping the first occurrence
          const seenFiles = new Set();
          this.searchResults = this.searchResults.filter((result) => {
            if (seenFiles.has(result.file)) {
              return false;
            }
            seenFiles.add(result.file);
            return true;
          });

          this._onDidChangeTreeData.fire();
        }
      );
    } catch (error) {
      console.error("Search failed:", error);
      vscode.window.showErrorMessage("Search failed. Please try again.");
    }
  }

  getTreeItem(element: SearchResultItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SearchResultItem): Thenable<SearchResultItem[]> {
    if (!element) {
      return Promise.resolve(
        this.searchResults.map(
          (result) =>
            new SearchResultItem(result, vscode.TreeItemCollapsibleState.None)
        )
      );
    }
    return Promise.resolve([]);
  }

  clearResults(): void {
    this.searchResults = [];
    this._onDidChangeTreeData.fire();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}
