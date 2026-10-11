// Service
export { ConfluenceService } from './service';

// Client
export { ConfluenceClient } from './client';
export type { ConfluenceConfig } from './client';

// Schemas
export { confluenceSchemas, getConfluenceSchema } from './schemas';
export type { ConfluenceToolName } from './schemas';

// Tools
export { confluenceTools, generateConfluenceTools, getConfluenceToolsByScope } from './tools';
