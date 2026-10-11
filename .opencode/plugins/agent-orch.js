import path from 'path';
import fs from 'fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import { createHookHandler } from '../agent-orch-hooks.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLUGIN_NAMES = [
  'agent-orch',
  'codebase-graph-analyzer',
  'mainframe-analyzer',
  'meta-orch',
  'team-work',
  'vault-orch',
];

const DEFAULT_MODELS = {
  'orchestrate-advocate': 'thinking',
  'orchestrate-architect': 'thinking',
  'orchestrate-debugger': 'thinking',
  'orchestrate-incident-responder': 'thinking',
  'orchestrate-legacy-modernizer': 'thinking',
  'orchestrate-quality-reviewer': 'thinking',
  'orchestrate-spec-reviewer': 'thinking',
  'orchestrate-api': 'instruct',
  'orchestrate-builder': 'instruct',
  'orchestrate-c4-scribe': 'instruct',
  'orchestrate-content-specialist': 'instruct',
  'orchestrate-data-engineer': 'instruct',
  'orchestrate-database': 'instruct',
  'orchestrate-devops': 'instruct',
  'orchestrate-jira-triage': 'instruct',
  'orchestrate-migration': 'instruct',
  'orchestrate-ml-engineer': 'instruct',
  'orchestrate-observability': 'instruct',
  'orchestrate-performance': 'instruct',
  'orchestrate-private-cloud': 'instruct',
  'orchestrate-refactorer': 'instruct',
  'orchestrate-scribe': 'instruct',
  'orchestrate-security': 'instruct',
  'orchestrate-telemetry': 'instruct',
  'orchestrate-uiux': 'instruct',
  'orchestrate-validator': 'instruct',
};

let _preambleCache = undefined;

function gitUserName(directory) {
  try {
    return execFileSync('git', ['-C', directory, 'config', 'user.name'], { encoding: 'utf8' }).trim();
  } catch {
    console.warn('[agent-orch] WARNING: git config user.name is not set. The commit trailer will be rejected by the validate-ai-commit hook until you run: git config user.name "<your-github-username>"');
    return null;
  }
}

function resolveModels(configPath, globalConfigPath) {
  for (const p of [configPath, globalConfigPath]) {
    if (fs.existsSync(p)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
        const resolved = {};
        for (const [agent, alias] of Object.entries(cfg.agents || {})) {
          resolved[agent] = (cfg.aliases && cfg.aliases[alias]) || alias;
        }
        return resolved;
      } catch (e) {
        console.warn('[agent-orch] Failed to parse', p, ':', e.message, '— falling through to next tier');
      }
    }
  }
  console.warn('[agent-orch] No .agent-orch-models.json found (project or global) — using sentinel defaults');
  return DEFAULT_MODELS;
}

function resolveCommitAttribution(configPath, globalConfigPath, directory) {
  const ghUserRaw = gitUserName(directory);
  const ghUser = ghUserRaw === null ? '<git user.name not set>' : ghUserRaw;
  let harness = 'opencode';
  let models;
  let configTier = 'none';
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      configTier = 'project';
      harness = (cfg.commit_attribution && cfg.commit_attribution.harness) || harness;
      models = resolveModels(configPath, globalConfigPath);
    } catch (e) {
      console.warn('[agent-orch] Failed to parse project config:', e.message, '— trying global');
    }
  }
  if (configTier === 'none' && fs.existsSync(globalConfigPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
      configTier = 'global';
      harness = (cfg.commit_attribution && cfg.commit_attribution.harness) || harness;
      models = resolveModels(configPath, globalConfigPath);
    } catch (e) {
      console.warn('[agent-orch] Failed to parse global config:', e.message, '— using defaults');
    }
  }
  if (configTier === 'none') {
    console.warn('[agent-orch] No .agent-orch-models.json found — using opencode defaults. Run /agent-orch:config --global to configure.');
    models = DEFAULT_MODELS;
  }
  const distinctModels = [...new Set(Object.values(models))];
  const modelsStr = distinctModels.join(',');
  const email = `${ghUser}@users.noreply.github.com`;
  const trailer = `Co-authored-by: ${ghUser} + ${harness}/${modelsStr} <${email}>`;
  return { trailer, configTier, models };
}

