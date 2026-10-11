import { z } from 'zod';
import { ToolScope } from '../../shared';

/**
 * Confluence tool schemas with scope tagging.
 * Scope: 'read' for queries, 'write' for mutations.
 */
export const confluenceSchemas = {
  // ============================================================================
  // Content
  // ============================================================================
  confluence_getContent: {
    scope: 'read' as const,
    description: 'Get a Confluence page by its ID. Returns title, body content, version info, and metadata. Use confluence_searchContent to find pages by title or content first.',
    schema: z.object({
      contentId: z.string().describe('The Confluence content/page ID'),
      expand: z.string().optional().describe('Properties to expand (e.g., "body.storage,version")'),
    }),
  },
  confluence_searchContent: {
    scope: 'read' as const,
    description: 'Search for Confluence pages, blog posts, and attachments using CQL queries. Find content by title, text, space, labels, or author. Returns matching pages with IDs and excerpts.',
    schema: z.object({
      cql: z.string().describe('CQL search string (e.g., "space=DEV and type=page")'),
      limit: z.number().optional().describe('Maximum results (default: 25)'),
      start: z.number().optional().describe('Starting index'),
      expand: z.string().optional().describe('Properties to expand'),
    }),
  },
  confluence_createContent: {
    scope: 'write' as const,
    description: 'Create a new Confluence page or blog post. Specify space key, title, and body content. Use confluence_getSpaces to find available spaces first.',
    schema: z.object({
      spaceKey: z.string().describe('Space key'),
      title: z.string().describe('Page title'),
      body: z.string().describe('Page content (HTML or storage format)'),
      parentId: z.string().optional().describe('Parent page ID'),
      type: z.enum(['page', 'blogpost']).optional().describe('Content type (default: page)'),
    }),
  },
  confluence_updateContent: {
    scope: 'write' as const,
    description: 'Update an existing Confluence page. Modify title, body, or parent. Requires current version number - use confluence_getContent to get it first.',
    schema: z.object({
      contentId: z.string().describe('Content ID to update'),
      title: z.string().optional().describe('New title'),
      body: z.string().optional().describe('New body content'),
      version: z.number().describe('Current version number (required for update)'),
      versionComment: z.string().optional().describe('Comment for this version'),
    }),
  },

  // ============================================================================
  // Spaces
  // ============================================================================
  confluence_getSpaces: {
    scope: 'read' as const,
    description: 'List all accessible Confluence spaces. Returns space keys, names, and types. Use this to discover spaces before creating or searching content.',
    schema: z.object({
      limit: z.number().optional().describe('Maximum results'),
      start: z.number().optional().describe('Starting index'),
    }),
  },
  confluence_searchSpace: {
    scope: 'read' as const,
    description: 'Search for Confluence spaces by name or key. Find team spaces, project spaces, or personal spaces. Returns space keys needed for creating content.',
    schema: z.object({
      query: z.string().describe('Search query for space name or key'),
    }),
  },

  // ============================================================================
  // Pages
  // ============================================================================
  confluence_getPageChildren: {
    scope: 'read' as const,
    description: 'Get child pages under a parent Confluence page. Navigate page hierarchies and documentation trees. Returns child page IDs and titles.',
    schema: z.object({
      pageId: z.string().describe('Parent page ID'),
      expand: z.string().optional().describe('Properties to expand (e.g., "version", "body.storage")'),
      limit: z.number().optional(),
      start: z.number().optional(),
    }),
  },

  // ============================================================================
  // Comments
  // ============================================================================
  confluence_getComments: {
    scope: 'read' as const,
    description: 'Get comments and discussions on a Confluence page. Returns inline comments, footer comments, and resolved comments. Includes author and timestamp.',
    schema: z.object({
      contentId: z.string().describe('Content ID'),
      expand: z.string().optional().describe('Fields to expand (default: "body.view")'),
      depth: z.string().optional().describe('Comment depth (default: "all")'),
      location: z.string().optional().describe('Filter by location (inline, footer, resolved)'),
      limit: z.number().optional(),
      start: z.number().optional(),
    }),
  },

  // ============================================================================
  // Labels
  // ============================================================================
  confluence_getLabels: {
    scope: 'read' as const,
    description: 'Get labels (tags) attached to a Confluence page. Labels help categorize and find related content.',
    schema: z.object({
      contentId: z.string().describe('Content ID'),
    }),
  },
  confluence_addLabel: {
    scope: 'write' as const,
    description: 'Add a label (tag) to a Confluence page for categorization. Labels help organize and discover related content.',
    schema: z.object({
      contentId: z.string().describe('Content ID'),
      label: z.string().describe('Label to add'),
    }),
  },

  // ============================================================================
  // Users
  // ============================================================================
  confluence_searchUser: {
    scope: 'read' as const,
    description: 'Search for Confluence users by name, email, or username. Find team members for mentions, permissions, or page restrictions.',
    schema: z.object({
      query: z.string().describe('Search query (username or display name)'),
      limit: z.number().optional().describe('Maximum number of results (default: 10)'),
      start: z.number().optional().describe('Pagination offset (default: 0)'),
    }),
  },
} as const;

/**
 * Type for Confluence tool names.
 */
export type ConfluenceToolName = keyof typeof confluenceSchemas;

/**
 * Get the Zod schema for a specific tool.
 */
export function getConfluenceSchema(toolName: ConfluenceToolName) {
  return confluenceSchemas[toolName].schema;
}
