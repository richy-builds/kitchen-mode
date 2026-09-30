// Pushing main deploys to production in about 30 seconds, and every installed bookmark loads km.js from there on its
// next click: a push to main is a release to everyone at once. So anything that would update main asks first.
// Pushes to other branches, which only make Vercel preview deployments, go ahead as normal.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd;
const MAIN = /^\+?(?:refs\/heads\/)?(?:main|master)$/;

const branch = () => {
  try { return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); } catch { return ''; }
};

// Each `git push` in the command, including in a chain like `git commit ... && git push`.
const pushesMain = command => command.split(/&&|\|\||[;|\n]/).some(part => {
  const words = part.trim().split(/\s+/);
  const at = words.findIndex((w, i) => w === 'push' && words.slice(0, i).includes('git'));
  if (at < 0) return false;
  const args = words.slice(at + 1).filter(w => !w.startsWith('-'));
  if (words.slice(at + 1).some(w => w === '--all' || w === '--mirror')) return true;
  // `git push` or `git push origin` pushes the current branch.
  if (args.length < 2) return MAIN.test(branch());
  return args.slice(1).some(ref => MAIN.test(ref.split(':').pop()) || (ref === 'HEAD' && MAIN.test(branch())));
});

const tool = input.tool_name || '';
const toolInput = input.tool_input || {};
const risky =
  (tool === 'Bash' && pushesMain(toolInput.command || '')) ||
  (/^mcp__github__(?:push_files|create_or_update_file|delete_file)$/.test(tool) && MAIN.test(toolInput.branch || '')) ||
  /^mcp__github__(?:merge_pull_request|enable_pr_auto_merge)$/.test(tool);

if (risky) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: 'This updates main, which deploys to every Kitchen Mode user within about 30 seconds. Has npm test passed?',
    },
  }));
}
