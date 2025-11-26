export interface AxysApiConfig {
    host: string;
    apiKey: string;
}
export interface GptApiConfig {
    host: string;
    mcpKey: string;
}
export interface GptSearchRequest {
    query: string;
    searchType: 'structured' | 'unstructured';
    searchIndices?: string;
    fileOnly?: boolean;
}
export interface GptSearchResponse {
    status: number;
    message: string;
    obj?: any;
}
export interface AxysApiResponse<T = any> {
    status: number;
    message: string;
    obj?: T;
}
export interface SearchAllRequest {
    size: number;
    searchStr: string;
}
export interface FilterOperator {
    fieldName: string;
    operator: 'EQUALS' | 'NOTEQUALS' | 'LIKE' | 'GREATERTHAN' | 'LESSTHAN' | 'BEFORE' | 'AFTER' | 'BETWEEN' | 'GREATERTHANEQUALTO' | 'LESSTHANEQUALTO' | 'EXISTS' | 'NOTEXISTS';
    values?: string[];
    fieldNameToCompare?: string;
}
export interface Aggregation {
    fieldName: string;
    operator: 'SUM' | 'DISTINCT' | 'DATEHISTOGRAM' | 'LATEST';
    name: string;
    aggregation?: Aggregation;
    sortField?: string;
    sortOrder?: string;
}
export interface SearchGroupIndexRequest {
    groupIndexName: string;
    from: number;
    size: number;
    searchStr?: string;
    filters?: FilterOperator[];
    aggregations?: Aggregation[];
    relationFilters?: Record<string, FilterOperator[]>;
    relationTypesFilter?: Record<string, 'EXISTS' | 'NOTEXISTS'>;
}
export interface FieldValue {
    value: any;
    allowedOperators?: string[];
}
export interface SearchResult {
    [key: string]: FieldValue | SearchResult[] | any;
}
export interface SearchAllResponse {
    [groupIndex: string]: SearchResult[];
}
export interface SearchGroupIndexResponse {
    totalData?: number;
    data?: SearchResult[];
    aggregations?: any;
    relations?: any;
}
export interface FieldSchema {
    operators: string[];
    type: string;
    tags: string[];
}
export interface SchemaResponse {
    [fieldName: string]: FieldSchema;
}
export interface Relation {
    srcIndex: string;
    destIndex: string;
    srcAttr: string;
    destAttr: string;
    relationName: string;
}
export interface AISearchResponse {
    status: number;
    message: string;
    obj: string;
}
export interface LoadReferencesResponse {
    apps: Array<{
        id: number;
        appName: string;
        displayName: string;
        description: string;
        sortOrder: number;
        executionInterval: number;
        connectors: string[];
    }>;
    queries: string[];
}
export interface AdminApiConfig {
    host: string;
    adminKey: string;
}
export interface GroupListItem {
    id: string;
    name: string;
    description?: string;
    apiKey?: string;
    [key: string]: any;
}
export interface GroupListResponse {
    [key: string]: GroupListItem[];
}
export interface GroupDetailsResponse {
    [key: string]: any;
}
//# sourceMappingURL=types.d.ts.map