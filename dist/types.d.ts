export type ItemType = "templates" | "scripts" | "contents";
export interface SyncArgs {
    type?: "all" | "template" | "script" | "content";
    page?: number;
    per_page?: number;
}
export interface GetFileArgs {
    id: number;
    version?: "sandbox" | "production";
    download_type?: "all" | "html" | "css" | "js";
    from_line?: number;
    to_line?: number;
}
export interface GetFilesBatchArgs {
    ids: number[];
    version?: "sandbox" | "production";
}
export interface SaveTemplateArgs {
    id: number;
    html_path?: string;
    css_path?: string;
    js_path?: string;
    document_content_path?: string;
    description?: string;
    priority_css?: number;
    priority_js?: number;
    location_js?: "head" | "open_body" | "foot";
    location_php?: object;
}
export interface PublishTemplateArgs {
    id: number;
}
export interface CreateTemplateArgs {
    title: string;
    sub_type: "header" | "footer" | "single" | "archive" | "404" | "search" | "front_page" | "blog" | "custom" | "partial";
    html_path?: string;
    css_path?: string;
    js_path?: string;
    conditions?: object;
    priority_css?: number;
    priority_js?: number;
    location_js?: "head" | "open_body" | "foot";
    location_php?: object;
}
export interface UpdateTemplateArgs {
    id: number;
    title?: string;
    slug?: string;
}
export interface ToggleTemplateArgs {
    id: number;
    enabled?: boolean;
}
export interface UpdateTemplateConditionsArgs {
    id: number;
    conditions: object;
}
export interface DeleteTemplateArgs {
    id: number;
}
export interface GetTemplateRevisionsArgs {
    id: number;
}
export interface RestoreTemplateRevisionArgs {
    id: number;
    revision_id: number;
}
export interface SaveScriptArgs {
    id: number;
    html_path?: string;
    css_path?: string;
    js_path?: string;
    document_content_path?: string;
    description?: string;
    priority_css?: number;
    priority_js?: number;
    location_js?: "head" | "open_body" | "foot";
    script_mode?: "advanced" | "php" | "css" | "js";
    location_php?: object;
}
export interface PublishScriptArgs {
    id: number;
}
export interface CreateScriptArgs {
    title: string;
    html_path?: string;
    css_path?: string;
    js_path?: string;
    conditions?: object;
    priority_css?: number;
    priority_js?: number;
    location_js?: "head" | "open_body" | "foot";
    script_mode?: "advanced" | "php" | "css" | "js";
    location_php?: object;
}
export interface UpdateScriptArgs {
    id: number;
    title?: string;
    slug?: string;
}
export interface ToggleScriptArgs {
    id: number;
    enabled?: boolean;
}
export interface UpdateScriptConditionsArgs {
    id: number;
    conditions: object;
}
export interface DeleteScriptArgs {
    id: number;
}
export interface GetScriptRevisionsArgs {
    id: number;
}
export interface RestoreScriptRevisionArgs {
    id: number;
    revision_id: number;
}
export interface SaveContentArgs {
    id: number;
    html_path?: string;
    css_path?: string;
    js_path?: string;
    document_content_path?: string;
    description?: string;
    priority_css?: number;
    priority_js?: number;
    location_js?: "head" | "open_body" | "foot";
}
export interface PublishContentArgs {
    id: number;
}
export interface CreateContentArgs {
    title: string;
    post_type: string;
    html_path?: string;
    css_path?: string;
    js_path?: string;
    priority_css?: number;
    priority_js?: number;
    location_js?: "head" | "open_body" | "foot";
}
export interface UpdateContentArgs {
    id: number;
    title?: string;
    slug?: string;
}
export interface GetTemplateInfoArgs {
    id: number;
}
export interface GetScriptInfoArgs {
    id: number;
}
export interface GetContentInfoArgs {
    id: number;
}
export interface SaveItemArgs {
    type: ItemType;
    id: number;
    html_path?: string;
    css_path?: string;
    js_path?: string;
    document_content_path?: string;
    description?: string;
    priority_css?: number;
    priority_js?: number;
    location_js?: "head" | "open_body" | "foot";
    script_mode?: "advanced" | "php" | "css" | "js";
    location_php?: object;
}
export interface PublishItemArgs {
    type: ItemType;
    id: number;
}
export interface CreateItemArgs {
    type: ItemType;
    title: string;
    sub_type?: "header" | "footer" | "single" | "archive" | "404" | "search" | "front_page" | "blog" | "custom" | "partial";
    post_type?: string;
    html_path?: string;
    css_path?: string;
    js_path?: string;
    conditions?: object;
    priority_css?: number;
    priority_js?: number;
    location_js?: "head" | "open_body" | "foot";
    script_mode?: "advanced" | "php" | "css" | "js";
    location_php?: object;
}
export interface ToggleItemArgs {
    type: "templates" | "scripts";
    id: number;
    enabled?: boolean;
}
export interface UpdateConditionsArgs {
    type: "templates" | "scripts";
    id: number;
    conditions: object;
}
export interface UpdateMetadataArgs {
    type: ItemType;
    id: number;
    title?: string;
    slug?: string;
}
export interface DeleteItemArgs {
    type: "templates" | "scripts";
    id: number;
}
export interface GetRevisionsArgs {
    type: "templates" | "scripts";
    id: number;
}
export interface RestoreRevisionArgs {
    type: "templates" | "scripts";
    id: number;
    revision_id: number;
}
export interface SearchContentsArgs {
    search?: string;
    post_type?: string;
    per_page?: number;
}
export interface MarkContentEditArgs {
    post_id: number;
}
export interface SearchMediaArgs {
    search?: string;
    media_type?: "image" | "svg" | "pdf" | "font";
    per_page?: number;
}
export interface UploadMediaArgs {
    file_path?: string;
    base64?: string;
    filename?: string;
    media_type?: "image" | "svg" | "pdf" | "font";
    alt_text?: string;
    title?: string;
}
export interface GetImageSrcsetArgs {
    attachment_id: number;
}
export interface DownloadImageArgs {
    url: string;
    path: string;
}
export interface ReadWebPageArgs {
    url: string;
    render_js?: boolean;
    wait_selector?: string;
    css_selector?: string;
}
export interface InitProjectArgs {
    path?: string;
}
export interface UpdateTailwindConfigArgs {
    theme_css: string;
}
export interface GenerateImageArgs {
    prompt_path: string;
    image_name: string;
    page_name: string;
    aspect_ratio?: "1:1" | "9:16" | "16:9" | "3:2" | "4:3";
}
export type AgentGuideTopic = "workflow" | "templates" | "conditions" | "scripts" | "preview" | "errors" | "media" | "permissions" | "navigation" | "tailwind-config" | "image-generation" | "image-optimize" | "global-library" | "tailwind-optimize";
export interface TailwindOptimizeArgs {
    tailwind_config: string;
}
export interface ListLibrariesArgs {
    page?: number;
    per_page?: number;
}
export interface CreateLibraryArgs {
    title: string;
    library_type: "js" | "css" | "font";
}
export interface UpdateLibraryArgs {
    id: number;
    title?: string;
    library_type?: "js" | "css" | "font";
    mode?: "local" | "cdn";
}
export interface DeleteLibraryArgs {
    id: number;
}
export interface SearchLibrariesArgs {
    q: string;
}
export interface GetLibraryArgs {
    id: number;
}
export interface CdnDownloadLibraryArgs {
    id: number;
    urls: string[];
}
export interface SaveLibraryFilesArgs {
    id: number;
    files: {
        filename: string;
        priority?: number;
        location_js?: "foot" | "head" | "open_body";
    }[];
}
export interface RestoreLibraryBackupArgs {
    id: number;
    backup_key: string;
}
export interface UpdateLibraryConditionsArgs {
    id: number;
    conditions: object;
}
export interface ToggleLibraryArgs {
    id: number;
    enabled?: boolean;
}
export interface ToggleLibraryLockArgs {
    id: number;
    locked?: boolean;
}
export interface GetAgentGuideArgs {
    guide: AgentGuideTopic;
}
export interface OptimizeImageArgs {
    file_path: string;
    output_path?: string;
    width?: number;
    height?: number;
    quality?: number;
}
