import path from "node:path"
import { execFileSync } from "node:child_process"
import type { Plugin } from "@opencode-ai/plugin"

const TOOL_NAME_CASING: Record<string, string> = {
  bash: "Bash",
  write: "Write",
  edit: "Edit",
  multiedit: "MultiEdit",
  notebookedit: "NotebookEdit",
}

const hooksDir = path.join(__dirname, "..", "plugins", "agent-orch", "hooks")

function runHook(script: string, payload: unknown): { blocked: boolean; message: string } {
  try {
    const stdin = JSON.stringify(payload)
    execFileSync("bash", [path.join(hooksDir, script)], {
      input: stdin,
      timeout: 10000,
      encoding: "utf8",
    })
    return { blocked: false, message: "" }
  } catch (err: any) {
    const message = (err.stdout || err.stderr || err.message || "").trim()
    return { blocked: true, message }
  }
}

export function createHookHandler(sessionCwd: string) {
  return async (input: any, output: any) => {
    const tool: string = output?.tool ?? input?.tool ?? ""
    const args = output?.args ?? input?.tool_input ?? {}
    const claudeTool = TOOL_NAME_CASING[tool] ?? tool

    if (tool === "bash") {
      const command: string = args.command ?? ""
      if (/\bgit\s+commit\b/.test(command)) {
        const result = runHook("validate-ai-commit.sh", {
          tool_name: claudeTool,
          tool_input: args,
          cwd: sessionCwd,
          harness: "opencode",
        })
        if (result.blocked) {
          throw new Error(`Blocked by validate-ai-commit: ${result.message}`)
        }
      }
    }

    if (tool === "edit" || tool === "write" || tool === "bash") {
      const result = runHook("guard-worktree-writes.sh", {
        tool_name: claudeTool,
        tool_input: args,
        cwd: sessionCwd,
      })
      if (result.blocked) {
        throw new Error(`Blocked by guard-worktree-writes: ${result.message}`)
      }
    }
  }
}
