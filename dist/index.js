#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import { PKAgentApi, UtilityApi, WebCrawlerApi, ImageGenerationApi, TailwindApi } from "./handlers/index.js";
dotenv.config();
// Disable TLS certificate verification for local development (DDEV)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const API_BASE_URL = process.env.PK_AGENT_API_URL;
const API_KEY = process.env.PK_AGENT_KEY;
const API_EMAIL = process.env.PK_AGENT_EMAIL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;
if (!API_BASE_URL || !API_KEY || !API_EMAIL) {
    console.error("Error: PK_AGENT_API_URL, PK_AGENT_KEY, and PK_AGENT_EMAIL environment variables are required.");
    process.exit(1);
}
class PKAgentMcpServer {
    server;
    api;
    utility;
    web;
    image;
    tailwind;
    constructor() {
        this.server = new McpServer({
            name: "pk-agent-mcp",
            version: "1.4.0",
        });
        this.api = new PKAgentApi(API_BASE_URL, API_KEY, API_EMAIL);
        this.utility = new UtilityApi();
        this.web = new WebCrawlerApi();
        this.image = new ImageGenerationApi(GEMINI_API_KEY, GEMINI_MODEL);
        this.tailwind = new TailwindApi();
        this.setupTools();
        // Error handling
        this.server.server.onerror = (error) => console.error("[MCP Error]", error);
        process.on("SIGINT", async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupTools() {
        // Info
        this.server.registerTool("get_site_info", {
            description: "Get WordPress site metadata including site name/URL, plugin version, WordPress version, PHP version, active theme (with parent theme if child theme), active plugins, permissions, batch limits, and menu locations. Automatically writes the full response to .pk-agentic/site-info.json and returns a summary with key fields.",
        }, async () => {
            const result = await this.api.getSiteInfo();
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("sync", {
            description: "List all items (templates, scripts, content) managed by the plugin. Automatically writes the full inventory to .pk-agentic/file-list.json and returns a pagination summary. For page > 1, new items are merged into the existing file. Check has_more and call again with the next page number until all pages are fetched.",
            inputSchema: {
                type: z.enum(["all", "template", "script", "content"]).optional().default("all"),
                page: z.number().optional().default(1),
                per_page: z.number().optional().default(25),
            },
        }, async (args) => {
            const result = await this.api.syncItems(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("get_file", {
            description: "Download content (HTML/CSS/JS) for a single item. Full downloads (no from_line/to_line) write files to workspace/{type}/{slug}/ and return a summary with paths. Partial/line-range downloads return the requested lines inline without writing to disk (safe for inspecting large files). Templates/scripts use .php extension; content uses .html.",
            inputSchema: {
                id: z.number(),
                version: z.enum(["sandbox", "production"]).optional().default("sandbox"),
                download_type: z.enum(["all", "html", "css", "js"]).optional().default("all"),
                from_line: z.number().optional(),
                to_line: z.number().optional(),
            },
        }, async (args) => {
            const result = await this.api.getFile(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("get_files_batch", {
            description: "Batch download full content for multiple items (max = batch_file_limit from get_site_info). Each item's files are written to workspace/{type}/{slug}/ automatically. Returns a summary of items downloaded and files written. Split large ID lists into chunks of batch_file_limit.",
            inputSchema: {
                ids: z.array(z.number()),
                version: z.enum(["sandbox", "production"]).optional().default("sandbox"),
            },
        }, async (args) => {
            const result = await this.api.getFilesBatch(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("get_template_info", {
            description: "Retrieve metadata for a template (conditions, sub_type, location_php, location_js, lock status) without code content.",
            inputSchema: { id: z.number() },
        }, async ({ id }) => {
            const result = await this.api.getTemplateInfo(id);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("get_script_info", {
            description: "Retrieve metadata for a global script (conditions, location_js, location_php, mode, lock status) without code content.",
            inputSchema: { id: z.number() },
        }, async ({ id }) => {
            const result = await this.api.getScriptInfo(id);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("get_content_info", {
            description: "Retrieve metadata for a content item (permalink, preview key, location_js, lock status) without code content.",
            inputSchema: { id: z.number() },
        }, async ({ id }) => {
            const result = await this.api.getContentInfo(id);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        // Templates
        this.server.registerTool("save_template", {
            description: "Save template code and settings to sandbox (draft). Pass document_content_path to update the item's Markdown documentation from a local .md file.",
            inputSchema: {
                id: z.number(),
                html_path: z.string().optional(),
                css_path: z.string().optional(),
                js_path: z.string().optional(),
                document_content_path: z.string().optional(),
                description: z.string().optional(),
                priority_css: z.number().optional(),
                priority_js: z.number().optional(),
                location_js: z.enum(["head", "open_body", "foot"]).optional(),
                location_php: z.object({}).passthrough().optional(),
            },
        }, async (args) => {
            const result = await this.api.saveItem({ ...args, type: "templates" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("publish_template", {
            description: "Publish template from sandbox to production.",
            inputSchema: { id: z.number() },
        }, async (args) => {
            const result = await this.api.publishItem({ ...args, type: "templates" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("create_template", {
            description: "Create a new template in sandbox.",
            inputSchema: {
                title: z.string(),
                sub_type: z.enum(["header", "footer", "single", "archive", "404", "search", "front_page", "blog", "custom", "partial"]),
                html_path: z.string().optional(),
                css_path: z.string().optional(),
                js_path: z.string().optional(),
                conditions: z.object({}).passthrough().optional(),
                priority_css: z.number().optional(),
                priority_js: z.number().optional(),
                location_js: z.enum(["head", "open_body", "foot"]).optional(),
                location_php: z.object({}).passthrough().optional(),
            },
        }, async (args) => {
            const result = await this.api.createItem({ ...args, type: "templates" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("update_template", {
            description: "Update template metadata (title, slug).",
            inputSchema: {
                id: z.number(),
                title: z.string().optional(),
                slug: z.string().optional(),
            },
        }, async (args) => {
            const result = await this.api.updateMetadata({ ...args, type: "templates" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("toggle_template", {
            description: "Enable/Disable template.",
            inputSchema: {
                id: z.number(),
                enabled: z.boolean().optional(),
            },
        }, async (args) => {
            const result = await this.api.toggleItem({ ...args, type: "templates" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("update_template_conditions", {
            description: "Update template display conditions. Supports unified groups format (v3) and legacy format.",
            inputSchema: {
                id: z.number(),
                conditions: z.object({}).passthrough(),
            },
        }, async (args) => {
            const result = await this.api.updateConditions({ ...args, type: "templates" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("delete_template", {
            description: "Delete a template.",
            inputSchema: { id: z.number() },
        }, async (args) => {
            const result = await this.api.deleteItem({ ...args, type: "templates" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("get_template_revisions", {
            description: "List revisions for a template.",
            inputSchema: { id: z.number() },
        }, async (args) => {
            const result = await this.api.getRevisions({ ...args, type: "templates" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("restore_template_revision", {
            description: "Restore a template revision to sandbox.",
            inputSchema: {
                id: z.number(),
                revision_id: z.number(),
            },
        }, async (args) => {
            const result = await this.api.restoreRevision({ ...args, type: "templates" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        // Scripts
        this.server.registerTool("save_script", {
            description: "Save script code and settings to sandbox (draft). Pass document_content_path to update the item's Markdown documentation from a local .md file.",
            inputSchema: {
                id: z.number(),
                html_path: z.string().optional(),
                css_path: z.string().optional(),
                js_path: z.string().optional(),
                document_content_path: z.string().optional(),
                description: z.string().optional(),
                priority_css: z.number().optional(),
                priority_js: z.number().optional(),
                location_js: z.enum(["head", "open_body", "foot"]).optional(),
                script_mode: z.enum(["advanced", "php", "css", "js"]).optional(),
                location_php: z.object({}).passthrough().optional(),
            },
        }, async (args) => {
            const result = await this.api.saveItem({ ...args, type: "scripts" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("publish_script", {
            description: "Publish script from sandbox to production.",
            inputSchema: { id: z.number() },
        }, async (args) => {
            const result = await this.api.publishItem({ ...args, type: "scripts" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("create_script", {
            description: "Create a new script in sandbox.",
            inputSchema: {
                title: z.string(),
                html_path: z.string().optional(),
                css_path: z.string().optional(),
                js_path: z.string().optional(),
                conditions: z.object({}).passthrough().optional(),
                priority_css: z.number().optional(),
                priority_js: z.number().optional(),
                location_js: z.enum(["head", "open_body", "foot"]).optional(),
                script_mode: z.enum(["advanced", "php", "css", "js"]).optional(),
                location_php: z.object({}).passthrough().optional(),
            },
        }, async (args) => {
            const result = await this.api.createItem({ ...args, type: "scripts" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("update_script", {
            description: "Update script metadata (title, slug).",
            inputSchema: {
                id: z.number(),
                title: z.string().optional(),
                slug: z.string().optional(),
            },
        }, async (args) => {
            const result = await this.api.updateMetadata({ ...args, type: "scripts" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("toggle_script", {
            description: "Enable/Disable script.",
            inputSchema: {
                id: z.number(),
                enabled: z.boolean().optional(),
            },
        }, async (args) => {
            const result = await this.api.toggleItem({ ...args, type: "scripts" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("update_script_conditions", {
            description: "Update script display conditions. Supports unified groups format (v3) and legacy format.",
            inputSchema: {
                id: z.number(),
                conditions: z.object({}).passthrough(),
            },
        }, async (args) => {
            const result = await this.api.updateConditions({ ...args, type: "scripts" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("delete_script", {
            description: "Delete a script.",
            inputSchema: { id: z.number() },
        }, async (args) => {
            const result = await this.api.deleteItem({ ...args, type: "scripts" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("get_script_revisions", {
            description: "List revisions for a script.",
            inputSchema: { id: z.number() },
        }, async (args) => {
            const result = await this.api.getRevisions({ ...args, type: "scripts" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("restore_script_revision", {
            description: "Restore a script revision to sandbox.",
            inputSchema: {
                id: z.number(),
                revision_id: z.number(),
            },
        }, async (args) => {
            const result = await this.api.restoreRevision({ ...args, type: "scripts" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        // Content
        this.server.registerTool("save_content", {
            description: "Save content code (HTML/CSS/JS) and settings to sandbox (draft). Pass document_content_path to update the item's Markdown documentation from a local .md file.",
            inputSchema: {
                id: z.number(),
                html_path: z.string().optional(),
                css_path: z.string().optional(),
                js_path: z.string().optional(),
                document_content_path: z.string().optional(),
                description: z.string().optional(),
                priority_css: z.number().optional(),
                priority_js: z.number().optional(),
                location_js: z.enum(["head", "open_body", "foot"]).optional(),
            },
        }, async (args) => {
            const result = await this.api.saveItem({ ...args, type: "contents" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("publish_content", {
            description: "Publish content from sandbox to production.",
            inputSchema: { id: z.number() },
        }, async (args) => {
            const result = await this.api.publishItem({ ...args, type: "contents" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("create_content", {
            description: "Create a new content item in sandbox.",
            inputSchema: {
                title: z.string(),
                post_type: z.string(),
                html_path: z.string().optional(),
                css_path: z.string().optional(),
                js_path: z.string().optional(),
                priority_css: z.number().optional(),
                priority_js: z.number().optional(),
                location_js: z.enum(["head", "open_body", "foot"]).optional(),
            },
        }, async (args) => {
            const result = await this.api.createItem({ ...args, type: "contents" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("update_content", {
            description: "Update content metadata (title, slug).",
            inputSchema: {
                id: z.number(),
                title: z.string().optional(),
                slug: z.string().optional(),
            },
        }, async (args) => {
            const result = await this.api.updateMetadata({ ...args, type: "contents" });
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        // Search & Onboarding
        this.server.registerTool("search_contents", {
            description: "Search for WordPress content (posts, pages, products, etc.).",
            inputSchema: {
                search: z.string(),
                post_type: z.string().optional().default("any"),
                per_page: z.number().optional().default(20),
            },
        }, async (args) => {
            const result = await this.api.searchContents(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("mark_content_edit", {
            description: "Register that a content item is being edited by the AI.",
            inputSchema: { post_id: z.number() },
        }, async (args) => {
            const result = await this.api.markContentEdit(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("search_media", {
            description: "Search for media items by title or filename.",
            inputSchema: {
                search: z.string().optional(),
                media_type: z.enum(["image", "svg", "pdf", "font"]).optional(),
                per_page: z.number().optional().default(10),
            },
        }, async (args) => {
            const result = await this.api.searchMedia(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        // Media & Utilities
        this.server.registerTool("upload_media", {
            description: "Upload a media file (image, SVG, PDF, or font) to the WordPress Media Library. Supports local file paths (multipart) or base64 data.",
            inputSchema: {
                file_path: z.string().optional(),
                base64: z.string().optional(),
                filename: z.string().optional().describe("Required if using base64."),
                media_type: z.enum(["image", "svg", "pdf", "font"]).optional().default("image"),
                title: z.string().optional(),
                alt_text: z.string().optional(),
            },
        }, async (args) => {
            const result = await this.api.uploadMedia(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("get_image_srcset", {
            description: "Get the WordPress-generated srcset string and basic metadata for an existing image attachment by attachment_id.",
            inputSchema: {
                attachment_id: z.number().describe("The WordPress attachment ID of the image."),
            },
        }, async (args) => {
            const result = await this.api.getImageSrcset(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("get_roles", {
            description: "Get all available WordPress user roles.",
        }, async () => {
            const result = await this.api.getRoles();
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("download_image", {
            description: "Download an image from a URL to a local temporary file.",
            inputSchema: { url: z.string(), path: z.string() },
        }, async (args) => {
            const result = await this.utility.downloadImage(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("optimize_image", {
            description: "Resize and/or convert an image to WebP in one call. PNG, JPG, BMP, TIFF, and HEIC files are always converted to WebP. Resizing only occurs when the image exceeds the specified width or height — it never upscales. Default quality is 80%.",
            inputSchema: {
                file_path: z.string().describe("Path to the source image file."),
                output_path: z.string().optional().describe("Output file path. Defaults to same directory as input with .webp extension."),
                width: z.number().optional().describe("Max width in pixels. Image is resized only if its width exceeds this value. Aspect ratio is preserved."),
                height: z.number().optional().describe("Max height in pixels. Image is resized only if its height exceeds this value. Aspect ratio is preserved."),
                quality: z.number().min(1).max(100).optional().default(80).describe("WebP quality 1–100. Default is 80."),
            },
        }, async (args) => {
            const result = await this.utility.optimizeImage(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("init_project", {
            description: "Initialize a local project directory with default structure.",
            inputSchema: {
                path: z.string().optional(),
            },
        }, async (args) => {
            const result = await this.utility.initProject(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("read_web_page", {
            description: "Extract main content and metadata from a web page using Playwright and Readability.",
            inputSchema: {
                url: z.string(),
                render_js: z.boolean().optional().default(true),
                wait_selector: z.string().optional(),
                css_selector: z.string().optional(),
            },
        }, async (args) => {
            const result = await this.web.readWebPage(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("get_agent_guide", {
            description: "Retrieve a detailed sub-guide for a specific topic and write it to agent-guide/{topic}.md in the project directory. After calling this tool, read the returned file path to access the full guide content. Available guides: workflow, templates, conditions, scripts, preview, errors, media, permissions, navigation, tailwind-config, image-generation, php-location, image-optimize, global-library, tailwind-optimize.",
            inputSchema: {
                guide: z.enum(["workflow", "templates", "conditions", "scripts", "preview", "errors", "media", "permissions", "navigation", "tailwind-config", "image-generation", "php-location", "image-optimize", "global-library", "tailwind-optimize"]),
            },
        }, async (args) => {
            const result = await this.api.getAgentGuide(args.guide);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("get_tailwind_config", {
            description: "Get the Tailwind CSS configuration (@theme CSS block) from Settings > Layout. The prefix is always 'pkt-'. Returns the default kit config if none has been saved.",
        }, async () => {
            const result = await this.api.getTailwindConfig();
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("update_tailwind_config", {
            description: "Update the @theme CSS block of the Tailwind CSS config in Settings > Layout. Pass the complete @theme { ... } CSS block — it is not merged. The prefix 'pkt-' is fixed and cannot be changed. Changes take effect immediately on the next page load.",
            inputSchema: {
                theme_css: z.string().describe("The new @theme { ... } CSS block as a string. Replaces the entire existing theme config."),
            },
        }, async (args) => {
            const result = await this.api.updateTailwindConfig(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("tailwind_optimize", {
            description: "Optimize Tailwind CSS for production using PostCSS and Tailwind v4. Scans all HTML/PHP files in the workspace and uses the provided Tailwind configuration to generate a minified CSS file at workspace/optimize/optimized-tailwind.css.",
            inputSchema: {
                tailwind_config: z.string().describe("The Tailwind @theme { ... } CSS block."),
            },
        }, async (args) => {
            const result = await this.tailwind.optimize(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        // Global Library
        this.server.registerTool("list_libraries", {
            description: "List all Global Libraries managed by the plugin. Automatically writes the full inventory to .pk-agentic/library-info.json and returns a pagination summary.",
            inputSchema: {
                page: z.number().optional().default(1),
                per_page: z.number().optional().default(50),
            },
        }, async (args) => {
            const result = await this.api.listLibraries(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("create_library", {
            description: "Create a new Global Library.",
            inputSchema: {
                title: z.string(),
                library_type: z.enum(["js", "css", "font"]),
            },
        }, async (args) => {
            const result = await this.api.createLibrary(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("update_library", {
            description: "Update Global Library metadata (title, type, mode).",
            inputSchema: {
                id: z.number(),
                title: z.string().optional(),
                library_type: z.enum(["js", "css", "font"]).optional(),
                mode: z.enum(["local", "cdn"]).optional(),
            },
        }, async (args) => {
            const result = await this.api.updateLibrary(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("delete_library", {
            description: "Delete a Global Library and all its files from disk.",
            inputSchema: { id: z.number() },
        }, async (args) => {
            const result = await this.api.deleteLibrary(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("search_libraries", {
            description: "Search Global Libraries by title.",
            inputSchema: { q: z.string() },
        }, async (args) => {
            const result = await this.api.searchLibraries(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("get_library", {
            description: "Retrieve full metadata and file list for a specific Global Library.",
            inputSchema: { id: z.number() },
        }, async (args) => {
            const result = await this.api.getLibrary(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("cdn_download_library", {
            description: "Download asset files from CDN URLs to local library storage.",
            inputSchema: {
                id: z.number(),
                urls: z.array(z.string()),
            },
        }, async (args) => {
            const result = await this.api.cdnDownloadLibrary(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("save_library_files", {
            description: "Update settings for files within a library (priority, location).",
            inputSchema: {
                id: z.number(),
                files: z.array(z.object({
                    filename: z.string(),
                    priority: z.number().optional(),
                    location_js: z.enum(["foot", "head", "open_body"]).optional(),
                })),
            },
        }, async (args) => {
            const result = await this.api.saveLibraryFiles(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("restore_library_backup", {
            description: "Restore library files from a previous backup.",
            inputSchema: {
                id: z.number(),
                backup_key: z.string(),
            },
        }, async (args) => {
            const result = await this.api.restoreLibraryBackup(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("update_library_conditions", {
            description: "Update display conditions for a Global Library.",
            inputSchema: {
                id: z.number(),
                conditions: z.object({}).passthrough(),
            },
        }, async (args) => {
            const result = await this.api.updateLibraryConditions(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("toggle_library", {
            description: "Enable or disable a Global Library.",
            inputSchema: {
                id: z.number(),
                enabled: z.boolean().optional(),
            },
        }, async (args) => {
            const result = await this.api.toggleLibrary(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        this.server.registerTool("toggle_library_lock", {
            description: "Lock or unlock a Global Library. Locked libraries cannot be modified or deleted.",
            inputSchema: {
                id: z.number(),
                locked: z.boolean().optional(),
            },
        }, async (args) => {
            const result = await this.api.toggleLibraryLock(args);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        });
        if (GEMINI_API_KEY) {
            this.server.registerTool("generate_image", {
                description: "Generate an image using Gemini AI based on a prompt stored in a file. Saves the image to workspace/generated-images/.",
                inputSchema: {
                    prompt_path: z.string().describe("Path to the Markdown file containing the image prompt (e.g., 'workspace/prompt-images/home/hero.md')."),
                    image_name: z.string().describe("Base name for the generated image file (e.g., 'hero-banner')."),
                    page_name: z.string().describe("Name of the page this image is for (used for metadata)."),
                    aspect_ratio: z.enum(["1:1", "9:16", "16:9", "3:2", "4:3"]).optional().default("1:1"),
                },
            }, async (args) => {
                const result = await this.image.generateImage(args);
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
                };
            });
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("PK Agent MCP server running on stdio");
    }
}
const server = new PKAgentMcpServer();
server.run().catch(console.error);
//# sourceMappingURL=index.js.map