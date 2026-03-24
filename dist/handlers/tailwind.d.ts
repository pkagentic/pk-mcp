import { TailwindOptimizeArgs } from "../types.js";
export declare class TailwindApi {
    optimize(args: TailwindOptimizeArgs): Promise<{
        success: boolean;
        message: string;
        input_css_path: string;
        output_path: string;
        log_path: string;
        css_size: number;
    }>;
}