function buildPreamble(directory, models, commitTrailer, configTier) {
  const cacheKey = directory;
  if (_preambleCache && _preambleCache[cacheKey]) return _preambleCache[cacheKey];

  const modelTable = Object.entries(models)
    .map(([agent, model]) => `- ${agent}: ${model}`)
    .join('\n');

  const firstRunBlock = configTier === 'none'
    ? `
**⚠️ No model configuration found.**
Before running any agents, ask the user:
1. What model should \`thinking\` (deep reasoning) use?
2. What model should \`instruct\` (fast execution) use?
Then run \`/agent-orch:config --global\` to save their answers as the default for all repos.
If the user wants project-specific models instead, run \`/agent-orch:config\` (no flag).
Agents will not work correctly until you configure models.
`
    : '';

  const preamble = `<EXTREMELY_IMPORTANT>
You are running in OpenCode with the agent-orch orchestration plugin.
${firstRunBlock}
**Tool Mapping for OpenCode:**
When skills or agents reference Claude Code tool names, substitute OpenCode equivalents:
- \`Bash\` → \`bash\`
- \`Write\` → \`write\`
- \`Edit\` → \`edit\`
- \`MultiEdit\` → \`edit\` (multi-edit)
- \`NotebookEdit\` → \`edit\` (notebook)
- "Create a todo" / "mark complete in todo list" → \`todowrite\`
- \`Subagent (general-purpose):\` → \`task\` with \`subagent_type: "general"\`
- Invoke a skill → OpenCode's native \`skill\` tool
- Read files → \`read\`
- Create, edit, or delete files → \`edit\` / \`write\`
- Run shell commands → \`bash\`
- Search file contents → \`grep\`, \`glob\`
- Fetch a URL → \`webfetch\`

**Skill namespace mapping:**
Claude Code slash commands like \`/agent-orch:brainstorm\` map to OpenCode skills loaded from \`plugins/<name>/skills/\`. Use OpenCode's native \`skill\` tool to list and load them.

**Agent model table (resolved from .agent-orch-models.json):**
${modelTable}

**Commit attribution for this session:**
${commitTrailer}
(configured in .agent-orch-models.json → commit_attribution; gh_user from \`git config user.name\`)
Every AI-generated commit MUST end with this trailer. The \`validate-ai-commit.sh\` hook enforces it.

**Entry points:**
Pick the entry point that fits the task:
- /agent-orch:brainstorm (design before code) → /agent-orch:build (standalone) or /agent-orch:implement (spec-kit)
- /agent-orch:bugfix (root-cause fix)
- /agent-orch:make (full feature lifecycle: worktree/branch + PR)
- /agent-orch:config (configure models + commit trailer)
If a skill might apply, invoke it to check.
</EXTREMELY_IMPORTANT>`;

  if (!_preambleCache) _preambleCache = {};
  _preambleCache[cacheKey] = preamble;
  return preamble;
}

export const AgentOrchPlugin = async ({ client, directory, worktree }) => {
  const pluginsRoot = path.resolve(__dirname, '../../plugins');
  const modelConfigPath = path.resolve(directory, '.agent-orch-models.json');
  const globalConfigPath = path.resolve(process.env.HOME || '', '.config', 'agent-orch-models.json');
  const sessionCwd = worktree || directory;

  const { trailer: commitTrailer, configTier, models } = resolveCommitAttribution(modelConfigPath, globalConfigPath, directory);
  const hookHandler = createHookHandler(sessionCwd);

  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      for (const name of PLUGIN_NAMES) {
        const skillsDir = path.join(pluginsRoot, name, 'skills');
        if (fs.existsSync(skillsDir)) {
          if (!config.skills.paths.includes(skillsDir)) {
            config.skills.paths.push(skillsDir);
          }
        }
      }
    },

    'experimental.chat.messages.transform': async (_input, output) => {
      const preamble = buildPreamble(directory, models, commitTrailer, configTier);
      if (!output.messages || !output.messages.length) return;
      const firstUser = output.messages.find(m => m.info && m.info.role === 'user');
      if (!firstUser || !firstUser.parts || !firstUser.parts.length) return;
      if (firstUser.parts.some(p => p.type === 'text' && p.text && p.text.includes('EXTREMELY_IMPORTANT'))) return;
      const ref = firstUser.parts[0];
      firstUser.parts.unshift({ ...ref, type: 'text', text: preamble });
    },

    'tool.execute.before': hookHandler,
  };
};
