// km.js and index.html are built from kitchen-mode.js and build.mjs, and Vercel serves them as committed.
//   PreToolUse:  refuse hand edits to them, and say what to edit instead.
//   PostToolUse: rebuild them after an edit to a source file, so the tests always run the current code.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd;
const target = input.tool_input?.file_path || input.tool_input?.notebook_path;
if (!target) process.exit(0);
const file = relative(root, resolve(input.cwd || root, target));

if (input.hook_event_name === 'PreToolUse' && ['km.js', 'index.html'].includes(file)) {
  const source = file === 'km.js' ? 'kitchen-mode.js' : 'build.mjs (the page is a template string in it)';
  console.error(`${file} is generated, so a hand edit would be overwritten by the next build. Edit ${source} instead; it rebuilds automatically.`);
  process.exit(2);
}

if (input.hook_event_name === 'PostToolUse' && ['kitchen-mode.js', 'build.mjs'].includes(file)) {
  try {
    execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    console.error(`node build.mjs failed after editing ${file}, so km.js and index.html were not updated:\n${e.stderr}`);
    process.exit(2);
  }
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `Rebuilt km.js and index.html from ${file}.` },
  }));
}
