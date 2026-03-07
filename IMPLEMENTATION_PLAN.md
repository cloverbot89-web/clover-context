# Clover Context Implementation Plan

## Overview

We're adapting Context+ into a Clover-specific task persistence layer. Goal: Survive Clawdbot compactions without losing working context.

## Phase 1: MVP - Task State Persistence

### Week 1 (This week)

#### 1.1 Workspace Structure
- [ ] Initialize `/clover-workspace/` directory
- [ ] Create subdirs: `tasks/`, `checkpoints/`, `graph/`, `memory/`, `.clover-context/`
- [ ] Define task file schema (Markdown + YAML frontmatter)

#### 1.2 Core Task Management
- [ ] `TaskManager` class: load/save/list tasks
- [ ] `Checkpoint` class: create/list/restore snapshots
- [ ] Task file validation (required fields: title, status, goal, progress)
- [ ] Metadata tracking (created, modified, assigned, priority)

#### 1.3 Restore Points
- [ ] `RestorePointManager`: shadow file snapshots before changes
- [ ] Store in `.clover-context/restore-points/`
- [ ] Each checkpoint: timestamp + file hash + diffs
- [ ] Undo without touching git history

#### 1.4 Integration Hooks
- [ ] `create_task()` - Start new task, set as CURRENT_TASK.md
- [ ] `checkpoint()` - Save state with message, create restore point
- [ ] `resume()` - Load CURRENT_TASK.md on session start
- [ ] `complete_task()` - Archive task, log to MEMORY.md

#### 1.5 Testing
- [ ] Unit tests for TaskManager
- [ ] Integration test: create → checkpoint → resume flow
- [ ] Test restore point creation and undo

### Deliverables Week 1
- `/clover-workspace/` structure live
- `src/core/TaskManager.ts` working
- `src/git/RestorePoint.ts` working
- E2E test: create task → checkpoint → resume

---

## Phase 2: Semantic Intelligence

### Week 2

#### 2.1 Embeddings
- [ ] Set up Ollama (local embeddings) or OpenAI API
- [ ] Embed task titles, descriptions, goals
- [ ] Store embeddings in `memory/semantic-index.json`
- [ ] Cache for fast lookup

#### 2.2 Task Graph
- [ ] Parse wikilinks: `[[task-name]]` → connections
- [ ] Build task dependency graph
- [ ] Store in `graph/task-graph.md`
- [ ] Detect circular dependencies

#### 2.3 Semantic Search
- [ ] `semantic_task_search(query)` - Find related tasks by meaning
- [ ] Rank by relevance (embedding similarity)
- [ ] Return top 5 with context snippets

#### 2.4 Dependency Analysis
- [ ] `get_task_dependencies()` - What depends on this task?
- [ ] `get_blocking_tasks()` - What's blocking completion?
- [ ] `suggest_next_task()` - Based on dependencies and priority

#### 2.5 Testing
- [ ] Embedding quality (spot-check semantic relevance)
- [ ] Wikilink parsing (edge cases)
- [ ] Dependency cycle detection

### Deliverables Week 2
- Embeddings working (Ollama or API)
- Semantic search functional
- Task graph visualization (basic)
- Resume shows related tasks automatically

---

## Phase 3: Clawdbot Integration

### Week 3

#### 3.1 Compaction Hooks
- [ ] Detect Clawdbot compaction events
- [ ] Auto-create final checkpoint before compaction
- [ ] Save session context to disk
- [ ] Ensure no data loss on restart

#### 3.2 Session Startup
- [ ] Add hook to Clover's session init
- [ ] Check for CURRENT_TASK.md on load
- [ ] If found: load task + last checkpoint
- [ ] Prompt: "You were working on X. Resume? (y/n)"

#### 3.3 Context Window Management
- [ ] `get_resume_context(taskName)` - Return last checkpoint + task file
- [ ] Inject into session context automatically
- [ ] Keep resume data small (< 2KB for fast load)

#### 3.4 Memory Integration
- [ ] On task completion: auto-append to MEMORY.md
- [ ] Format: Date, task name, outcome, key learnings
- [ ] Link to task file and restore points

#### 3.5 Testing
- [ ] Simulate compaction + restart
- [ ] Verify CURRENT_TASK.md loads correctly
- [ ] Test with multi-hour task interrupted mid-way

### Deliverables Week 3
- Compaction events trigger checkpoints
- Resume works seamlessly on session restart
- MEMORY.md integration working
- Full end-to-end: create → work → compaction → resume

---

## Phase 4: Advanced Features

### Week 4+

#### 4.1 Velocity & Burndown
- [ ] Track task completion velocity (tasks/day)
- [ ] Burndown chart for multi-task projects
- [ ] Estimate time to completion

#### 4.2 Auto-Suggestions
- [ ] Suggest next task based on dependencies
- [ ] Highlight high-priority blockers
- [ ] "You're making good progress on X, Y is ready to start"

#### 4.3 Chat Integration
- [ ] Query tasks via chat: "What am I working on?"
- [ ] "Show me blocked tasks"
- [ ] "Resume the tax calculator work"

