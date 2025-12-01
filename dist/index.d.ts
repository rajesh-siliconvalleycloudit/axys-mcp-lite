#!/usr/bin/env node
import 'dotenv/config';
import { z } from 'zod';
export declare const configSchema: z.ZodObject<{
    AXYS_API_HOST: z.ZodDefault<z.ZodString>;
    MCP_KEY: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    AXYS_API_HOST: string;
    MCP_KEY: string;
}, {
    AXYS_API_HOST?: string | undefined;
    MCP_KEY?: string | undefined;
}>;
//# sourceMappingURL=index.d.ts.map