import { InitProjectArgs, GetAgentGuideArgs, OptimizeImageArgs, DownloadImageArgs } from "../types.js";
export declare class UtilityApi {
    initProject(args: InitProjectArgs): Promise<{
        success: boolean;
        message: string;
        root: string;
        directories: string[];
    }>;
    getAgentGuide(args: GetAgentGuideArgs): Promise<{
        success: boolean;
        message: string;
        file_written: string;
        absolute_path: string;
    }>;
    optimizeImage(args: OptimizeImageArgs): Promise<{
        success: boolean;
        message: string;
        input_path: string;
        output_path: string;
        original: {
            width: number;
            height: number;
            size_bytes: number;
            format: string;
        };
        output: {
            width: number;
            height: number;
            size_bytes: number;
            format: string;
        };
        resized: boolean;
        converted_to_webp: boolean;
        size_reduction: string;
    }>;
    downloadImage(args: DownloadImageArgs): Promise<{
        success: boolean;
        message: string;
        path: string;
    }>;
}
