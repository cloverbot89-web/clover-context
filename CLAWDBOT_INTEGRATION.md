# Clawdbot Integration for Clover Context

How to integrate Clover Context's startup and compaction hooks into Clawdbot's session lifecycle.

## Quick Start

### 1. Session Startup Hook

Call this **when Clover's session starts** (before loading main system prompt):

```bash
node /root/clawd/context-startup-init.js
```

**Output:** JSON with active work info

```json
{
  "hasActiveWork": true,
  "currentWork": {
    "taskName": "Build Tax Calculator Feature",
    "status": "in-progress",
    "restorePointId": "checkpoint-003",
    "lastModified": 1709147000000
  },
  "recentProjects": [
    {
      "name": "Shams Foundation Platform",
      "status": "in-progress",
      "lastUpdated": 1709050000000
    }
  ],
  "sessionContext": "## 🔄 Active Work from Previous Session\n\nYou have an active task that was interrupted:\n\n**Task:** Build Tax Calculator Feature\n..."
}
```

**What to do with this:**
- If `hasActiveWork` is true, append `sessionContext` to Clover's system prompt before the session starts
- This way, Clover knows what it was working on when it wakes up

### 2. Pre-Compaction Hook

Call this **before Clawdbot compacts Clover's session** (saves state to GitHub):

```bash
node /root/clawd/context-precompaction-hook.js \
  --task-name "Build Tax Calculator Feature" \
  --progress "Completed backend, working on frontend. Wash sale detection 90% done." \
  --restore-point "checkpoint-003"
```

**Or pass as JSON args:**

```bash
node /root/clawd/context-precompaction-hook.js \
  --task-name "Current Task" \
  --progress "What I was doing" \
  --restore-point "checkpoint-id" \
  --projects '[{"name":"Project","status":"in-progress","lastUpdated":1709147000000}]'
```

**What it does:**
- Clones/pulls clover-soul repo
- Writes `CURRENT_WORK.md` with task details
- Updates `ACTIVE_PROJECTS.json` with last 5 days of projects
- Commits and pushes to GitHub
- Logs status

**Exit codes:**
- `0` = Success
- `1` = Failure

## Integration Points

### In Clawdbot Gateway Code

#### Before Session Start

```javascript
import { execSync } from 'child_process';

async function startCloverSession(sessionId) {
  if (sessionId === 'clover-main') {
    // Run context startup hook
    const result = execSync('node /root/clawd/context-startup-init.js', { encoding: 'utf-8' });
    const contextInfo = JSON.parse(result.split('\n').find(line => line.startsWith('{')));

    // Inject into system prompt if active work exists
    if (contextInfo.hasActiveWork && contextInfo.sessionContext) {
      const basePrompt = getBaseSystemPrompt();
      const enhancedPrompt = basePrompt + '\n' + contextInfo.sessionContext;
      session.setSystemPrompt(enhancedPrompt);
      
      console.log(`[Clawdbot] Injected context for: ${contextInfo.currentWork.taskName}`);
    }
  }

  // Continue normal session start...
}
```

#### Before Compaction

```javascript
async function beforeSessionCompaction(sessionId) {
  if (sessionId === 'clover-main') {
    const cloverState = getCloverSessionState();

    // Call pre-compaction hook
    execSync(
      `node /root/clawd/context-precompaction-hook.js ` +
        `--task-name "${cloverState.currentTask.name}" ` +
        `--progress "${cloverState.currentTask.progress}" ` +
        `--restore-point "${cloverState.currentTask.restorePointId}" ` +
        `--projects '${JSON.stringify(cloverState.activeProjects)}'`,
      { stdio: 'inherit' }
    );

    console.log(`[Clawdbot] Pre-compaction checkpoint saved for Clover`);
  }

  // Continue with compaction...
}
```

#### On Session Restart (Post-Compaction)

```javascript
async function onSessionRestart(sessionId) {
  if (sessionId === 'clover-main') {
    // Re-run startup hook (loads from GitHub)
    const result = execSync('node /root/clawd/context-startup-init.js', { encoding: 'utf-8' });
    const contextInfo = JSON.parse(result.split('\n').find(line => line.startsWith('{')));

    if (contextInfo.hasActiveWork) {
      console.log(`[Clawdbot] Clover has active work to resume: ${contextInfo.currentWork.taskName}`);
    }
  }
}
```

## Environment Requirements

- `GITHUB_TOKEN` must be set in Clawdbot's environment
- Git must be configured with `user.email` and `user.name`
- Network access to GitHub

## Troubleshooting

### "GITHUB_TOKEN not found"

```bash
export GITHUB_TOKEN="ghp_xxxxx"
node /root/clawd/context-startup-init.js
```

### "Failed to clone repo"

Check:
- `GITHUB_TOKEN` is valid
- Token has `repo` scope (read/write)
- Network connectivity to GitHub

### "No output from hook"

The hook may be failing silently. Run with explicit logging:

```bash
bash -x /root/clawd/context-startup-init.js 2>&1 | head -50
```

## Files

- **`context-startup-init.js`** — Load active work on session start
- **`context-precompaction-hook.js`** — Save work before compaction
- **`CLAUDE.md`** — Updated with Clover Context documentation
- **`AGENTS.md`** — Updated with context startup in session flow

## Test the Integration

### 1. Manually test startup hook

```bash
node /root/clawd/context-startup-init.js
```

Should output JSON with current work (if any) or empty.

### 2. Manually test pre-compaction hook

```bash
node /root/clawd/context-precompaction-hook.js \
  --task-name "Test Task" \
  --progress "Testing the hook" \
  --restore-point "test-checkpoint"
```

Check clover-soul repo for `CURRENT_WORK.md` update.

### 3. Full cycle test

1. Run startup hook → should see logs
2. Run pre-compaction hook with test data
3. Check GitHub repo (cloverbot89-web/clover-soul) → should see commit
4. Run startup hook again → should load saved work

## Next Steps

- [ ] Integrate hooks into Clawdbot gateway
- [ ] Test with real compaction event
- [ ] Monitor GitHub commits
- [ ] Adjust error handling based on production behavior

---

**Status:** Ready for Clawdbot integration  
**Tested:** Manual hook execution  
**Next:** Integration into gateway session lifecycle
