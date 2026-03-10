# Smaug Integration Summary

## Overview

Smaug is a complete Twitter bookmark archival system integrated into /root/clawd/smaug. It's ready to use once you provide Twitter credentials.

## What Smaug Does

1. **Fetches** your Twitter bookmarks via bird CLI
2. **Enriches** them by extracting link content (articles, GitHub repos, tweets, etc.)
3. **Analyzes** each bookmark with Claude Code to generate titles and categorize
4. **Files** them into a knowledge library (knowledge/tools/, knowledge/articles/, etc.)
5. **Archives** them in bookmarks.md organized by date
6. **Triages** them to identify what repos they should augment or create

## Three-Phase Workflow

### Phase 1: Fetch (Mechanical)
```bash
npx smaug fetch 20          # Fetch 20 bookmarks
npx smaug fetch --all       # Fetch ALL (with pagination)
```
Output: `.state/pending-bookmarks.json` (enriched bookmark data)

### Phase 2: Process (AI-Powered)
```bash
npx smaug run              # Fetch + process in one go
npx smaug process          # Process already-fetched bookmarks
```
Output: 
- `bookmarks.md` - main archive
- `knowledge/tools/*.md` - GitHub repos
- `knowledge/articles/*.md` - articles
- Clean up `.state/pending-bookmarks.json`

### Phase 3: Triage (Categorization)
```bash
npx smaug triage manual    # Interactive triage workflow
```
Output: `triage.json` - actionable categorization with plans

## Setup (5 Minutes)

### 1. Install bird CLI
```bash
npm install -g @steipete/bird@latest
# or: brew install steipete/tap/bird
```

### 2. Get Twitter Cookies
1. Go to twitter.com
2. F12 → Application → Cookies → twitter.com
3. Find `auth_token` (900+ chars) and `ct0` (64 hex chars)

### 3. Configure
```bash
cd /root/clawd/smaug
npx smaug setup    # Interactive setup, or:
# Manually edit smaug.config.json with your cookies
```

### 4. Test
```bash
npx smaug fetch 10     # Should grab 10 bookmarks
npx smaug run          # Should process with Claude
```

## Directory Structure

```
/root/clawd/smaug/
├─ src/
│  ├─ cli.js          # Command-line interface
│  ├─ processor.js    # Fetch + link expansion
│  ├─ job.js          # Orchestration
│  ├─ config.js       # Configuration
│  ├─ triage.js       # Triage workflow (NEW)
│  └─ index.js
├─ .claude/
│  └─ commands/
│     └─ process-bookmarks.md   # Claude Code instructions
├─ .state/
│  ├─ pending-bookmarks.json    # (generated)
│  ├─ bookmarks-state.json      # (generated)
│  └─ batch-*.md                # (during parallel processing)
├─ knowledge/
│  ├─ tools/          # GitHub repos (auto-filed)
│  ├─ articles/       # Articles (auto-filed)
│  ├─ podcasts/       # (if configured)
│  └─ videos/         # (if configured)
├─ bookmarks.md       # Main archive (reverse chronological)
├─ smaug.config.json  # Your config (gitignored)
├─ README.md          # User guide
├─ SETUP_GUIDE.md     # Setup instructions (NEW)
├─ ARCHITECTURE.md    # How the system works (NEW)
├─ TRIAGE_WORKFLOW.md # Triage specification (NEW)
└─ tests/, examples/  # Reference code
```

## All Commands

```bash
# Setup & Configuration
npx smaug setup                    # Interactive setup wizard
npx smaug init [path]              # Create config file (non-interactive)
npx smaug status                   # Show configuration & archive stats

# Fetch Operations
npx smaug fetch 20                 # Fetch 20 bookmarks
npx smaug fetch --all              # Fetch ALL bookmarks (paginated)
npx smaug fetch --all --max-pages 5  # Limit pagination
npx smaug fetch --force            # Re-fetch even if archived
npx smaug fetch --source bookmarks # Fetch bookmarks only
npx smaug fetch --source likes     # Fetch likes only
npx smaug fetch --source both      # Fetch both
npx smaug fetch --media            # Include photos/videos (experimental)

# Processing
npx smaug run                      # Full job (fetch + process with Claude)
npx smaug run -t                   # With token usage tracking
npx smaug run --limit 50           # Process 50 at a time
npx smaug process                  # Show pending bookmarks

# Triage (NEW)
npx smaug triage                   # Interactive triage workflow
npx smaug triage manual            # Same as above
npx smaug triage --output file.json  # Custom output file

# Help
npx smaug --help                   # Show all commands
npx smaug help
```

## Configuration (smaug.config.json)

```json
{
  "archiveFile": "./bookmarks.md",
  "pendingFile": "./.state/pending-bookmarks.json",
  "stateFile": "./.state/bookmarks-state.json",
  "parallelThreshold": 8,
  "timezone": "UTC",
  
  // FILL THESE IN
  "twitter": {
    "authToken": "your-auth-token-here",
    "ct0": "your-ct0-here"
  },
  
  // Processing options
  "autoInvokeClaude": true,
  "claudeModel": "sonnet",        // haiku, sonnet (default), opus
  "cliTool": "claude",            // claude (default) or opencode
  "source": "bookmarks"           // bookmarks, likes, or both
}
```

## Understanding the Output

