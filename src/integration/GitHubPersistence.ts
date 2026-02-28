import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GitHub-backed persistence layer for Clover Context
 * - Keeps last 5 days of active projects
 * - Pre-compaction checkpoint commits current work
 * - Resume loads from GitHub on session start
 */

export interface TaskCheckpoint {
  timestamp: number;
  taskName: string;
  taskFile: string;
  status: 'in-progress' | 'blocked' | 'paused';
  progress: string;
  lastModified: number;
  restorePointId: string;
}

export interface ActiveProject {
  name: string;
  status: 'in-progress' | 'completed' | 'paused';
  lastUpdated: number;
  taskFile: string;
  checkpoints: TaskCheckpoint[];
}

export class GitHubPersistence {
  private repoUrl: string;
  private localRepoPath: string;
  private workspacePath: string;
  private activeProjectsFile: string;
  private currentWorkFile: string;

  constructor(
    repoUrl: string = 'https://x-access-token:${GITHUB_TOKEN}@github.com/cloverbot89-web/clover-soul.git',
    workspacePath: string = '/root/clawd/clover-workspace',
  ) {
    this.repoUrl = repoUrl.replace('${GITHUB_TOKEN}', process.env.GITHUB_TOKEN || '');
    this.localRepoPath = '/tmp/clover-soul-sync';
    this.workspacePath = workspacePath;
    this.activeProjectsFile = path.join(this.localRepoPath, 'ACTIVE_PROJECTS.json');
    this.currentWorkFile = path.join(this.localRepoPath, 'CURRENT_WORK.md');
  }

  /**
   * Initialize or pull the persistence repo
   */
  ensureRepoSync(): void {
    if (!fs.existsSync(this.localRepoPath)) {
      console.log('[Clover Context] Cloning clover-soul repo...');
      execSync(`git clone ${this.repoUrl} ${this.localRepoPath}`);
    } else {
      console.log('[Clover Context] Pulling latest from clover-soul...');
      execSync(`cd ${this.localRepoPath} && git pull origin main`, { stdio: 'inherit' });
    }
  }

  /**
   * Save current work before compaction
   * Writes CURRENT_WORK.md and commits to GitHub
   */
  savePreCompactionCheckpoint(task: TaskCheckpoint): void {
    this.ensureRepoSync();

    const now = new Date();
    const timestamp = now.toISOString();

    // Build current work document
    const currentWorkContent = `# Currently Working On

**Last Updated:** ${timestamp}

## Active Task
- **Name:** ${task.taskName}
- **Status:** ${task.status}
- **File:** ${task.taskFile}

## Progress
\`\`\`
${task.progress}
\`\`\`

## Restore Point
- **ID:** ${task.restorePointId}
- **Created:** ${new Date(task.timestamp).toISOString()}

## How to Resume
1. Load \`${task.taskFile}\` from workspace
2. Use restore point \`${task.restorePointId}\`
3. Context+ will inject full state on session restart

---
*This file is auto-generated before Clawdbot compaction. Do not edit manually.*
`;

    // Write to repo
    const workFilePath = path.join(this.localRepoPath, 'CURRENT_WORK.md');
    fs.writeFileSync(workFilePath, currentWorkContent);

    // Commit and push
    try {
      execSync(`cd ${this.localRepoPath} && git add CURRENT_WORK.md`, { stdio: 'inherit' });
      execSync(
        `cd ${this.localRepoPath} && git commit -m "Pre-compaction checkpoint: ${task.taskName}"`,
        { stdio: 'inherit' },
      );
      execSync(`cd ${this.localRepoPath} && git push origin main`, { stdio: 'inherit' });
      console.log('[Clover Context] ✅ Pre-compaction checkpoint pushed to GitHub');
    } catch (e) {
      console.error('[Clover Context] ⚠️ Failed to commit pre-compaction checkpoint:', e);
    }
  }

  /**
   * Update active projects (last 5 days)
   * Periodically called as tasks are worked on
   */
  updateActiveProjects(projects: ActiveProject[]): void {
    this.ensureRepoSync();

    // Filter to last 5 days
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    const recentProjects = projects.filter((p) => p.lastUpdated > fiveDaysAgo);

    // Sort by last updated (newest first)
    recentProjects.sort((a, b) => b.lastUpdated - a.lastUpdated);

    // Write JSON
    const projectsData = {
      lastUpdated: new Date().toISOString(),
      projects: recentProjects,
      retentionDays: 5,
    };

    fs.writeFileSync(this.activeProjectsFile, JSON.stringify(projectsData, null, 2));

    // Commit if changed
    try {
      execSync(`cd ${this.localRepoPath} && git add ACTIVE_PROJECTS.json`, { stdio: 'inherit' });
      execSync(`cd ${this.localRepoPath} && git commit -m "Update active projects (${recentProjects.length} recent)"`, {
        stdio: 'inherit',
      });
      execSync(`cd ${this.localRepoPath} && git push origin main`, { stdio: 'inherit' });
    } catch (e) {
      // Likely no changes; skip
    }
  }

  /**
   * Load current work from GitHub on session restart
   */
  loadCurrentWork(): TaskCheckpoint | null {
    this.ensureRepoSync();

    const workFilePath = path.join(this.localRepoPath, 'CURRENT_WORK.md');
    if (!fs.existsSync(workFilePath)) {
      console.log('[Clover Context] No current work found.');
      return null;
    }

    const content = fs.readFileSync(workFilePath, 'utf-8');

    // Parse markdown to extract task info
    // In production, use a proper markdown parser
    const taskNameMatch = content.match(/- \*\*Name:\*\* (.+)/);
    const statusMatch = content.match(/- \*\*Status:\*\* (.+)/);
    const restorePointMatch = content.match(/- \*\*ID:\*\* (.+)/);

    if (!taskNameMatch || !statusMatch || !restorePointMatch) {
      console.error('[Clover Context] ⚠️ Failed to parse current work file');
      return null;
    }

    return {
      timestamp: Date.now(),
      taskName: taskNameMatch[1].trim(),
      taskFile: '',
      status: statusMatch[1].trim() as 'in-progress' | 'blocked' | 'paused',
      progress: '',
      lastModified: fs.statSync(workFilePath).mtimeMs,
      restorePointId: restorePointMatch[1].trim(),
    };
  }

  /**
   * Load active projects from GitHub
   */
  loadActiveProjects(): ActiveProject[] {
    this.ensureRepoSync();

    if (!fs.existsSync(this.activeProjectsFile)) {
      console.log('[Clover Context] No active projects found.');
      return [];
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.activeProjectsFile, 'utf-8'));
      return data.projects || [];
    } catch (e) {
      console.error('[Clover Context] ⚠️ Failed to parse active projects:', e);
      return [];
    }
  }

  /**
   * Resume from last checkpoint
   * Called on session startup
   */
  resume(): { currentWork: TaskCheckpoint | null; recentProjects: ActiveProject[] } {
    console.log('[Clover Context] 🔄 Resuming from GitHub...');

    const currentWork = this.loadCurrentWork();
    const recentProjects = this.loadActiveProjects();

    if (currentWork) {
      console.log(`[Clover Context] ✅ Found active task: ${currentWork.taskName}`);
      console.log(`[Clover Context] Status: ${currentWork.status}`);
      console.log(`[Clover Context] Restore point: ${currentWork.restorePointId}`);
    }

    if (recentProjects.length > 0) {
      console.log(`[Clover Context] Found ${recentProjects.length} active projects from last 5 days`);
    }

    return { currentWork, recentProjects };
  }
}

export default GitHubPersistence;
