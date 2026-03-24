import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { finished } from "stream/promises";
import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import TurndownService from "turndown";
import { GoogleGenAI } from "@google/genai";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
// Resolve the directory of this compiled file so we can locate bundled guide files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class ImageGenerationApi {
    client;
    modelId;
    constructor(apiKey, modelId) {
        this.modelId = modelId || "gemini-3-pro-image-preview";
        if (apiKey) {
            this.client = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });
        }
    }
    async generateImage(args) {
        if (!this.client) {
            throw new Error("GEMINI_API_KEY is not set. Please set it in your MCP configuration (e.g., in claude_desktop_config.json or .env file) and restart the server.");
        }
        const { prompt_path, image_name, page_name, aspect_ratio = "1:1" } = args;
        // 1. Read prompt from file
        if (!fs.existsSync(prompt_path)) {
            throw new Error(`Prompt file not found at ${prompt_path}. Please create it first.`);
        }
        const prompt = fs.readFileSync(prompt_path, "utf-8").trim();
        try {
            // 2. Call Gemini SDK (Nano Banana Pro)
            // Gemini 3 models support native image generation via generateContent
            const response = await this.client.models.generateContent({
                model: this.modelId,
                contents: prompt,
                config: {
                    imageConfig: { aspectRatio: aspect_ratio },
                    responseModalities: ["IMAGE"]
                }
            });
            if (!response.candidates || response.candidates.length === 0) {
                throw new Error("No candidates returned from Gemini API.");
            }
            const parts = response.candidates[0].content?.parts;
            if (!parts) {
                throw new Error("No parts found in the response. The model might have been blocked by safety filters.");
            }
            let base64Data;
            let mimeType = "image/png";
            for (const part of parts) {
                if (part.inlineData) {
                    base64Data = part.inlineData.data;
                    mimeType = part.inlineData.mimeType || "image/png";
                    break;
                }
            }
            if (!base64Data) {
                throw new Error("No image data found in the response parts. The model might have returned text instead.");
            }
            const extension = mimeType.split("/")[1] || "png";
            // 3. Save image to folder
            const outputDir = path.join("workspace", "generated-images");
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const fileName = `${image_name}.${extension}`;
            const outputPath = path.join(outputDir, fileName);
            fs.writeFileSync(outputPath, Buffer.from(base64Data, "base64"));
            return {
                success: true,
                message: `Image generated using Nano Banana Pro and saved to ${outputPath}`,
                file_path: outputPath,
                image_name: fileName,
                page_name: page_name,
                model: this.modelId
            };
        }
        catch (error) {
            const errorMessage = error.message || "Unknown error occurred during image generation.";
            throw new Error(`Gemini SDK Error: ${errorMessage}`);
        }
    }
}
export class UtilityApi {
    async initProject(args) {
        const rootPath = args.path || ".";
        const dirs = [
            ".pk-agentic/agent-guide",
            "workspace/templates",
            "workspace/scripts",
            "workspace/contents/pages",
            "workspace/contents/posts",
            "resources/assets",
            "resources/context",
        ];
        // Clear agent-guide contents so the latest guide is always used
        const agentGuideDir = path.join(rootPath, ".pk-agentic/agent-guide");
        if (fs.existsSync(agentGuideDir)) {
            for (const entry of fs.readdirSync(agentGuideDir)) {
                fs.rmSync(path.join(agentGuideDir, entry), { recursive: true, force: true });
            }
        }
        for (const dir of dirs) {
            const fullPath = path.join(rootPath, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                // Create .gitkeep to ensure empty directories are kept in version control
                fs.writeFileSync(path.join(fullPath, ".gitkeep"), "");
            }
        }
        return {
            success: true,
            message: "Project structure initialized successfully.",
            root: path.resolve(rootPath),
            directories: dirs
        };
    }
    async getAgentGuide(args) {
        const { guide } = args;
        // Source: the agent-guide/ folder shipped alongside this MCP server
        const sourceDir = path.resolve(__dirname, "..", "agent-guide");
        const sourceFile = path.join(sourceDir, `${guide}.md`);
        if (!fs.existsSync(sourceFile)) {
            throw new Error(`Guide file not found in MCP server: agent-guide/${guide}.md`);
        }
        // Destination: agent-guide/ in the agent's current working directory
        const destDir = path.resolve(".pk-agentic/agent-guide");
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        const destFile = path.join(destDir, `${guide}.md`);
        fs.copyFileSync(sourceFile, destFile);
        const relativePath = `.pk-agentic/agent-guide/${guide}.md`;
        return {
            success: true,
            message: `Guide written to ${relativePath}. Read that file now to learn about '${guide}'.`,
            file_written: relativePath,
            absolute_path: destFile,
        };
    }
    async optimizeImage(args) {
        const { file_path, output_path, width, height, quality = 80 } = args;
        if (!fs.existsSync(file_path)) {
            throw new Error(`File not found: ${file_path}`);
        }
        const ext = path.extname(file_path).toLowerCase().replace(".", "");
        const convertToWebP = ["png", "jpg", "jpeg", "bmp", "tiff", "tif", "heic", "heif"].includes(ext);
        // Output path: replace extension with .webp, or use provided path
        const baseName = path.basename(file_path, path.extname(file_path));
        const inputDir = path.dirname(file_path);
        const resolvedOutput = output_path || path.join(inputDir, `${baseName}.webp`);
        const outputDir = path.dirname(resolvedOutput);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const originalSize = fs.statSync(file_path).size;
        let image = sharp(file_path);
        const metadata = await image.metadata();
        const originalWidth = metadata.width ?? 0;
        const originalHeight = metadata.height ?? 0;
        // Only resize if the image exceeds the specified dimension
        const resizeWidth = (width && originalWidth > width) ? width : undefined;
        const resizeHeight = (height && originalHeight > height) ? height : undefined;
        if (resizeWidth || resizeHeight) {
            image = image.resize({
                width: resizeWidth,
                height: resizeHeight,
                fit: "inside",
                withoutEnlargement: true,
            });
        }
        const outputExt = path.extname(resolvedOutput).toLowerCase();
        if (convertToWebP || outputExt === ".webp") {
            image = image.webp({ quality });
        }
        const info = await image.toFile(resolvedOutput);
        const newSize = fs.statSync(resolvedOutput).size;
        const reduction = originalSize > 0
            ? `${Math.round((1 - newSize / originalSize) * 100)}%`
            : "0%";
        return {
            success: true,
            message: "Image optimized successfully.",
            input_path: file_path,
            output_path: resolvedOutput,
            original: {
                width: originalWidth,
                height: originalHeight,
                size_bytes: originalSize,
                format: ext,
            },
            output: {
                width: info.width,
                height: info.height,
                size_bytes: newSize,
                format: info.format,
            },
            resized: !!(resizeWidth || resizeHeight),
            converted_to_webp: convertToWebP || outputExt === ".webp",
            size_reduction: reduction,
        };
    }
    async downloadImage(args) {
        const { url, path: filePath } = args;
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const writer = fs.createWriteStream(filePath);
        const response = await axios({
            method: "get",
            url: url,
            responseType: "stream",
        });
        response.data.pipe(writer);
        await finished(writer);
        return {
            success: true,
            message: `Image downloaded successfully to ${filePath}`,
            path: filePath
        };
    }
}
export class TailwindApi {
    async optimize(args) {
        const { tailwind_config } = args;
        // 1. Setup workspace/optimize directory
        const outputDir = path.join("workspace", "optimize");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const tempConfigPath = path.resolve(path.join(outputDir, "tailwind.config.cjs"));
        const tempCssPath = path.resolve(path.join(outputDir, "input.css"));
        const outputPath = path.resolve(path.join(outputDir, "optimized-tailwind.css"));
        // 2. Write temporary config file
        const configContent = `
module.exports = {
  content: ["./workspace/**/*.php", "./workspace/**/*.html"],
  theme: {
    extend: ${JSON.stringify(tailwind_config, null, 2)}
  },
  prefix: "pkt-",
};
    `;
        fs.writeFileSync(tempConfigPath, configContent);
        // 3. Write input CSS file
        const cssContent = `
@import "tailwindcss";
@config "${tempConfigPath.replace(/\\/g, "/")}";
    `;
        fs.writeFileSync(tempCssPath, cssContent);
        try {
            // 4. Run PostCSS
            const css = fs.readFileSync(tempCssPath, "utf-8");
            // We need to use the PostCSS plugin from tailwindcss
            const result = await postcss([
                tailwindcss()
            ]).process(css, { from: tempCssPath, to: outputPath });
            // 5. Write optimized CSS
            fs.writeFileSync(outputPath, result.css);
            // 6. Cleanup temporary files
            if (fs.existsSync(tempConfigPath))
                fs.unlinkSync(tempConfigPath);
            if (fs.existsSync(tempCssPath))
                fs.unlinkSync(tempCssPath);
            return {
                success: true,
                message: `Tailwind CSS optimized successfully. Output saved to ${path.relative(process.cwd(), outputPath)}`,
                output_path: path.relative(process.cwd(), outputPath),
                css_size: result.css.length
            };
        }
        catch (error) {
            // Cleanup on error
            if (fs.existsSync(tempConfigPath))
                fs.unlinkSync(tempConfigPath);
            if (fs.existsSync(tempCssPath))
                fs.unlinkSync(tempCssPath);
            throw new Error(`Tailwind Optimization Error: ${error.message}`);
        }
    }
}
export class WebCrawlerApi {
    turndownService;
    constructor() {
        this.turndownService = new TurndownService({
            headingStyle: "atx",
            codeBlockStyle: "fenced"
        });
    }
    async readWebPage(args) {
        const { url, render_js = true, wait_selector, css_selector } = args;
        let dom;
        if (render_js) {
            const virtualConsole = new VirtualConsole();
            // Forward virtual console logs to terminal if needed for debugging
            // virtualConsole.sendTo(console);
            try {
                dom = await JSDOM.fromURL(url, {
                    resources: "usable",
                    runScripts: "dangerously",
                    virtualConsole,
                    pretendToBeVisual: true,
                });
                // Wait for JS to execute. JSDOM doesn't have a perfect "networkidle" 
                // so we wait for the wait_selector or a fixed timeout.
                if (wait_selector) {
                    await new Promise((resolve) => {
                        const start = Date.now();
                        const interval = setInterval(() => {
                            if (dom.window.document.querySelector(wait_selector) || Date.now() - start > 10000) {
                                clearInterval(interval);
                                resolve();
                            }
                        }, 100);
                    });
                }
                else {
                    // Default wait for some potential async rendering
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to load page with JSDOM: ${error.message}`
                };
            }
        }
        else {
            try {
                const response = await axios.get(url);
                dom = new JSDOM(response.data, { url });
            }
            catch (error) {
                return {
                    success: false,
                    message: `Failed to fetch page with Axios: ${error.message}`
                };
            }
        }
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (!article || !article.content) {
            // If readability fails, try to get raw HTML from selector or body
            let contentHtml;
            if (css_selector) {
                const el = dom.window.document.querySelector(css_selector);
                contentHtml = el ? el.innerHTML : dom.window.document.body.innerHTML;
            }
            else {
                contentHtml = dom.window.document.body.innerHTML;
            }
            if (!contentHtml) {
                return {
                    success: false,
                    message: "Failed to extract content from the page."
                };
            }
            const markdown = this.turndownService.turndown(contentHtml);
            return {
                success: true,
                url,
                title: dom.window.document.title,
                content: markdown
            };
        }
        const markdown = this.turndownService.turndown(article.content);
        return {
            success: true,
            url,
            title: article.title || dom.window.document.title,
            byline: article.byline,
            excerpt: article.excerpt,
            content: markdown
        };
    }
}
export class PKAgentApi {
    axiosInstance;
    constructor(baseURL, key, email) {
        this.axiosInstance = axios.create({
            baseURL: baseURL.endsWith("/") ? baseURL : `${baseURL}/`,
            headers: {
                "X-PK-Agent-Key": key,
                "X-PK-Agent-Email": email,
                "Content-Type": "application/json",
            },
        });
        // Add interceptors for logging
        this.axiosInstance.interceptors.request.use((config) => {
            console.error(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.params || config.data || "");
            return config;
        });
        this.axiosInstance.interceptors.response.use((response) => {
            const logData = typeof response.data === "string" ? response.data.substring(0, 200) : response.data;
            console.error(`[API Response] ${response.status}`, logData);
            return response;
        }, (error) => {
            console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.data || error.message);
            return Promise.reject(error);
        });
    }
    // ── Private helpers ──────────────────────────────────────────────────────
    /**
     * Ensure a directory exists and write JSON content to a file.
     */
    writeJsonFile(filePath, content) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2), "utf-8");
    }
    /**
     * Write downloaded code fields (html/css/js) from an API item to the
     * correct workspace sub-directory derived from the item's virtual_path.
     *
     * Layout:
     *   template → workspace/templates/{slug}/{slug}.php  .css  .js
     *   script   → workspace/scripts/{slug}/{slug}.php    .css  .js
     *   content  → workspace/contents/{vp_parts}/{slug}.html .css .js
     *
     * Returns relative paths of every file that was written.
     */
    writeItemFiles(data, baseDir = ".") {
        const virtualPath = data.virtual_path || "";
        if (!virtualPath)
            return [];
        const slug = data.slug;
        const isTemplate = virtualPath.startsWith("/templates/");
        const isScript = virtualPath.startsWith("/scripts/");
        const isContent = !isTemplate && !isScript;
        // Build local directory path
        const vpParts = virtualPath.replace(/^\//, "").split("/"); // strip leading "/"
        let dir;
        if (isTemplate) {
            dir = path.join(baseDir, "workspace", "templates", slug);
        }
        else if (isScript) {
            dir = path.join(baseDir, "workspace", "scripts", slug);
        }
        else {
            // content: workspace/contents/pages/{slug}  or  workspace/contents/{cpt}/{slug}
            dir = path.join(baseDir, "workspace", "contents", ...vpParts);
        }
        fs.mkdirSync(dir, { recursive: true });
        const htmlExt = isContent ? ".html" : ".php";
        const filesWritten = [];
        if (data.html !== undefined && data.html !== null) {
            const fp = path.join(dir, `${slug}${htmlExt}`);
            fs.writeFileSync(fp, data.html ?? "", "utf-8");
            filesWritten.push(path.relative(baseDir, fp));
        }
        if (data.css !== undefined && data.css !== null) {
            const fp = path.join(dir, `${slug}.css`);
            fs.writeFileSync(fp, data.css ?? "", "utf-8");
            filesWritten.push(path.relative(baseDir, fp));
        }
        if (data.js !== undefined && data.js !== null) {
            const fp = path.join(dir, `${slug}.js`);
            fs.writeFileSync(fp, data.js ?? "", "utf-8");
            filesWritten.push(path.relative(baseDir, fp));
        }
        if (data.document_content !== undefined && data.document_content !== null) {
            const fp = path.join(dir, `${slug}.md`);
            fs.writeFileSync(fp, data.document_content ?? "", "utf-8");
            filesWritten.push(path.relative(baseDir, fp));
        }
        return filesWritten;
    }
    // ── API methods ───────────────────────────────────────────────────────────
    async getSiteInfo() {
        const response = await this.axiosInstance.get("site-info");
        const result = response.data;
        // Persist to .pk-agentic/site-info.json
        this.writeJsonFile(".pk-agentic/site-info.json", result);
        const d = result.data || {};
        return {
            success: true,
            message: "Site info written to .pk-agentic/site-info.json. Read that file for the full response. Key values are summarised below.",
            file_written: ".pk-agentic/site-info.json",
            summary: {
                site_name: d.site_name,
                site_url: d.site_url,
                batch_file_limit: d.batch_file_limit,
                css_framework: d.css_framework,
                timezone: d.timezone,
                language: d.language,
                permissions: d.permissions,
                menu_locations: d.menu_locations,
            },
        };
    }
    async syncItems(args) {
        const response = await this.axiosInstance.get("sync", { params: args });
        const result = response.data;
        const filePath = ".pk-agentic/file-list.json";
        const page = args.page ?? 1;
        if (page === 1) {
            // First page — write fresh
            this.writeJsonFile(filePath, result);
        }
        else {
            // Subsequent pages — merge arrays into existing file
            let existing = { data: { templates: [], scripts: [], content: [] } };
            if (fs.existsSync(filePath)) {
                try {
                    existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                }
                catch { /**/ }
            }
            existing.data = existing.data || {};
            existing.data.templates = [...(existing.data.templates ?? []), ...(result.data?.templates ?? [])];
            existing.data.scripts = [...(existing.data.scripts ?? []), ...(result.data?.scripts ?? [])];
            existing.data.content = [...(existing.data.content ?? []), ...(result.data?.content ?? [])];
            existing.pagination = result.pagination; // update pagination to reflect latest page
            this.writeJsonFile(filePath, existing);
        }
        const total = result.total || {};
        const pagination = result.pagination || {};
        return {
            success: true,
            message: `File list written to .pk-agentic/file-list.json. Read that file to get the full item inventory. ${pagination.has_more ? `More pages available — call sync(page=${(pagination.page ?? 1) + 1}) to continue fetching.` : "All items fetched."}`,
            file_written: ".pk-agentic/file-list.json",
            summary: {
                page: pagination.page,
                per_page: pagination.per_page,
                total_items: pagination.total_items,
                total_pages: pagination.total_pages,
                has_more: pagination.has_more,
                items_on_page: {
                    templates: total.templates ?? 0,
                    scripts: total.scripts ?? 0,
                    content: total.content ?? 0,
                },
            },
        };
    }
    async getFile(args) {
        const { id, from_line, to_line, ...params } = args;
        const response = await this.axiosInstance.get(`files/${id}`, {
            params: { ...params, ...(from_line !== undefined && { from_line }), ...(to_line !== undefined && { to_line }) },
        });
        const result = response.data;
        const data = result.data || {};
        const hasLineRange = from_line !== undefined || to_line !== undefined;
        if (hasLineRange) {
            // Partial / inspection download — return content inline, do NOT overwrite local file
            return {
                success: true,
                partial_download: true,
                message: `Partial content returned inline for '${data.title}' (id: ${id}), lines ${data.line_range?.from ?? from_line}–${data.line_range?.to ?? to_line}. File NOT written to disk (partial content would corrupt the local copy).`,
                metadata: {
                    id: data.id,
                    type: data.type,
                    slug: data.slug,
                    virtual_path: data.virtual_path,
                    download_type: data.download_type,
                    total_lines: data.total_lines,
                    line_range: data.line_range,
                },
                content: {
                    ...(data.html !== undefined && { html: data.html }),
                    ...(data.css !== undefined && { css: data.css }),
                    ...(data.js !== undefined && { js: data.js }),
                },
            };
        }
        // Full download — write to workspace and return summary
        const filesWritten = this.writeItemFiles(data);
        return {
            success: true,
            message: `'${data.title}' (id: ${id}) written to workspace. ${filesWritten.length} file(s) saved.`,
            files_written: filesWritten,
            files_count: filesWritten.length,
            metadata: {
                id: data.id,
                type: data.type,
                slug: data.slug,
                virtual_path: data.virtual_path,
                is_locked: data.is_locked,
                status: data.status,
                download_type: data.download_type,
                total_lines: data.total_lines,
                description: data.description,
                document_content: data.document_content,
            },
        };
    }
    async getFilesBatch(args) {
        const response = await this.axiosInstance.post("files/batch", args);
        const result = response.data;
        const items = Array.isArray(result.data) ? result.data : [];
        const itemsSummary = [];
        let totalFilesWritten = 0;
        for (const item of items) {
            const filesWritten = this.writeItemFiles(item);
            totalFilesWritten += filesWritten.length;
            itemsSummary.push({
                id: item.id,
                title: item.title,
                slug: item.slug,
                type: item.type,
                virtual_path: item.virtual_path,
                files_written: filesWritten,
            });
        }
        return {
            success: true,
            message: `Batch download complete. ${items.length} item(s) downloaded, ${totalFilesWritten} file(s) written to workspace.`,
            items_downloaded: items.length,
            total_files_written: totalFilesWritten,
            items: itemsSummary,
        };
    }
    async getTemplateInfo(id) {
        const response = await this.axiosInstance.get(`templates/${id}`);
        return response.data;
    }
    async getScriptInfo(id) {
        const response = await this.axiosInstance.get(`scripts/${id}`);
        return response.data;
    }
    async getContentInfo(id) {
        const response = await this.axiosInstance.get(`contents/${id}`);
        return response.data;
    }
    readFileContent(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        try {
            return fs.readFileSync(filePath, "utf-8");
        }
        catch (error) {
            throw new Error(`Failed to read file at ${filePath}: ${error.message}`);
        }
    }
    async saveItem(args) {
        const { type, id, html_path, css_path, js_path, document_content_path, ...rest } = args;
        const data = { ...rest };
        if (html_path)
            data.html = this.readFileContent(html_path);
        if (css_path)
            data.css = this.readFileContent(css_path);
        if (js_path)
            data.js = this.readFileContent(js_path);
        if (document_content_path)
            data.document_content = this.readFileContent(document_content_path);
        const response = await this.axiosInstance.post(`${type}/${id}/save`, data);
        return response.data;
    }
    async publishItem(args) {
        const { type, id } = args;
        const response = await this.axiosInstance.post(`${type}/${id}/publish`);
        return response.data;
    }
    async createItem(args) {
        const { type, html_path, css_path, js_path, ...rest } = args;
        const data = { ...rest };
        if (html_path)
            data.html = this.readFileContent(html_path);
        if (css_path)
            data.css = this.readFileContent(css_path);
        if (js_path)
            data.js = this.readFileContent(js_path);
        const response = await this.axiosInstance.post(`${type}`, data);
        return response.data;
    }
    async toggleItem(args) {
        const { type, id, enabled } = args;
        const response = await this.axiosInstance.post(`${type}/${id}/toggle`, { enabled });
        return response.data;
    }
    async updateConditions(args) {
        const { type, id, conditions } = args;
        const response = await this.axiosInstance.post(`${type}/${id}/conditions`, { conditions });
        return response.data;
    }
    async updateMetadata(args) {
        const { type, id, ...data } = args;
        const response = await this.axiosInstance.post(`${type}/${id}/update`, data);
        return response.data;
    }
    async deleteItem(args) {
        const { type, id } = args;
        const response = await this.axiosInstance.delete(`${type}/${id}`);
        return response.data;
    }
    async getRevisions(args) {
        const { type, id } = args;
        const response = await this.axiosInstance.get(`${type}/${id}/revisions`);
        return response.data;
    }
    async restoreRevision(args) {
        const { type, id, revision_id } = args;
        const response = await this.axiosInstance.post(`${type}/${id}/revisions/${revision_id}/restore`);
        return response.data;
    }
    async searchContents(args) {
        const response = await this.axiosInstance.get("contents/search", { params: args });
        return response.data;
    }
    async markContentEdit(args) {
        const { post_id } = args;
        const response = await this.axiosInstance.post(`posts/${post_id}/mark-edit`);
        return response.data;
    }
    async searchMedia(args) {
        const response = await this.axiosInstance.get("media/search", { params: args });
        return response.data;
    }
    async uploadMedia(args) {
        const { file_path, base64, filename, ...rest } = args;
        if (file_path) {
            if (!fs.existsSync(file_path)) {
                throw new Error(`File not found: ${file_path}`);
            }
            const form = new FormData();
            form.append("file", fs.createReadStream(file_path));
            // Add other parameters
            if (filename)
                form.append("filename", filename);
            if (rest.media_type)
                form.append("media_type", rest.media_type);
            if (rest.alt_text)
                form.append("alt_text", rest.alt_text);
            if (rest.title)
                form.append("title", rest.title);
            const response = await this.axiosInstance.post("media/upload", form, {
                headers: {
                    ...form.getHeaders(),
                },
            });
            return response.data;
        }
        else if (base64 && filename) {
            const response = await this.axiosInstance.post("media/upload", args);
            return response.data;
        }
        else {
            throw new Error("Either file_path or both base64 and filename must be provided.");
        }
    }
    async getImageSrcset(args) {
        const response = await this.axiosInstance.get("media/srcset", { params: args });
        return response.data;
    }
    async getRoles() {
        const response = await this.axiosInstance.get("roles");
        return response.data;
    }
    async getTailwindConfig() {
        const response = await this.axiosInstance.get("tailwind-config");
        return response.data;
    }
    async updateTailwindConfig(args) {
        const response = await this.axiosInstance.post("tailwind-config", args);
        return response.data;
    }
    // ── Global Library ──────────────────────────────────────────────────────
    async listLibraries(args) {
        const response = await this.axiosInstance.get("libraries", { params: args });
        const result = response.data;
        // Persist to .pk-agentic/library-info.json
        const filePath = ".pk-agentic/library-info.json";
        const page = args.page ?? 1;
        if (page === 1) {
            this.writeJsonFile(filePath, result);
        }
        else {
            let existing = { data: [] };
            if (fs.existsSync(filePath)) {
                try {
                    existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                }
                catch {
                    /**/
                }
            }
            existing.data = [...(existing.data ?? []), ...(result.data ?? [])];
            existing.pagination = result.pagination;
            this.writeJsonFile(filePath, existing);
        }
        return {
            success: true,
            message: `Global Libraries written to ${filePath}.`,
            file_written: filePath,
            data: result.data,
            pagination: result.pagination,
        };
    }
    async createLibrary(args) {
        const response = await this.axiosInstance.post("libraries", args);
        return response.data;
    }
    async updateLibrary(args) {
        const { id, ...data } = args;
        const response = await this.axiosInstance.post(`libraries/${id}/update`, data);
        return response.data;
    }
    async deleteLibrary(args) {
        const { id } = args;
        const response = await this.axiosInstance.delete(`libraries/${id}`);
        return response.data;
    }
    async searchLibraries(args) {
        const response = await this.axiosInstance.get("libraries/search", { params: args });
        return response.data;
    }
    async getLibrary(args) {
        const { id } = args;
        const response = await this.axiosInstance.get(`libraries/${id}`);
        return response.data;
    }
    async cdnDownloadLibrary(args) {
        const { id, urls } = args;
        const response = await this.axiosInstance.post(`libraries/${id}/cdn-download`, { urls });
        return response.data;
    }
    async saveLibraryFiles(args) {
        const { id, files } = args;
        const response = await this.axiosInstance.post(`libraries/${id}/save-files`, { files });
        return response.data;
    }
    async restoreLibraryBackup(args) {
        const { id, backup_key } = args;
        const response = await this.axiosInstance.post(`libraries/${id}/restore-backup`, { backup_key });
        return response.data;
    }
    async updateLibraryConditions(args) {
        const { id, conditions } = args;
        const response = await this.axiosInstance.post(`libraries/${id}/conditions`, { conditions });
        return response.data;
    }
    async toggleLibrary(args) {
        const { id, enabled } = args;
        const response = await this.axiosInstance.post(`libraries/${id}/toggle`, { enabled });
        return response.data;
    }
    async toggleLibraryLock(args) {
        const { id, locked } = args;
        const response = await this.axiosInstance.post(`libraries/${id}/lock`, { locked });
        return response.data;
    }
}
//# sourceMappingURL=handlers.js.map