import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from 'zod';
export declare const configSchema: z.ZodObject<{
    AXYS_API_HOST: z.ZodString;
    MCP_KEY: z.ZodString;
}, "strip", z.ZodTypeAny, {
    AXYS_API_HOST: string;
    MCP_KEY: string;
}, {
    AXYS_API_HOST: string;
    MCP_KEY: string;
}>;
export type Config = z.infer<typeof configSchema>;
export default function createServer(config: Config): Server<{
    method: string;
    params?: {
        [x: string]: unknown;
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
        } | undefined;
    } | undefined;
}, {
    method: string;
    params?: {
        [x: string]: unknown;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    } | undefined;
}, {
    [x: string]: unknown;
    _meta?: {
        [x: string]: unknown;
    } | undefined;
}>;
//# sourceMappingURL=smithery-index.d.ts.map