import { TailwindOptimizeArgs } from "../types.js";
export declare class TailwindApi {
    private baseURL;
    private key;
    private email;
    constructor(baseURL?: string, key?: string, email?: string);
    optimize(args: TailwindOptimizeArgs): Promise<{
        success: boolean;
        message: string;
        input_css_path: string;
        output_path: string;
        log_path: string;
        css_size: number;
        uploaded: boolean;
        upload_result: Record<string, unknown> | null;
        upload_error: string | null;
    }>;
    /**
     * Upload the generated CSS file to the WordPress server via the agent API.
     */
    private uploadToServer;
}
