import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
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
//# sourceMappingURL=image-generation.js.map