# Semanteek

**Natural-language search inside your codebase**

Semanteek is a VS Code extension that enables semantic search across your codebase using vector embeddings. Instead of searching for exact text matches, you can search using natural language queries to find relevant code based on meaning and context.

## Features

- 🔍 **Semantic Search**: Find code using natural language queries
- 📁 **Multi-language Support**: Works with Python, JavaScript, TypeScript, Go, Rust, Java, C/C++, and more
- ⚡ **Real-time Indexing**: Automatically indexes new and modified files
- 🎯 **Contextual Results**: Get relevant code snippets with file locations and line numbers
- 🔧 **Multiple Embedding Providers**: Support for local models, OpenAI, and Google Cloud
- 📊 **Vector Database**: Uses Qdrant for efficient vector storage and retrieval

## Installation

1. Install the extension from the VS Code marketplace
2. Open your workspace in VS Code
3. The extension will automatically create a search panel in the sidebar

## Quick Start

1. **Index your workspace**: Run `Semanteek: Index workspace` from the Command Palette (Ctrl/Cmd+Shift+P)
2. **Search**: Use the search input in the Semanteek panel or run `Semanteek: Semantic search`
3. **View results**: Browse through the search results in the panel

## Configuration

Create a `.semantic-search.json` file in your workspace root to customize Semanteek's behavior:

```json
{
  "collection": "my_project_vectors",
  "provider": "local",
  "watch": true,
  "exclude": [
    "**/node_modules/**",
    "**/venv/**",
    "**/__pycache__/**",
    "**/build/**",
    "**/dist/**",
    "**/target/**",
    "**/.git/**",
    "**/*.min.js",
    "**/.*/**"
  ],
  "chunkSize": 30,
  "dimension": 384,
  "distance": "Cosine"
}
```

### Configuration Options

| Option       | Type     | Default                    | Description                                                       |
| ------------ | -------- | -------------------------- | ----------------------------------------------------------------- |
| `collection` | string   | `{workspace_name}_vectors` | Name of the Qdrant collection                                     |
| `provider`   | string   | `"local"`                  | Embedding provider: `"local"`, `"openai"`, or `"google"`          |
| `watch`      | boolean  | `false`                    | Automatically index files when they change                        |
| `exclude`    | string[] | See above                  | Glob patterns for files to exclude from indexing                  |
| `chunkSize`  | number   | `30`                       | Number of lines per code chunk                                    |
| `dimension`  | number   | `384`                      | Vector dimension (384 for local, 1536 for OpenAI, 768 for Google) |
| `distance`   | string   | `"Cosine"`                 | Distance metric: `"Cosine"`, `"Dot"`, or `"Euclid"`               |
| `model`      | string   | `"text-embedding-3-small"` | Model name (OpenAI only)                                          |
| `apiKey`     | string   | -                          | API key for external providers                                    |

### Provider-Specific Configuration

#### Local Provider (Default)
Uses the `Xenova/all-MiniLM-L6-v2` model locally. No additional configuration needed.

```json
{
  "provider": "local"
}
```

#### OpenAI Provider
Requires an OpenAI API key.

```json
{
  "provider": "openai",
  "apiKey": "${env.OPENAI_API_KEY}",
  "model": "text-embedding-3-small",
  "dimension": 1536
}
```

#### Google Cloud Provider
Requires Google Cloud authentication.

```json
{
  "provider": "google",
  "apiKey": "${env.GOOGLE_APPLICATION_CREDENTIALS}",
  "dimension": 768
}
```

### Environment Variables

You can use environment variables in your configuration:

```json
{
  "apiKey": "${env.OPENAI_API_KEY}"
}
```

## Commands

- `Semanteek: Index workspace` - Index all files in the workspace
- `Semanteek: Semantic search` - Open search dialog
- `Semanteek: Search` - Search from the panel
- `Semanteek: Refresh` - Refresh search results
- `Semanteek: Clear Results` - Clear current search results

## Supported File Types

- Python (`.py`)
- JavaScript (`.js`)
- TypeScript (`.ts`)
- JSX (`.jsx`)
- TSX (`.tsx`)
- Go (`.go`)
- Rust (`.rs`)
- Java (`.java`)
- C/C++ (`.c`, `.cpp`, `.h`)

## How It Works

1. **Indexing**: Code files are split into chunks and converted to vector embeddings
2. **Storage**: Embeddings are stored in a Qdrant vector database
3. **Search**: Your query is converted to a vector and compared against stored embeddings
4. **Results**: Most similar code chunks are returned with context and file locations

## Requirements

- VS Code 1.74.0 or higher
- Node.js (for local embedding model)
- Qdrant vector database (automatically managed)

## Troubleshooting

### New files not being indexed
- Ensure `watch: true` is set in your configuration
- Check that the file extension is supported
- Try manually running "Semanteek: Index workspace"

### Search not returning results
- Make sure your workspace has been indexed
- Check the Qdrant connection
- Verify your embedding provider configuration

### Performance issues
- Reduce `chunkSize` for smaller chunks
- Add more patterns to `exclude` to skip unnecessary files
- Use a more powerful embedding provider

## Development

```bash
# Install dependencies
npm install

# Build the extension
npm run vscode:prepublish

# Run in development mode
# Press F5 in VS Code to launch a new Extension Development Host window
```

## License

MIT License - see LICENSE file for details.
