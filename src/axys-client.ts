import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  AxysApiConfig,
  AxysApiResponse,
  SearchAllRequest,
  SearchGroupIndexRequest,
  SearchAllResponse,
  SearchGroupIndexResponse,
  SchemaResponse,
  Relation,
  AISearchResponse,
  LoadReferencesResponse,
  GptApiConfig,
  GptSearchRequest,
  GptSearchResponse,
  AdminApiConfig,
  GroupListResponse,
  GroupDetailsResponse
} from './types.js';

export class AxysApiClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: AxysApiConfig) {
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: config.host,
      headers: {
        'apiKey': config.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 180000 // 3 minutes to handle long-running API calls
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      this.handleError.bind(this)
    );
  }

  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data as AxysApiResponse;
      const errorMessage = `AXYS API Error: ${data.message || 'Unknown error'} (Status: ${data.status || error.response.status})`;
      throw new Error(errorMessage);
    } else if (error.request) {
      // Request made but no response received
      throw new Error('No response received from AXYS API');
    } else {
      // Error in request setup
      throw new Error(`Request setup error: ${error.message}`);
    }
  }

  /**
   * Search for a given text in the whole data collection
   */
  async searchAll(request: SearchAllRequest): Promise<AxysApiResponse<SearchAllResponse>> {
    const response = await this.client.post<AxysApiResponse<SearchAllResponse>>(
      '/axysapi/seeall/data',
      request
    );
    return response.data;
  }

  /**
   * Search for a given text in a particular group index
   */
  async searchGroupIndex(
    request: SearchGroupIndexRequest,
    queryParams?: {
      include_only?: string;
      show_source?: boolean;
      relation_types?: string;
    }
  ): Promise<AxysApiResponse<SearchGroupIndexResponse>> {
    const response = await this.client.post<AxysApiResponse<SearchGroupIndexResponse>>(
      '/axysapi/seeall/dataforgroupindex',
      request,
      { params: queryParams }
    );
    return response.data;
  }

  /**
   * Get all details of a particular entity
   */
  async getEntityDetails(detailApiUrl: string): Promise<AxysApiResponse> {
    const response = await this.client.get<AxysApiResponse>(
      `/axysapi${detailApiUrl}`
    );
    return response.data;
  }

  /**
   * Search using AI tool
   */
  async aiSearch(query: string): Promise<AISearchResponse> {
    const response = await this.client.get<AISearchResponse>(
      '/axysapi/gpt/ai-search',
      { params: { query } }
    );
    return response.data;
  }

  /**
   * Load references for AI interface
   */
  async loadAIReferences(): Promise<AxysApiResponse<LoadReferencesResponse>> {
    const response = await this.client.get<AxysApiResponse<LoadReferencesResponse>>(
      '/axysapi/gpt/ai-loadreferences'
    );
    return response.data;
  }

  /**
   * Get schema for a group index
   */
  async getSchema(groupIndex: string): Promise<AxysApiResponse<SchemaResponse>> {
    const response = await this.client.get<AxysApiResponse<SchemaResponse>>(
      '/axysapi/seeall/schema',
      { params: { groupIndex } }
    );
    return response.data;
  }

  /**
   * Get relations for a group index
   */
  async getRelations(groupIndex: string): Promise<AxysApiResponse<Relation[]>> {
    const response = await this.client.get<AxysApiResponse<Relation[]>>(
      '/axysapi/seeall/relations',
      { params: { groupIndex } }
    );
    return response.data;
  }

  /**
   * Validate connection to AXYS API
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Try to load AI references as a simple connectivity test
      await this.loadAIReferences();
      return true;
    } catch (error) {
      console.error('Connection validation failed:', error);
      return false;
    }
  }
}

export class GptMcpClient {
  private client: AxiosInstance;
  private mcpKey: string;

  constructor(config: GptApiConfig) {
    this.mcpKey = config.mcpKey;
    this.client = axios.create({
      baseURL: config.host,
      headers: {
        'x-mcp-key': config.mcpKey,
        'Content-Type': 'application/json'
      },
      timeout: 180000 // 3 minutes to handle long-running API calls
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      this.handleError.bind(this)
    );
  }

  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data as GptSearchResponse;
      const errorMessage = `GPT MCP API Error: ${data.message || 'Unknown error'} (Status: ${data.status || error.response.status})`;
      throw new Error(errorMessage);
    } else if (error.request) {
      // Request made but no response received
      throw new Error('No response received from GPT MCP API');
    } else {
      // Error in request setup
      throw new Error(`Request setup error: ${error.message}`);
    }
  }

  /**
   * Search using GPT MCP AI with structured or unstructured search
   */
  async aiSearch(request: GptSearchRequest): Promise<GptSearchResponse> {
    const response = await this.client.post<GptSearchResponse>(
      '/axys-admin-app/gpt/ai-search/mcp',
      request
    );
    return response.data;
  }

  /**
   * Validate connection to GPT MCP API
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Try a simple search as a connectivity test
      await this.aiSearch({
        query: 'test',
        searchType: 'structured'
      });
      return true;
    } catch (error) {
      console.error('GPT MCP connection validation failed:', error);
      return false;
    }
  }
}

export class AdminApiClient {
  private client: AxiosInstance;
  private adminKey: string;

  constructor(config: AdminApiConfig) {
    this.adminKey = config.adminKey;
    this.client = axios.create({
      baseURL: config.host,
      headers: {
        'key': config.adminKey,
        'Content-Type': 'application/json'
      },
      timeout: 180000 // 3 minutes to handle long-running API calls
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      this.handleError.bind(this)
    );
  }

  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data as AxysApiResponse;
      const errorMessage = `Admin API Error: ${data.message || 'Unknown error'} (Status: ${data.status || error.response.status})`;
      throw new Error(errorMessage);
    } else if (error.request) {
      // Request made but no response received
      throw new Error('No response received from Admin API');
    } else {
      // Error in request setup
      throw new Error(`Request setup error: ${error.message}`);
    }
  }

  /**
   * Get list of all groups
   */
  async getGroupList(): Promise<AxysApiResponse<GroupListResponse>> {
    const response = await this.client.get<AxysApiResponse<GroupListResponse>>(
      '/axys-admin-app/info/group/list'
    );
    return response.data;
  }

  /**
   * Get details of a specific group by ID
   */
  async getGroupDetails(groupId: string): Promise<AxysApiResponse<GroupDetailsResponse>> {
    const response = await this.client.get<AxysApiResponse<GroupDetailsResponse>>(
      `/axys-admin-app/info/group/view/${groupId}`
    );
    return response.data;
  }

  /**
   * Validate connection to Admin API
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Try to get group list as a connectivity test
      await this.getGroupList();
      return true;
    } catch (error) {
      console.error('Admin API connection validation failed:', error);
      return false;
    }
  }
}