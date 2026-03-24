import { ReadWebPageArgs } from "../types.js";
export declare class WebCrawlerApi {
    private turndownService;
    constructor();
    readWebPage(args: ReadWebPageArgs): Promise<{
        success: boolean;
        message: string;
        url?: undefined;
        title?: undefined;
        content?: undefined;
        byline?: undefined;
        excerpt?: undefined;
    } | {
        success: boolean;
        url: string;
        title: string;
        content: string;
        message?: undefined;
        byline?: undefined;
        excerpt?: undefined;
    } | {
        success: boolean;
        url: string;
        title: string;
        byline: string | null | undefined;
        excerpt: string | null | undefined;
        content: string;
        message?: undefined;
    }>;
}
