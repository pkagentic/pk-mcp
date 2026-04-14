import { SyncArgs, GetFileArgs, GetFilesBatchArgs, SaveItemArgs, PublishItemArgs, CreateItemArgs, ToggleItemArgs, UpdateConditionsArgs, UpdateMetadataArgs, DeleteItemArgs, GetRevisionsArgs, RestoreRevisionArgs, SearchContentsArgs, MarkContentEditArgs, SearchMediaArgs, UploadMediaArgs, GetImageSrcsetArgs, ListLibrariesArgs, CreateLibraryArgs, UpdateLibraryArgs, DeleteLibraryArgs, SearchLibrariesArgs, GetLibraryArgs, CdnDownloadLibraryArgs, SaveLibraryFilesArgs, RestoreLibraryBackupArgs, UpdateLibraryConditionsArgs, ToggleLibraryArgs, ToggleLibraryLockArgs, CreateBlogPostArgs, GetBlogPostArgs, SaveBlogPostArgs, PublishBlogPostArgs, DraftBlogPostArgs, ScheduleBlogPostArgs, AddPostTaxonomyArgs, RemovePostTaxonomyArgs, SetFeatureImageArgs, UpdatePostExcerptArgs, ListBlogPostsArgs, SearchBlogPostsArgs } from "../types.js";
export declare class PKAgentApi {
    private axiosInstance;
    constructor(baseURL: string, key: string, email: string);
    /**
     * Ensure a directory exists and write JSON content to a file.
     */
    private writeJsonFile;
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
    private writeItemFiles;
    private readFileContent;
    getSiteInfo(): Promise<{
        success: boolean;
        message: string;
        file_written: string;
        summary: {
            site_name: any;
            site_url: any;
            admin_url: any;
            plugin_version: any;
            wordpress_version: any;
            php_version: any;
            enabled_post_types: any;
            available_template_types: any;
            batch_file_limit: any;
            css_framework: any;
            css_framework_label: any;
            timezone: any;
            language: any;
            theme: any;
            plugins: any;
            permissions: any;
            menu_locations: any;
        };
    }>;
    syncItems(args: SyncArgs): Promise<{
        success: boolean;
        message: string;
        file_written: string;
        summary: {
            page: any;
            per_page: any;
            total_items: any;
            total_pages: any;
            has_more: any;
            items_on_page: {
                templates: any;
                scripts: any;
                content: any;
            };
        };
    }>;
    getFile(args: GetFileArgs): Promise<{
        success: boolean;
        partial_download: boolean;
        message: string;
        metadata: {
            id: any;
            type: any;
            slug: any;
            virtual_path: any;
            download_type: any;
            total_lines: any;
            line_range: any;
            is_locked?: undefined;
            status?: undefined;
            description?: undefined;
            document_content?: undefined;
        };
        content: {
            js?: any;
            css?: any;
            html?: any;
        };
        files_written?: undefined;
        files_count?: undefined;
    } | {
        success: boolean;
        message: string;
        files_written: string[];
        files_count: number;
        metadata: {
            id: any;
            type: any;
            slug: any;
            virtual_path: any;
            is_locked: any;
            status: any;
            download_type: any;
            total_lines: any;
            description: any;
            document_content: any;
            line_range?: undefined;
        };
        partial_download?: undefined;
        content?: undefined;
    }>;
    getFilesBatch(args: GetFilesBatchArgs): Promise<{
        success: boolean;
        message: string;
        items_downloaded: number;
        total_files_written: number;
        items: any[];
    }>;
    getTemplateInfo(id: number): Promise<any>;
    getScriptInfo(id: number): Promise<any>;
    getContentInfo(id: number): Promise<any>;
    saveItem(args: SaveItemArgs): Promise<any>;
    publishItem(args: PublishItemArgs): Promise<any>;
    createItem(args: CreateItemArgs): Promise<any>;
    toggleItem(args: ToggleItemArgs): Promise<any>;
    updateConditions(args: UpdateConditionsArgs): Promise<any>;
    updateMetadata(args: UpdateMetadataArgs): Promise<any>;
    deleteItem(args: DeleteItemArgs): Promise<any>;
    getRevisions(args: GetRevisionsArgs): Promise<any>;
    restoreRevision(args: RestoreRevisionArgs): Promise<any>;
    searchContents(args: SearchContentsArgs): Promise<any>;
    markContentEdit(args: MarkContentEditArgs): Promise<any>;
    searchMedia(args: SearchMediaArgs): Promise<any>;
    uploadMedia(args: UploadMediaArgs): Promise<any>;
    getImageSrcset(args: GetImageSrcsetArgs): Promise<any>;
    getAgentGuide(guide: string): Promise<{
        success: boolean;
        message: string;
        guide: string;
        version: string;
        file_written: string;
        absolute_path: string;
    }>;
    updateAllGuides(): Promise<{
        success: boolean;
        version: string;
        main_guide: {
            file: string;
            status: string;
        };
        sub_guides: {
            guide: string;
            file: string;
            status: "new" | "updated";
        }[];
        new_count: number;
        updated_count: number;
        message: string;
    }>;
    getRoles(): Promise<any>;
    getTailwindConfig(): Promise<any>;
    updateTailwindConfig(args: any): Promise<any>;
    listLibraries(args: ListLibrariesArgs): Promise<{
        success: boolean;
        message: string;
        file_written: string;
        data: any;
        pagination: any;
    }>;
    createLibrary(args: CreateLibraryArgs): Promise<any>;
    updateLibrary(args: UpdateLibraryArgs): Promise<any>;
    deleteLibrary(args: DeleteLibraryArgs): Promise<any>;
    searchLibraries(args: SearchLibrariesArgs): Promise<any>;
    getLibrary(args: GetLibraryArgs): Promise<any>;
    cdnDownloadLibrary(args: CdnDownloadLibraryArgs): Promise<any>;
    saveLibraryFiles(args: SaveLibraryFilesArgs): Promise<any>;
    restoreLibraryBackup(args: RestoreLibraryBackupArgs): Promise<any>;
    updateLibraryConditions(args: UpdateLibraryConditionsArgs): Promise<any>;
    toggleLibrary(args: ToggleLibraryArgs): Promise<any>;
    toggleLibraryLock(args: ToggleLibraryLockArgs): Promise<any>;
    createBlogPost(args: CreateBlogPostArgs): Promise<any>;
    getBlogPost(args: GetBlogPostArgs & {
        output_dir?: string;
    }): Promise<any>;
    saveBlogPost(args: SaveBlogPostArgs): Promise<any>;
    publishBlogPost(args: PublishBlogPostArgs): Promise<any>;
    draftBlogPost(args: DraftBlogPostArgs): Promise<any>;
    scheduleBlogPost(args: ScheduleBlogPostArgs): Promise<any>;
    addPostTaxonomy(args: AddPostTaxonomyArgs): Promise<any>;
    removePostTaxonomy(args: RemovePostTaxonomyArgs): Promise<any>;
    setFeatureImage(args: SetFeatureImageArgs): Promise<any>;
    updatePostExcerpt(args: UpdatePostExcerptArgs): Promise<any>;
    listBlogPosts(args: ListBlogPostsArgs): Promise<any>;
    searchBlogPosts(args: SearchBlogPostsArgs): Promise<any>;
}