### bookmarks.md
```markdown
# Thursday, March 10, 2026

## @author - Title of Bookmark
> Quote from the tweet

- Tweet: https://x.com/author/status/...
- Link: https://...
- Filed: [knowledge/tools/repo-name.md]
- What: One-sentence description

---

# Wednesday, March 9, 2026
...
```

### knowledge/tools/*.md (GitHub repos)
```markdown
---
title: "repo-name"
type: tool
stars: 1234
url: https://github.com/...
tags: [ai, automation]
---

# Description and extracted README...
```

### knowledge/articles/*.md (Articles)
```markdown
---
title: "Article Title"
type: article
author: "Author Name"
source: "https://..."
tags: [ai, dev]
---

# Full article content...
```

### triage.json (Categorization output)
```json
{
  "stats": {
    "total": 25,
    "byCategory": {
      "dev-tool": 8,
      "library": 3,
      "idea": 7,
      "integration": 4,
      "ignore": 3
    },
    "actionable": 22
  },
  "triaged": [
    {
      "id": "twitter-id",
      "title": "Bookmark Title",
      "author": "@handle",
      "category": "dev-tool|library|idea|integration|ignore",
      "actionable": true,
      "plan": {
        "augments": "existing-repo",
        "creates": null,
        "description": "What to do with this",
        "priority": "high|medium|low",
        "estimatedEffort": "small|medium|large"
      },
      "notes": "Additional context",
      "tags": ["ai", "automation"]
    }
  ]
}
```

## Triage Categories Explained

| Category | What It Is | Example Action |
|----------|-----------|-----------------|
| **dev-tool** | A useful tool, framework, or library | Integrate Cursor IDE into IronClaw |
| **library** | Reusable code or patterns | Use zod for request validation |
| **idea** | A concept or approach | Implement agent scaling patterns from article |
| **integration** | A service or API to connect | Build Supabase realtime sync module |
| **ignore** | Not relevant | Marketing content, spam |

## Automation (Optional)

### Option A: PM2
```bash
npm install -g pm2
cd /root/clawd/smaug
pm2 start "npx smaug run" --cron "*/30 * * * *" --name smaug
pm2 save
pm2 startup
```

### Option B: Cron
```bash
crontab -e
# Add:
*/30 * * * * cd /root/clawd/smaug && npx smaug run >> smaug.log 2>&1
```

## Integration with IronClaw Projects

Smaug's triage output feeds into IronClaw's:
- **Roadmap**: High-priority items inform the next sprint
- **Knowledge base**: Triaged articles improve agent prompts
- **Tool discovery**: New libraries expand capabilities
- **Architecture**: Patterns from bookmarks shape system design

## Cost Tracking

```bash
npx smaug run -t    # Show token usage and costs
```

Parallel processing (≥8 bookmarks) uses Haiku subagents (~50% cost savings):
- Single bookmark: ~$0.02 with Sonnet
- 20 bookmarks sequential: ~$0.40
- 20 bookmarks parallel: ~$0.20 (Haiku for subagents)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "bird not found" | `npm install -g @steipete/bird@latest` |
| "403 Unauthorized" | Refresh cookies from twitter.com |
| "No new bookmarks" | Bookmark list empty or cookies bad |
| "Only 50-70 bookmarks" | Build bird from git for pagination (see README) |
| "bookmarks.md data loss" | Always use Edit tool, never Write tool |

## Files You Created / Added

### Documentation (New)
- `SETUP_GUIDE.md` - Step-by-step setup instructions
- `ARCHITECTURE.md` - Complete system design & implementation
- `TRIAGE_WORKFLOW.md` - Bookmark categorization workflow spec
- `src/triage.js` - Interactive triage tool (NEW!)

### Key Files (Pre-existing)
- `README.md` - Original user guide
- `src/cli.js` - Command-line interface
- `src/processor.js` - Bookmark fetching & enrichment
- `src/job.js` - Main orchestration
- `.claude/commands/process-bookmarks.md` - Claude Code instructions

## Next Steps

1. **Install bird CLI** - `npm install -g @steipete/bird@latest`
2. **Get Twitter credentials** - auth_token + ct0 from browser
3. **Run setup** - `npx smaug setup` (interactive, 2 minutes)
4. **Test fetch** - `npx smaug fetch 10` (should grab 10 bookmarks)
5. **Test process** - `npx smaug run` (should process with Claude)
6. **Review output** - Check bookmarks.md and knowledge/ folder
7. **Set up triage** - `npx smaug triage manual` (interactive)
8. **Automate** - Set up cron or PM2 for regular fetching

## Git Commits Made

```
41147aa Add architecture documentation and triage workflow specification
204f212 Add setup guide and interactive triage tool
```

Both are in `/root/clawd/smaug` on the main branch.

## Support & Documentation

- **README.md** - Original user guide and command reference
- **SETUP_GUIDE.md** - Step-by-step setup instructions (NEW)
- **ARCHITECTURE.md** - How the system works internally (NEW)
- **TRIAGE_WORKFLOW.md** - Bookmark categorization workflow (NEW)
- **src/cli.js** - Full command documentation in --help
- **src/triage.js** - Interactive triage implementation (NEW)

---

**Status**: Ready to use once you provide Twitter credentials ✅

**Questions?** Everything is documented. Start with SETUP_GUIDE.md!
