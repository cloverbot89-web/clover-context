# Clover Context - Integration Guide

How to integrate Clover Context into Clover's session startup and Clawdbot's compaction lifecycle.

## Quick Start

### 1. Install Clover Context

In Clover's main codebase:

```bash
npm install clover-context
# or
yarn add clover-context
```

### 2. Add to Session Initialization

In Clover's main session startup (e.g., `AGENTS.md` or `session-init.ts`):

```typescript
import { initializeCloverContext } from 'clover-context';

async function startSession() {
  // Initialize Clover Context first
  const contextInfo = await initializeCloverContext();

  if (contextInfo.hasActiveWork) {
    console.log(`\n✅ Found active task: ${contextInfo.currentWork?.taskName}`);
    console.log(`📌 Status: ${contextInfo.currentWork?.status}`);
    console.log(`🔄 Restore Point: ${contextInfo.currentWork?.restorePointId}\n`);

    // Inject context into session
    const systemPrompt = `${existingSystemPrompt}${contextInfo.sessionContext}`;
    // Use updated systemPrompt for this session
  }

  if (contextInfo.recentProjects.length > 0) {
    console.log('Recent projects (last 5 days):');
    contextInfo.recentProjects.forEach((p) => {
      console.log(`  • ${p.name} (${p.status})`);
    });
  }

  // Continue normal session startup...
}
```

### 3. Register Compaction Hooks

In Clawdbot's gateway or compaction manager:

```typescript
import { registerCompactionHooks } from 'clover-context';

const hooks = registerCompactionHooks();

// Before compaction
compactionManager.on('beforeCompaction', async (sessionState) => {
  await hooks.beforeCompaction({
    currentTask: sessionState.currentTask, // From Clover's state
    activeProjects: sessionState.activeProjects,
  });
});

// After restart
sessionManager.on('sessionStart', async (sessionId) => {
  if (sessionId === 'clover-main') {
    await hooks.afterCompaction();
  }
});
```

## How It Works

### Session Startup Flow

1. **Clover starts** → `initializeCloverContext()` is called
2. **GitHub check** → Pulls `clover-soul` repo, loads `CURRENT_WORK.md`
3. **Context injected** → If work found, adds to system context
4. **Session continues** → Clover sees what it was working on
5. **Resume or start fresh** → Up to Clover to decide

### Pre-Compaction Flow

1. **Compaction triggers** → `beforeCompaction()` hook called
2. **Current state captured** → What task? What progress?
3. **GitHub save** → Writes `CURRENT_WORK.md` + `ACTIVE_PROJECTS.json`
4. **Commit & push** → State safely in GitHub
5. **Session compacts** → No data loss

### Post-Restart Flow

1. **Session restarts** → `afterCompaction()` hook called
2. **GitHub load** → Reads `CURRENT_WORK.md` and projects
3. **Resume context** → Injected into new session
4. **Work continues** → Clover knows where it left off

## Usage During Work

### Create a Checkpoint Manually

If Clover completes a significant milestone:

```typescript
import { createCheckpoint } from 'clover-context';

await createCheckpoint(
  'Completed tax engine implementation, debugging wash sale detection',
  'Build Tax Calculator Feature',
  'checkpoint-003'
);
```

This immediately pushes to GitHub, so even if things crash, the state is safe.

## File Locations

Files are stored in `clover-soul` repo (your existing memory repo):

- **`CURRENT_WORK.md`** — What's being worked on now (Markdown)
- **`ACTIVE_PROJECTS.json`** — Last 5 days of projects (JSON)

Both files are committed to GitHub automatically, so they're always safe.

## Configuration

Default behavior uses:
- Repo: `cloverbot89-web/clover-soul`
- Workspace: `/root/clawd/clover-workspace`

To customize:

```typescript
import { GitHubPersistence } from 'clover-context';

const persistence = new GitHubPersistence(
  'https://x-access-token:${GITHUB_TOKEN}@github.com/your-org/your-repo.git',
  '/custom/workspace/path'
);
```

## Troubleshooting

### "GITHUB_TOKEN not found"

Ensure `GITHUB_TOKEN` environment variable is set (it should be in Clover's env).

### "Failed to clone repo"

Check that the repo URL is correct and the token has push access.

### "No current work found"

First session or `CURRENT_WORK.md` was deleted. That's fine — you're starting fresh.

### "Permission denied on push"

Make sure `GITHUB_TOKEN` has `repo` scope (read/write access).

## Testing

Run integration tests:

```bash
npm test src/__tests__/integration.test.ts
```

Simulates:
- Session start with active work
- Compaction + restart
- Multi-hour task interrupted and resumed

## Next Steps

1. ✅ Code integration layer
2. ✅ Compaction hooks
3. → Add to Clover's actual session startup
4. → Test with real compaction events
5. → Monitor GitHub commits (should see `CURRENT_WORK.md` updates)

## Questions?

This layer is designed to be transparent — it should "just work" without Clover having to think about it.

If you hit issues, the logs will show `[Clover Context]` tags for debugging.
