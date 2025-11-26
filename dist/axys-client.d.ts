import { AxysApiConfig, AxysApiResponse, SearchAllRequest, SearchGroupIndexRequest, SearchAllResponse, SearchGroupIndexResponse, SchemaResponse, Relation, AISearchResponse, LoadReferencesResponse, GptApiConfig, GptSearchRequest, GptSearchResponse, AdminApiConfig, GroupListResponse, GroupDetailsResponse } from './types.js';
export declare class AxysApiClient {
    private client;
    private apiKey;
    constructor(config: AxysApiConfig);
    private handleError;
    /**
     * Search for a given text in the whole data collection
     */
    searchAll(request: SearchAllRequest): Promise<AxysApiResponse<SearchAllResponse>>;
    /**
     * Search for a given text in a particular group index
     */
    searchGroupIndex(request: SearchGroupIndexRequest, queryParams?: {
        include_only?: string;
        show_source?: boolean;
        relation_types?: string;
    }): Promise<AxysApiResponse<SearchGroupIndexResponse>>;
    /**
     * Get all details of a particular entity
     */
    getEntityDetails(detailApiUrl: string): Promise<AxysApiResponse>;
    /**
     * Search using AI tool
     */
    aiSearch(query: string): Promise<AISearchResponse>;
    /**
     * Load references for AI interface
     */
    loadAIReferences(): Promise<AxysApiResponse<LoadReferencesResponse>>;
    /**
     * Get schema for a group index
     */
    getSchema(groupIndex: string): Promise<AxysApiResponse<SchemaResponse>>;
    /**
     * Get relations for a group index
     */
    getRelations(groupIndex: string): Promise<AxysApiResponse<Relation[]>>;
    /**
     * Validate connection to AXYS API
     */
    validateConnection(): Promise<boolean>;
}
export declare class GptMcpClient {
    private client;
    private mcpKey;
    constructor(config: GptApiConfig);
    private handleError;
    /**
     * Search using GPT MCP AI with structured or unstructured search
     */
    aiSearch(request: GptSearchRequest): Promise<GptSearchResponse>;
    /**
     * Validate connection to GPT MCP API
     */
    validateConnection(): Promise<boolean>;
}
export declare class AdminApiClient {
    private client;
    private adminKey;
    constructor(config: AdminApiConfig);
    private handleError;
    /**
     * Get list of all groups
     */
    getGroupList(): Promise<AxysApiResponse<GroupListResponse>>;
    /**
     * Get details of a specific group by ID
     */
    getGroupDetails(groupId: string): Promise<AxysApiResponse<GroupDetailsResponse>>;
    /**
     * Validate connection to Admin API
     */
    validateConnection(): Promise<boolean>;
}
//# sourceMappingURL=axys-client.d.ts.map