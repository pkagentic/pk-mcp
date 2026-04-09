import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
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
                admin_url: d.admin_url,
                plugin_version: d.plugin_version,
                wordpress_version: d.wordpress_version,
                php_version: d.php_version,
                enabled_post_types: d.enabled_post_types,
                available_template_types: d.available_template_types,
                batch_file_limit: d.batch_file_limit,
                css_framework: d.css_framework,
                css_framework_label: d.css_framework_label,
                timezone: d.timezone,
                language: d.language,
                theme: d.theme,
                plugins: d.plugins,
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
    async getAgentGuide(guide) {
        const response = await this.axiosInstance.get("guide", { params: { guide } });
        const result = response.data;
        const content = result?.data?.data ?? "";
        const version = result?.data?.version ?? "";
        // Write to .pk-agentic/agent-guide/{guide}.md
        const destDir = path.resolve(".pk-agentic/agent-guide");
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        const destFile = path.join(destDir, `${guide}.md`);
        fs.writeFileSync(destFile, content, "utf8");
        const relativePath = `.pk-agentic/agent-guide/${guide}.md`;
        return {
            success: true,
            message: `Guide written to ${relativePath}. Read that file now to learn about '${guide}'.`,
            guide,
            version,
            file_written: relativePath,
            absolute_path: destFile,
        };
    }
    async updateAllGuides() {
        const projectRoot = process.cwd();
        const guideDir = path.resolve(projectRoot, ".pk-agentic/agent-guide");
        const results = [];
        // 1. Fetch main guide → AGENTS.md in project root
        const mainResponse = await this.axiosInstance.get("guide", { params: { guide: "main" } });
        const mainContent = mainResponse.data?.data?.data ?? "";
        const version = mainResponse.data?.data?.version ?? "";
        const mainPath = path.resolve(projectRoot, "AGENTS.md");
        const mainExisted = fs.existsSync(mainPath);
        fs.writeFileSync(mainPath, mainContent, "utf8");
        // 2. Collect sub-guide slugs from existing local files
        const slugs = [];
        if (fs.existsSync(guideDir)) {
            for (const entry of fs.readdirSync(guideDir)) {
                if (entry.endsWith(".md")) {
                    slugs.push(entry.slice(0, -3));
                }
            }
        }
        else {
            fs.mkdirSync(guideDir, { recursive: true });
        }
        // 3. Fetch and overwrite each existing sub-guide
        for (const slug of slugs) {
            const response = await this.axiosInstance.get("guide", { params: { guide: slug } });
            const content = response.data?.data?.data ?? "";
            const filePath = path.join(guideDir, `${slug}.md`);
            const existed = fs.existsSync(filePath);
            fs.writeFileSync(filePath, content, "utf8");
            results.push({
                guide: slug,
                file: `.pk-agentic/agent-guide/${slug}.md`,
                status: existed ? "updated" : "new",
            });
        }
        const newCount = results.filter(r => r.status === "new").length;
        const updatedCount = results.filter(r => r.status === "updated").length;
        return {
            success: true,
            version,
            main_guide: { file: "AGENTS.md", status: mainExisted ? "updated" : "new" },
            sub_guides: results,
            new_count: newCount,
            updated_count: updatedCount + (mainExisted ? 1 : 0),
            message: `Agent guides refreshed (plugin v${version}). Main guide → AGENTS.md. Sub-guides: ${newCount} new, ${updatedCount} updated.`,
        };
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
//# sourceMappingURL=pk-agent.js.map