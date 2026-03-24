import fs from "fs";
import path from "path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import cssnano from "cssnano";
import { glob } from "glob";
import { fileURLToPath } from "url";
import axios from "axios";
// Resolve the directory of this compiled file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class TailwindApi {
    baseURL;
    key;
    email;
    constructor(baseURL = "", key = "", email = "") {
        this.baseURL = baseURL;
        this.key = key;
        this.email = email;
    }
    async optimize(args) {
        const { tailwind_config } = args; // tailwind_config is now the @theme CSS block string
        const projectRoot = process.cwd();
        // 1. Setup workspace directory
        const workspaceDir = path.join(projectRoot, "workspace");
        if (!fs.existsSync(workspaceDir)) {
            fs.mkdirSync(workspaceDir, { recursive: true });
        }
        const inputCssPath = path.join(workspaceDir, "tailwind.css");
        const outputDir = path.join(workspaceDir, "optimize");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputPath = path.join(outputDir, "optimized-tailwind.css");
        // 2. Resolve absolute path to tailwindcss index.css in MCP node_modules
        const mcpRoot = path.resolve(__dirname, "..", "..");
        const tailwindIndexCss = path.join(mcpRoot, "node_modules", "tailwindcss", "index.css").replace(/\\/g, "/");
        // 3. Discover all files manually for scanning
        const workspaceFiles = await glob([
            path.join(workspaceDir, "**/*.php").replace(/\\/g, "/"),
            path.join(workspaceDir, "**/*.html").replace(/\\/g, "/"),
        ], { absolute: true });
        const sourceDirectives = workspaceFiles
            .map((f) => `@source "${f.replace(/\\/g, "/")}";`)
            .join("\n");
        // 4. Write tailwind.css (Input)
        const cssContent = `
@import "${tailwindIndexCss}" prefix(pkt);

${tailwind_config}

${sourceDirectives}
`;
        fs.writeFileSync(inputCssPath, cssContent.trim());
        try {
            // 5. Run PostCSS
            const css = fs.readFileSync(inputCssPath, "utf-8");
            const result = await postcss([
                tailwindcss({
                    base: mcpRoot,
                }),
                cssnano({ preset: "default" })
            ]).process(css, {
                from: inputCssPath,
                to: outputPath
            });
            // 6. Write optimized CSS
            fs.writeFileSync(outputPath, result.css);
            // Write log file for debugging
            const logPath = path.join(workspaceDir, "tailwind.log");
            const logContent = `
[Tailwind Optimize Log - ${new Date().toISOString()}]
Approach: PostCSS
Project Root: ${projectRoot}
Workspace: ${workspaceDir}
Files Found: ${workspaceFiles.length}
Output Path: ${outputPath}

--- Input CSS ---
${cssContent.trim()}

--- Generated CSS Stats ---
Size: ${result.css.length} bytes
    `;
            fs.writeFileSync(logPath, logContent.trim());
            // 7. Auto-upload to server if API credentials are available
            let uploadResult = null;
            let uploadError = null;
            if (this.baseURL && this.key && this.email) {
                try {
                    uploadResult = await this.uploadToServer(outputPath);
                }
                catch (err) {
                    uploadError = err.message ?? String(err);
                }
            }
            return {
                success: true,
                message: `Tailwind CSS optimized successfully using PostCSS. Found ${workspaceFiles.length} source files. Prefix set to 'pkt:'.`,
                input_css_path: path.relative(projectRoot, inputCssPath),
                output_path: path.relative(projectRoot, outputPath),
                log_path: path.relative(projectRoot, logPath),
                css_size: result.css.length,
                uploaded: uploadResult !== null,
                upload_result: uploadResult,
                upload_error: uploadError,
            };
        }
        catch (error) {
            throw new Error(`Tailwind Optimization Error (PostCSS): ${error.message}`);
        }
    }
    /**
     * Upload the generated CSS file to the WordPress server via the agent API.
     */
    async uploadToServer(outputPath) {
        const cssContent = fs.readFileSync(outputPath, "utf-8");
        const base = this.baseURL.endsWith("/") ? this.baseURL : `${this.baseURL}/`;
        const uploadUrl = `${base}tailwind/upload-css`;
        const response = await axios.post(uploadUrl, cssContent, {
            headers: {
                "X-PK-Agent-Key": this.key,
                "X-PK-Agent-Email": this.email,
                "Content-Type": "text/css",
            },
            maxBodyLength: 10 * 1024 * 1024, // 10 MB
        });
        return response.data;
    }
}
//# sourceMappingURL=tailwind.js.map