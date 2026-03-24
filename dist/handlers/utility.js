import fs from "fs";
import path from "path";
import axios from "axios";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { finished } from "stream/promises";
// Resolve the directory of this compiled file so we can locate bundled guide files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
        // Note: Since this is now in src/handlers/, the path to agent-guide/ might need adjustment
        // relative to the compiled dist/handlers/ directory.
        const sourceDir = path.resolve(__dirname, "..", "..", "agent-guide");
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
//# sourceMappingURL=utility.js.map