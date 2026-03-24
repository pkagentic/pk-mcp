# PK Agent MCP Server Installation

This MCP server provides tools for AI agents (like Claude Desktop) to interact with the **PK Agentic** WordPress plugin via its External Agent API.

**Compatible with PK Agentic 1.8+**

## Prerequisites

1.  **Node.js** (v18 or newer recommended).
2.  **PK Agentic Plugin** installed and configured on your WordPress site.
3.  **Agent API Enabled** in WordPress (**PK Agentic -> Settings -> Agent API**).
4.  **API Key Generated** in same settings page (**PK Agentic -> Settings -> Agent API**).
5.  **Agent Email** known (the email address assigned to the key during generation).

> **Note:** The API Key and Email are required for the MCP server to authenticate with your WordPress site.

## Setup Instructions

### 1. Install Dependencies

Navigate to the `pk-mcp` directory and install dependencies:

```bash
cd pk-mcp
npm install
```

### 2. Add to Claude Desktop (or other MCP Client)

To use this with Claude Desktop, edit your `claude_desktop_config.json`:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the following configuration, making sure to provide your actual WordPress site details in the `env` section:

```json
{
  "mcpServers": {
    "pk-agent": {
      "command": "node",
      "args": [
        "/Users/YOUR_USER/path/to/pk-agentic/pk-mcp/dist/index.js"
      ],
      "env": {
        "PK_AGENT_API_URL": "https://your-wordpress-site.com/wp-json/pk-agentic/v1/agent/",
        "PK_AGENT_KEY": "pk_agent_your_generated_key_here",
        "PK_AGENT_EMAIL": "your-email@example.com",
        "GEMINI_API_KEY": "your_gemini_api_key_here",
        "GEMINI_MODEL": "gemini-3-pro-image-preview"
      }
    }
  }
}
```

> **Note:** Make sure to use the absolute path to `dist/index.js`. After updating the config, restart Claude Desktop to activate the tools.

## Configuration Parameters

When configuring this MCP server in your AI agent, you will need the following parameters from your WordPress site:

| Parameter | Environment Variable | Description |
|-----------|----------------------|-------------|
| **API URL** | `PK_AGENT_API_URL` | The URL of the PK Agentic API (e.g., `https://example.com/wp-json/pk-agentic/v1/agent/`). |
| **Agent Key** | `PK_AGENT_KEY` | The secret key generated in **PK Agentic -> Security -> Agent Keys**. Starts with `pk_agent_`. |
| **Agent Email** | `PK_AGENT_EMAIL` | The email address associated with the Agent Key. Required for authentication. |
| **Gemini API Key** | `GEMINI_API_KEY` | **Optional.** Required for the `generate_image` tool. Get one at [aistudio.google.com](https://aistudio.google.com/). |
| **Gemini Model** | `GEMINI_MODEL` | **Optional.** The model ID to use for image generation. Defaults to `gemini-3-pro-image-preview`. |
