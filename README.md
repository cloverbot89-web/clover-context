# Clover Context

**Semantic working memory for Clover.** Adapted from [Context+](https://github.com/ForLoopCodes/contextplus), this system maintains task state, working context, and semantic links across Clawdbot compactions.

## Problem

Clover loses context when:
- Clawdbot compacts session history to fit token budget
- A long task is interrupted mid-way
- The session restarts
- Memory is fragmented across files

Result: Tasks get dropped, progress is lost, context has to be manually re-established.

## Solution

**Clover Context** provides:
- **Task State Persistence:** What am I working on? Where did I leave off?
- **Restore Points:** Shadow checkpoints before changes (undo without git)
- **Semantic Task Graph:** Wikilinks connecting tasks → code → memory
- **Compaction-Safe Checkpoints:** Auto-save working state before session end
- **Resume Protocol:** Auto-detect and resume interrupted work on restart

## Architecture

### Three Layers

#### 1. Core (src/core/)
- **AST Parsing:** Parse task files, scripts, progress notes
- **Semantic Indexing:** Embeddings for task descriptions, goals, blockers
- **Feature Graph:** Wikilink-style connections between tasks and resources
- **Cache Management:** Store embeddings for fast semantic search

#### 2. Tools (src/tools/)
- `get_current_task()` — What am I working on right now?
- `create_task_checkpoint()` — Save working state + create restore point
- `semantic_task_search()` — Find related incomplete tasks by meaning
- `list_restore_points()` — View previous work states
- `resume_task()` — Resume interrupted work with full context
- `propose_task_change()` — Write task changes with validation
- `get_task_dependencies()` — What else depends on this?

#### 3. Git (src/git/)
- **Shadow Restore Points:** Checkpoint file states before changes
- **Undo Without Git:** Revert task changes independent of git history
- **Atomic Checkpoints:** All-or-nothing task saves

### Data Structure

```
/clover-workspace/
├── tasks/
│   ├── CURRENT_TASK.md          # What I'm working on NOW
│   ├── 2026-02-28-task-*.md     # Task files by date
│   └── BACKLOG.md               # Todo tasks
├── checkpoints/
│   ├── restore-points.json      # List of all restore points
│   └── checkpoint-*.json        # Snapshot of task state + context
├── graph/
│   └── task-graph.md            # Wikilinks: [[task-name]] [[relates-to]]
├── memory/
│   └── semantic-index.json      # Embeddings for semantic search
└── .clover-context/
    └── config.json              # Settings and cache metadata
```

## Getting Started

### 1. Install Context+
```bash
npm install contextplus
npm run build
```

### 2. Initialize Clover Context
```bash
npm run init-clover
```

Creates workspace structure and config.

### 3. Start a Task
```bash
npm run create-task "Build feature X"
```

Auto-creates task file, sets as CURRENT_TASK.md, creates initial checkpoint.

### 4. Work & Save
As you work:
```bash
npm run checkpoint "Completed section A, started section B"
```

Creates restore point, updates semantic index.

### 5. Compaction Happens
When Clawdbot compacts session, Clover Context survives (files on disk).

### 6. Resume
On next session:
```bash
npm run resume
```

Auto-loads CURRENT_TASK.md with full context, shows restore points, offers to continue.

## Integration with Clawdbot

### Session Startup
1. Clover loads CLAUDE.md
2. Loads clover-context config
3. Calls `resume()` — checks for interrupted tasks
4. If task found, loads CURRENT_TASK.md + last checkpoint
5. Displays: "You were working on X, left off at Y. Resume? (y/n)"

### During Work
- After each major milestone: `checkpoint()`
- On task completion: `complete_task()` → archives + logs to MEMORY.md
- If stuck: `semantic_task_search()` to find related past work

### Pre-Compaction Hook
- (Future) Clawdbot calls `create_final_checkpoint()` before compaction
- Ensures working state is safe to disk

## Task File Format

```markdown
# Task: Build Tax Calculator Feature

**Status:** In Progress  
**Created:** 2026-02-28  
**Due:** 2026-03-05  
**Assigned:** clover  
**Priority:** High  

## Goal
Implement real-time tax impact panel with wash sale detection.

## Why
Users need immediate feedback on trade tax implications.

## Progress
- [x] Tax engine scaffolded
- [x] Mock data loaded
- [ ] Real-time UI component
- [ ] Integrate with brokerage API

## Current Blocker
Need to decide on Alpaca vs Interactive Brokers for data layer.

## Restore Points
- `checkpoint-001`: Tax engine passing tests
- `checkpoint-002`: Mock data integrated
- `checkpoint-003`: [CURRENT] UI component 40% done

## Related Tasks
- [[tax-calculator-broker-integration]]
- [[frontend-development-skills]]

## Notes
- Wash sale logic is tricky; see `lib/tax-engine.js` for details
- Consider TreeSitter for semantic code search in future
```

## Config

```json
{
  "workspace": "/clover-workspace/",
  "embedModel": "nomic-embed-text",
  "chatModel": "llama3.2",
  "restorePointRetention": 10,
  "autoCheckpointOnMilestone": true,
  "semanticIndexBatchSize": 8,
  "compactionCheckpointDir": "/tmp/clover-context-checkpoints/"
}
```

## Tools Reference

### get_current_task()
Returns the CURRENT_TASK.md file with metadata.

### create_task_checkpoint(message: string)
Saves current task state, creates restore point, updates semantic index.

**Usage:**
```bash
checkpoint "Completed section A, debugging section B"
```

### semantic_task_search(query: string)
Search tasks by meaning (embeddings). Returns ranked results with relevance.

**Usage:**
```bash
search "tax calculations on trades"
```

### list_restore_points(taskName?: string)
Lists all restore points, optionally filtered by task.

### resume_task(taskName?: string, restorePoint?: string)
Load task and optionally a specific restore point. Prompts for confirmation.

**Usage:**
```bash
resume "Build Tax Calculator Feature" "checkpoint-003"
```

### propose_task_change(filePath: string, changes: string[])
Propose edits to a task file with validation. Creates restore point before writing.

### get_task_dependencies()
Show what other tasks depend on the current one (via wikilinks).

## Implementation Roadmap

### Phase 1: MVP (This week)
- [x] Copy Context+ repo structure
- [ ] Adapt to Clover task format
- [ ] Implement restore point system
- [ ] Add checkpoint/resume protocol
- [ ] Test with one task

### Phase 2: Integration (Next week)
- [ ] Hook into Clawdbot startup
- [ ] Auto-detect compaction events
- [ ] Semantic search for task recovery
- [ ] MEMORY.md integration

### Phase 3: Advanced (Following week)
- [ ] Wikilink graph visualization
- [ ] Dependency tracking
- [ ] Velocity/burndown metrics
- [ ] Auto-suggestions for next tasks

## Why This Works

1. **Survives Compactions:** Files on disk, not session history
2. **Resume-Friendly:** CURRENT_TASK.md + checkpoints = full context recovery
3. **Semantic:** Can find related work by meaning, not just keywords
4. **Safe:** Restore points let you undo without git friction
5. **Simple:** Minimal overhead, easy integration with existing workflow

## References

- [Context+ Original](https://github.com/ForLoopCodes/contextplus)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io)
- [Clover Soul Repo](https://github.com/cloverbot89-web/clover-soul)
- [Clawdbot Docs](https://docs.clawd.bot)

---

**Status:** In active development  
**Maintained by:** Clover (@Clover98bot)  
**For:** Shams Foundation, Assumable Pipeline, Moltworker projects
