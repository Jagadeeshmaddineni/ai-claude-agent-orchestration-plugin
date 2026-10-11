import { z } from 'zod';

/**
 * TestRail tool schemas with scope tagging.
 * Scope: 'read' for queries, 'write' for mutations.
 */
export const testrailSchemas = {
  // ============================================================================
  // Navigation
  // ============================================================================
  testrail_getProjects: {
    scope: 'read' as const,
    description: 'List all TestRail projects',
    schema: z.object({
      isCompleted: z.boolean().optional().describe('Filter by completed status'),
    }),
  },
  testrail_getSuites: {
    scope: 'read' as const,
    description: 'Get test suites for a project',
    schema: z.object({
      projectId: z.number().describe('The project ID'),
    }),
  },
  testrail_getSections: {
    scope: 'read' as const,
    description: 'Get test case sections (folders) in a project',
    schema: z.object({
      projectId: z.number().describe('The project ID'),
      suiteId: z.number().optional().describe('The suite ID (required for multi-suite projects)'),
    }),
  },

  // ============================================================================
  // Test Cases - Read
  // ============================================================================
  testrail_getCase: {
    scope: 'read' as const,
    description: 'Get a single test case by ID',
    schema: z.object({
      caseId: z.number().describe('The test case ID'),
    }),
  },
  testrail_getCases: {
    scope: 'read' as const,
    description: 'Search/list test cases with filters',
    schema: z.object({
      projectId: z.number().describe('The project ID'),
      suiteId: z.number().optional().describe('The suite ID (required for multi-suite projects)'),
      sectionId: z.number().optional().describe('Filter by section ID'),
      typeId: z.number().optional().describe('Filter by case type ID'),
      priorityId: z.number().optional().describe('Filter by priority ID'),
      limit: z.number().optional().describe('Maximum results (default: 250)'),
      offset: z.number().optional().describe('Offset for pagination'),
    }),
  },

  // ============================================================================
  // Test Cases - Write
  // ============================================================================
  testrail_addCase: {
    scope: 'write' as const,
    description: 'Create a new test case',
    schema: z.object({
      sectionId: z.number().describe('Section ID to add the case to'),
      title: z.string().describe('Test case title'),
      typeId: z.number().optional().describe('Case type ID'),
      priorityId: z.number().optional().describe('Priority ID (1-4, 1 is highest)'),
      estimate: z.string().optional().describe('Time estimate (e.g., "30s", "1m 45s", "2h")'),
      refs: z.string().optional().describe('Comma-separated references'),
      customPreconds: z.string().optional().describe('Preconditions'),
      customSteps: z.string().optional().describe('Test steps'),
      customExpected: z.string().optional().describe('Expected result'),
      customDisabled: z.number().optional().describe('Disabled status dropdown value'),
      customFields: z.record(z.unknown()).optional().describe('Additional custom fields'),
    }),
  },
  testrail_updateCase: {
    scope: 'write' as const,
    description: 'Update an existing test case',
    schema: z.object({
      caseId: z.number().describe('Case ID to update'),
      title: z.string().optional().describe('New title'),
      typeId: z.number().optional().describe('Case type ID'),
      priorityId: z.number().optional().describe('Priority ID'),
      estimate: z.string().optional().describe('Time estimate'),
      refs: z.string().optional().describe('References'),
      customPreconds: z.string().optional().describe('Preconditions'),
      customSteps: z.string().optional().describe('Test steps'),
      customExpected: z.string().optional().describe('Expected result'),
      customDisabled: z.number().optional().describe('Disabled status dropdown value'),
      customFields: z.record(z.unknown()).optional().describe('Additional custom fields'),
    }),
  },

  // ============================================================================
  // Metadata
  // ============================================================================
  testrail_getCaseTypes: {
    scope: 'read' as const,
    description: 'Get available test case types',
    schema: z.object({}),
  },
  testrail_getCaseFields: {
    scope: 'read' as const,
    description: 'Get all case fields including custom fields',
    schema: z.object({}),
  },
} as const;

/**
 * Type for TestRail tool names.
 */
export type TestRailToolName = keyof typeof testrailSchemas;

/**
 * Get the Zod schema for a specific tool.
 */
export function getTestRailSchema(toolName: TestRailToolName) {
  return testrailSchemas[toolName].schema;
}
