import { GenerateImageArgs } from "../types.js";
export declare class ImageGenerationApi {
    private client;
    private modelId;
    constructor(apiKey?: string, modelId?: string);
    generateImage(args: GenerateImageArgs): Promise<{
        success: boolean;
        message: string;
        file_path: string;
        image_name: string;
        page_name: string;
        model: string;
    }>;
}