#### 4.4 Visualization
- [ ] Task dependency graph (visual)
- [ ] Timeline of checkpoints for a task
- [ ] Semantic similarity heatmap (what tasks are related?)

#### 4.5 Persistence Dashboard
- [ ] Show all tasks + statuses
- [ ] Restore point browser (see all checkpoints for a task)
- [ ] Task metrics (time spent, checkpoints, completion rate)

---

## File Structure

```
clover-context/
├── src/
│   ├── core/
│   │   ├── TaskManager.ts       # Load/save/list tasks
│   │   ├── Task.ts              # Task class
│   │   ├── EmbeddingManager.ts   # Semantic indexing
│   │   ├── TaskGraph.ts          # Wikilink parsing + graph
│   │   └── index.ts
│   ├── git/
│   │   ├── RestorePoint.ts       # Shadow snapshots
│   │   ├── DiffTracker.ts        # Track changes
│   │   └── index.ts
│   ├── tools/
│   │   ├── GetCurrentTask.ts
│   │   ├── CreateTaskCheckpoint.ts
│   │   ├── SemanticTaskSearch.ts
│   │   ├── ListRestorePoints.ts
│   │   ├── ResumeTask.ts
│   │   ├── ProposeTaskChange.ts
│   │   ├── GetTaskDependencies.ts
│   │   └── index.ts
│   ├── integration/
│   │   ├── ClawdbotHooks.ts      # Compaction detection
│   │   ├── SessionStartup.ts     # Init on resume
│   │   ├── MemorySync.ts         # Sync to MEMORY.md
│   │   └── index.ts
│   └── index.ts
├── test/
│   ├── TaskManager.test.ts
│   ├── RestorePoint.test.ts
│   ├── EmbeddingManager.test.ts
│   ├── e2e.test.ts              # Full flow tests
│   └── integration.test.ts       # Clawdbot hooks
├── package.json
├── tsconfig.json
├── README.md                     # What this is
├── IMPLEMENTATION_PLAN.md        # This file
├── CONFIG.md                     # Config reference
└── USAGE.md                      # How to use

/clover-workspace/               # Runtime directory
├── tasks/
│   ├── CURRENT_TASK.md
│   ├── BACKLOG.md
│   └── [task files]
├── checkpoints/
│   └── [checkpoint JSONs]
├── graph/
│   └── task-graph.md
├── memory/
│   └── semantic-index.json
└── .clover-context/
    ├── config.json
    └── restore-points/
```

---

## Config

`/clover-workspace/.clover-context/config.json`:

```json
{
  "workspace": "/clover-workspace/",
  "embedModel": "nomic-embed-text",
  "embeddingAPI": "ollama",
  "embeddingAPIUrl": "http://localhost:11434",
  "maxRestorePoints": 10,
  "autoCheckpointOnMilestone": true,
  "enableSemanticSearch": true,
  "semanticIndexRefreshInterval": 300000,
  "compactionCheckpointDir": "/tmp/clover-context-checkpoints/",
  "memoryIntegration": {
    "enabled": true,
    "memoryFile": "/root/clawd/clover-soul/MEMORY.md"
  }
}
```

---

## Testing Strategy

### Unit Tests
- TaskManager CRUD operations
- Checkpoint creation/undo
- Wikilink parsing
- Embedding cache

### Integration Tests
- Create task → checkpoint → restore
- Semantic search accuracy
- Dependency detection
- Undo without git interference

### E2E Tests
- Real Clawdbot session
- Simulate compaction + restart
- Multi-hour task interrupted mid-way
- Resume with full context

### Load Tests
- 100+ tasks in workspace
- Semantic search performance
- Checkpoint storage (disk space)

---

## Success Criteria

- [x] Code compiles and passes linting
- [ ] MVP phase passes all unit tests
- [ ] E2E test: task survives compaction + resumes correctly
- [ ] Semantic search accuracy > 80%
- [ ] Resume load time < 500ms
- [ ] Integration with actual Clawdbot session
- [ ] Zero data loss during compaction
- [ ] User can seamlessly resume interrupted work

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Embedding API latency | Local Ollama, aggressive caching |
| Disk space for checkpoints | Retention policy (keep last 10), auto-cleanup |
| Compaction timing conflicts | Pre-compaction checkpoint hook |
| Task file corruption | Restore point + git history backup |
| Semantic search false positives | Manual validation, tuning |

---

## Timeline

**Week 1:** MVP workspace + task management + restore points  
**Week 2:** Semantic indexing + task graph + search  
**Week 3:** Clawdbot integration + session hooks  
**Week 4+:** Advanced features, optimization, docs  

**Full launch:** 4 weeks from start

---

## Next Steps

1. ✅ Create repo (clover-context)
2. ✅ Write this plan
3. **→ Start Week 1:** Initialize workspace structure
4. **→ Build TaskManager class**
5. **→ Implement restore points**
6. **→ Test MVP flow**
