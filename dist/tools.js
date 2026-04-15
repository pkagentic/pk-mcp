export const TOOLS = [
    {
        name: "get_site_info",
        description: "Get WordPress site metadata, enabled post types, plugin version, permissions, batch limits, and menu locations.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "sync",
        description: "List all items (templates, scripts, content) managed by the plugin. Includes lock status.",
        inputSchema: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    enum: ["all", "template", "script", "content"],
                    description: "Filter by item type.",
                    default: "all",
                },
                page: {
                    type: "number",
                    description: "Page number (1-based).",
                    default: 1,
                },
                per_page: {
                    type: "number",
                    description: "Items per page (1-100).",
                    default: 25,
                },
            },
        },
    },
    {
        name: "get_file",
        description: "Retrieve full or partial content (HTML/CSS/JS) of a single template, script, or content item. Includes lock status.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID (pk_agentic_data.id)." },
                version: {
                    type: "string",
                    enum: ["sandbox", "production"],
                    description: "Which version to return.",
                    default: "sandbox",
                },
                download_type: {
                    type: "string",
                    enum: ["all", "html", "css", "js"],
                    description: "Which code type to return.",
                    default: "all",
                },
                from_line: {
                    type: "number",
                    description: "Starting line number (1-based). Only for single type downloads.",
                },
                to_line: {
                    type: "number",
                    description: "Ending line number. Only for single type downloads.",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "get_files_batch",
        description: "Batch download full content for multiple items. Subject to batch_file_limit from get_site_info. Includes lock status.",
        inputSchema: {
            type: "object",
            properties: {
                ids: { type: "array", items: { type: "number" }, description: "Array of data record IDs." },
                version: {
                    type: "string",
                    enum: ["sandbox", "production"],
                    default: "sandbox",
                },
            },
            required: ["ids"],
        },
    },
    {
        name: "get_template_info",
        description: "Retrieve metadata for a template (conditions, sub_type, location_php, location_js, lock status) without code content.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
            },
            required: ["id"],
        },
    },
    {
        name: "get_script_info",
        description: "Retrieve metadata for a global script (conditions, location_js, location_php, mode, lock status) without code content.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
            },
            required: ["id"],
        },
    },
    {
        name: "get_content_info",
        description: "Retrieve metadata for a content item (permalink, preview key, location_js, lock status) without code content.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID (pk_agentic_data.id)." },
            },
            required: ["id"],
        },
    },
    // Templates
    {
        name: "save_template",
        description: "Save template code and settings to sandbox (draft).",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
                html_path: { type: "string", description: "Path to the HTML/PHP template code file." },
                css_path: { type: "string", description: "Path to the CSS code file." },
                js_path: { type: "string", description: "Path to the JavaScript code file." },
                document_content_path: { type: "string", description: "Path to the Markdown documentation file." },
                description: { type: "string", description: "Short description of the item." },
                priority_css: { type: "number", description: "CSS hook priority." },
                priority_js: { type: "number", description: "JS hook priority." },
                location_js: { type: "string", enum: ["head", "open_body", "foot"], description: "JS injection location." },
                location_php: { type: "object", description: "PHP hook locations object." },
            },
            required: ["id"],
        },
    },
    {
        name: "publish_template",
        description: "Publish template from sandbox to production.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
            },
            required: ["id"],
        },
    },
    {
        name: "create_template",
        description: "Create a new template.",
        inputSchema: {
            type: "object",
            properties: {
                title: { type: "string", description: "Title of the new template." },
                sub_type: {
                    type: "string",
                    enum: ["header", "footer", "single", "archive", "404", "search", "front_page", "blog", "custom", "partial"],
                    description: "Template sub-type."
                },
                html_path: { type: "string", description: "Path to the initial HTML/PHP code file." },
                css_path: { type: "string", description: "Path to the initial CSS code file." },
                js_path: { type: "string", description: "Path to the initial JavaScript code file." },
                conditions: { type: "object", description: "Conditions JSON object." },
                priority_css: { type: "number", description: "CSS hook priority.", default: 30 },
                priority_js: { type: "number", description: "JS hook priority.", default: 30 },
                location_js: { type: "string", enum: ["head", "open_body", "foot"], description: "JS injection location.", default: "foot" },
                location_php: { type: "object", description: "PHP hook locations object." },
            },
            required: ["title", "sub_type"],
        },
    },
    {
        name: "update_template",
        description: "Update template title or slug.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
                title: { type: "string", description: "New title." },
                slug: { type: "string", description: "New slug." },
            },
            required: ["id"],
        },
    },
    {
        name: "toggle_template",
        description: "Enable or disable a template.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
                enabled: { type: "boolean", description: "New state." },
            },
            required: ["id"],
        },
    },
    {
        name: "update_template_conditions",
        description: "Update the condition rules for a template. Supports unified groups format (v3).",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
                conditions: { type: "object", description: "Conditions JSON object." },
            },
            required: ["id", "conditions"],
        },
    },
    {
        name: "delete_template",
        description: "Delete a template.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
            },
            required: ["id"],
        },
    },
    {
        name: "get_template_revisions",
        description: "List revision history for a template.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
            },
            required: ["id"],
        },
    },
    {
        name: "restore_template_revision",
        description: "Restore a template revision to sandbox.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
                revision_id: { type: "number", description: "The ID of the revision to restore." },
            },
            required: ["id", "revision_id"],
        },
    },
    // Scripts
    {
        name: "save_script",
        description: "Save script code and settings to sandbox (draft).",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
                html_path: { type: "string", description: "Path to the HTML/PHP code file." },
                css_path: { type: "string", description: "Path to the CSS code file." },
                js_path: { type: "string", description: "Path to the JavaScript code file." },
                document_content_path: { type: "string", description: "Path to the Markdown documentation file." },
                description: { type: "string", description: "Short description of the item." },
                priority_css: { type: "number", description: "CSS hook priority." },
                priority_js: { type: "number", description: "JS hook priority." },
                location_js: { type: "string", enum: ["head", "open_body", "foot"], description: "JS injection location." },
                script_mode: { type: "string", enum: ["advanced", "php", "css", "js"], description: "Script mode." },
                location_php: { type: "object", description: "PHP hook locations object." },
            },
            required: ["id"],
        },
    },
    {
        name: "publish_script",
        description: "Publish script from sandbox to production.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
            },
            required: ["id"],
        },
    },
    {
        name: "create_script",
        description: "Create a new global script.",
        inputSchema: {
            type: "object",
            properties: {
                title: { type: "string", description: "Title of the new script." },
                html_path: { type: "string", description: "Path to the initial HTML/PHP code file." },
                css_path: { type: "string", description: "Path to the initial CSS code file." },
                js_path: { type: "string", description: "Path to the initial JavaScript code file." },
                conditions: { type: "object", description: "Conditions JSON object." },
                priority_css: { type: "number", description: "CSS hook priority.", default: 30 },
                priority_js: { type: "number", description: "JS hook priority.", default: 30 },
                location_js: { type: "string", enum: ["head", "open_body", "foot"], description: "JS injection location.", default: "foot" },
                script_mode: { type: "string", enum: ["advanced", "php", "css", "js"], description: "Script mode.", default: "advanced" },
                location_php: { type: "object", description: "PHP hook locations object." },
            },
            required: ["title"],
        },
    },
    {
        name: "update_script",
        description: "Update script title or slug.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
                title: { type: "string", description: "New title." },
                slug: { type: "string", description: "New slug." },
            },
            required: ["id"],
        },
    },
    {
        name: "toggle_script",
        description: "Enable or disable a script.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
                enabled: { type: "boolean", description: "New state." },
            },
            required: ["id"],
        },
    },
    {
        name: "update_script_conditions",
        description: "Update the condition rules for a script. Supports unified groups format (v3).",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
                conditions: { type: "object", description: "Conditions JSON object." },
            },
            required: ["id", "conditions"],
        },
    },
    {
        name: "delete_script",
        description: "Delete a script.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
            },
            required: ["id"],
        },
    },
    {
        name: "get_script_revisions",
        description: "List revision history for a script.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
            },
            required: ["id"],
        },
    },
    {
        name: "restore_script_revision",
        description: "Restore a script revision to sandbox.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
                revision_id: { type: "number", description: "The ID of the revision to restore." },
            },
            required: ["id", "revision_id"],
        },
    },
    // Content
    {
        name: "save_content",
        description: "Save content code and settings to sandbox (draft).",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
                html_path: { type: "string", description: "Path to the HTML code file." },
                css_path: { type: "string", description: "Path to the CSS code file." },
                js_path: { type: "string", description: "Path to the JavaScript code file." },
                document_content_path: { type: "string", description: "Path to the Markdown documentation file." },
                description: { type: "string", description: "Short description of the item." },
                priority_css: { type: "number", description: "CSS hook priority." },
                priority_js: { type: "number", description: "JS hook priority." },
                location_js: { type: "string", enum: ["head", "open_body", "foot"], description: "JS injection location." },
            },
            required: ["id"],
        },
    },
    {
        name: "publish_content",
        description: "Publish content from sandbox to production.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
            },
            required: ["id"],
        },
    },
    {
        name: "create_content",
        description: "Create a new content item (page, post, etc).",
        inputSchema: {
            type: "object",
            properties: {
                title: { type: "string", description: "Title of the new content." },
                post_type: { type: "string", description: "WordPress post type." },
                html_path: { type: "string", description: "Path to the initial HTML code file." },
                css_path: { type: "string", description: "Path to the initial CSS code file." },
                js_path: { type: "string", description: "Path to the initial JavaScript code file." },
                priority_css: { type: "number", description: "CSS hook priority.", default: 30 },
                priority_js: { type: "number", description: "JS hook priority.", default: 30 },
                location_js: { type: "string", enum: ["head", "open_body", "foot"], description: "JS injection location.", default: "foot" },
            },
            required: ["title", "post_type"],
        },
    },
    {
        name: "update_content",
        description: "Update content title or slug.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The data record ID." },
                title: { type: "string", description: "New title." },
                slug: { type: "string", description: "New slug." },
            },
            required: ["id"],
        },
    },
    // Search & Utilities
    {
        name: "search_contents",
        description: "Search all public post types by title or slug (contains match). Includes PK Agentic status for discovery.",
        inputSchema: {
            type: "object",
            properties: {
                search: { type: "string", description: "Keyword to match against post_title or post_name." },
                post_type: { type: "string", description: "Filter to a single post type." },
                per_page: { type: "number", description: "Max results (max 100).", default: 20 },
            },
        },
    },
    {
        name: "mark_content_edit",
        description: "Onboard an existing WordPress post into PK Agentic so an agent can edit it.",
        inputSchema: {
            type: "object",
            properties: {
                post_id: { type: "number", description: "WordPress post ID (wp_posts.ID)." },
            },
            required: ["post_id"],
        },
    },
    {
        name: "search_media",
        description: "Search WordPress Media Library by keyword and type.",
        inputSchema: {
            type: "object",
            properties: {
                search: { type: "string", description: "Keyword to search in title/filename." },
                media_type: {
                    type: "string",
                    enum: ["image", "svg", "pdf", "font"],
                    description: "Filter by type.",
                    default: "image"
                },
                per_page: { type: "number", description: "Max results (max 50).", default: 20 },
            },
        },
    },
    {
        name: "upload_media",
        description: "Upload a media file (image, SVG, PDF, or font) to the WordPress Media Library. Supports local file paths (multipart) or base64 data. Response includes a `srcset` string for responsive images (images only; null for SVG, PDF, font or when WP cannot generate sizes). Always pair `srcset` with a `sizes` attribute.",
        inputSchema: {
            type: "object",
            properties: {
                file_path: { type: "string", description: "Local path to the file to upload (e.g. 'workspace/resources/images/hero.jpg')." },
                base64: { type: "string", description: "Base64-encoded file data (alternative to file_path)." },
                filename: { type: "string", description: "Filename (required for base64, optional for file_path)." },
                media_type: {
                    type: "string",
                    enum: ["image", "svg", "pdf", "font"],
                    description: "Type of media being uploaded.",
                    default: "image"
                },
                alt_text: { type: "string", description: "Alt text for images/SVGs." },
                title: { type: "string", description: "Media title." },
            },
        },
    },
    {
        name: "get_image_srcset",
        description: "Get the WordPress-generated srcset string and basic metadata for an existing image attachment. Use this when you already have an attachment_id from search_media results and need responsive image markup without re-uploading.",
        inputSchema: {
            type: "object",
            properties: {
                attachment_id: { type: "number", description: "The WordPress attachment ID of the image." },
            },
            required: ["attachment_id"],
        },
    },
    {
        name: "get_roles",
        description: "List WordPress user roles (for condition building).",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "download_image",
        description: "Download an image from a URL and save it to a local file.",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string", description: "The URL of the image to download." },
                path: { type: "string", description: "The local file path (including filename) to save the image to." },
            },
            required: ["url", "path"],
        },
    },
    {
        name: "optimize_image",
        description: "Resize and/or convert an image to WebP in one call. PNG, JPG, BMP, TIFF, and HEIC files are always converted to WebP. Resizing only occurs when the image exceeds the specified width or height — it never upscales. Default quality is 80%.",
        inputSchema: {
            type: "object",
            properties: {
                file_path: { type: "string", description: "Path to the source image file." },
                output_path: { type: "string", description: "Output file path. Defaults to same directory as input with .webp extension." },
                width: { type: "number", description: "Max width in pixels. Resizes only if image width exceeds this value. Aspect ratio preserved." },
                height: { type: "number", description: "Max height in pixels. Resizes only if image height exceeds this value. Aspect ratio preserved." },
                quality: { type: "number", description: "WebP quality 1–100. Default is 80.", default: 80 },
            },
            required: ["file_path"],
        },
    },
    {
        name: "read_web_page",
        description: "Read content from a web page, supporting both static and JavaScript-rendered sites.",
        inputSchema: {
            type: "object",
            properties: {
                url: { type: "string", description: "The URL of the web page to read." },
                render_js: {
                    type: "boolean",
                    description: "Whether to render JavaScript using a headless browser. Default is true.",
                    default: true
                },
                wait_selector: {
                    type: "string",
                    description: "Optional CSS selector to wait for before extracting content."
                },
                css_selector: {
                    type: "string",
                    description: "Optional CSS selector to extract specific content from the page."
                },
            },
            required: ["url"],
        },
    },
    {
        name: "init_project",
        description: "Initialize the project structure in the current directory.",
        inputSchema: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Optional: The path where to initialize the project. Defaults to current directory.",
                    default: "."
                }
            }
        },
    },
    {
        name: "get_agent_guide",
        description: "Retrieve a detailed sub-guide for a specific topic and write it to agent-guide/{topic}.md in the project directory. Available guides: workflow, templates, conditions, scripts, preview, errors, media, permissions, navigation, tailwind-config, image-generation, php-location, image-optimize, global-library, tailwind-optimize, custom-css-framework, woocommerce, addons/blog-post.",
        inputSchema: {
            type: "object",
            properties: {
                guide: {
                    type: "string",
                    enum: ["workflow", "templates", "conditions", "scripts", "preview", "errors", "media", "permissions", "navigation", "tailwind-config", "image-generation", "php-location", "image-optimize", "global-library", "tailwind-optimize", "custom-css-framework", "woocommerce", "addons/blog-post"],
                    description: "The topic of the guide to retrieve."
                }
            },
            required: ["guide"]
        }
    },
    {
        name: "get_tailwind_config",
        description: "Get the Tailwind CSS configuration (@theme CSS block) from Settings > Layout. The prefix is always 'pkt-'. Returns the default kit config if none has been saved.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "update_tailwind_config",
        description: "Update the @theme CSS block of the Tailwind CSS config in Settings > Layout. Pass the complete @theme { ... } CSS block — it is not merged. The prefix 'pkt-' is fixed and cannot be changed. Changes take effect immediately on the next page load.",
        inputSchema: {
            type: "object",
            properties: {
                theme_css: {
                    type: "string",
                    description: "The new @theme { ... } CSS block as a string. Replaces the entire existing theme config.",
                },
            },
            required: ["theme_css"],
        },
    },
    {
        name: "tailwind_optimize",
        description: "Optimize Tailwind CSS for production using PostCSS and Tailwind v4. Scans all HTML/PHP files in the workspace and uses the provided Tailwind configuration to generate a minified CSS file at workspace/optimize/optimized-tailwind.css.",
        inputSchema: {
            type: "object",
            properties: {
                tailwind_config: {
                    type: "string",
                    description: "The Tailwind @theme { ... } CSS block.",
                },
            },
            required: ["tailwind_config"],
        },
    },
    {
        name: "generate_image",
        description: "Generate an image using Gemini AI (Imagen 3) based on a prompt stored in a file. Saves the image to workspace/generated-images/.",
        inputSchema: {
            type: "object",
            properties: {
                prompt_path: {
                    type: "string",
                    description: "Local path to the Markdown file containing the image prompt."
                },
                image_name: {
                    type: "string",
                    description: "Base name for the output image file (without extension)."
                },
                page_name: {
                    type: "string",
                    description: "Name of the page for which the image is generated."
                },
                aspect_ratio: {
                    type: "string",
                    enum: ["1:1", "9:16", "16:9", "3:2", "4:3"],
                    default: "1:1",
                    description: "Desired aspect ratio for the generated image."
                }
            },
            required: ["prompt_path", "image_name", "page_name"]
        }
    },
    // Global Library
    {
        name: "list_libraries",
        description: "List all Global Libraries managed by the plugin. Returns metadata and file information.",
        inputSchema: {
            type: "object",
            properties: {
                page: { type: "number", description: "Page number (1-based).", default: 1 },
                per_page: { type: "number", description: "Items per page (1-100).", default: 50 },
            },
        },
    },
    {
        name: "create_library",
        description: "Create a new Global Library.",
        inputSchema: {
            type: "object",
            properties: {
                title: { type: "string", description: "Title of the new library." },
                library_type: {
                    type: "string",
                    enum: ["js", "css", "font"],
                    description: "Library type."
                },
            },
            required: ["title", "library_type"],
        },
    },
    {
        name: "update_library",
        description: "Update Global Library metadata (title, type, mode).",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The library ID." },
                title: { type: "string", description: "New title." },
                library_type: { type: "string", enum: ["js", "css", "font"], description: "New library type." },
                mode: { type: "string", enum: ["local", "cdn"], description: "Loading mode." },
            },
            required: ["id"],
        },
    },
    {
        name: "delete_library",
        description: "Delete a Global Library and all its files from disk.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The library ID." },
            },
            required: ["id"],
        },
    },
    {
        name: "search_libraries",
        description: "Search Global Libraries by title.",
        inputSchema: {
            type: "object",
            properties: {
                q: { type: "string", description: "Keyword to match against the library title." },
            },
            required: ["q"],
        },
    },
    {
        name: "get_library",
        description: "Retrieve full metadata and file list for a specific Global Library.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The library ID." },
            },
            required: ["id"],
        },
    },
    {
        name: "cdn_download_library",
        description: "Download asset files from CDN URLs to local library storage.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The library ID." },
                urls: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of CDN URLs to download."
                },
            },
            required: ["id", "urls"],
        },
    },
    {
        name: "save_library_files",
        description: "Update settings for files within a library (priority, location).",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The library ID." },
                files: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            filename: { type: "string" },
                            priority: { type: "number" },
                            location_js: { type: "string", enum: ["foot", "head", "open_body"] },
                        },
                        required: ["filename"],
                    },
                },
            },
            required: ["id", "files"],
        },
    },
    {
        name: "restore_library_backup",
        description: "Restore library files from a previous backup.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The library ID." },
                backup_key: { type: "string", description: "The timestamp key of the backup to restore." },
            },
            required: ["id", "backup_key"],
        },
    },
    {
        name: "update_library_conditions",
        description: "Update display conditions for a Global Library.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The library ID." },
                conditions: { type: "object", description: "Conditions JSON object." },
            },
            required: ["id", "conditions"],
        },
    },
    {
        name: "toggle_library",
        description: "Enable or disable a Global Library.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The library ID." },
                enabled: { type: "boolean", description: "New state." },
            },
            required: ["id"],
        },
    },
    {
        name: "toggle_library_lock",
        description: "Lock or unlock a Global Library. Locked libraries cannot be modified or deleted.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "number", description: "The library ID." },
                locked: { type: "boolean", description: "New locked state (true to lock, false to unlock). If omitted, toggles the current state." },
            },
            required: ["id"],
        },
    },
];
//# sourceMappingURL=tools.js.map