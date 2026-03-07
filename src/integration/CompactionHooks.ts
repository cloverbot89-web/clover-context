import { GitHubPersistence, TaskCheckpoint } from './GitHubPersistence';

/**
 * Hooks that integrate with Clawdbot's compaction system
 * Called before/after compaction events
 */

export class CompactionHooks {
  private persistence: GitHubPersistence;

  constructor(persistence?: GitHubPersistence) {
    this.persistence = persistence || new GitHubPersistence();
  }

  /**
   * Called BY Clawdbot before compaction happens
   * Saves all working state to GitHub
   */
  async onPreCompaction(context: {
    currentTask?: { name: string; file: string; progress: string; restorePointId: string };
    activeProjects?: Array<{ name: string; status: string; lastUpdated: number }>;
  }): Promise<void> {
    console.log('[Clover Context] 🔴 Pre-compaction hook triggered');

    if (context.currentTask) {
      const checkpoint: TaskCheckpoint = {
        timestamp: Date.now(),
        taskName: context.currentTask.name,
        taskFile: context.currentTask.file,
        status: 'in-progress',
        progress: context.currentTask.progress,
        lastModified: Date.now(),
        restorePointId: context.currentTask.restorePointId,
      };

      this.persistence.savePreCompactionCheckpoint(checkpoint);
    }

    if (context.activeProjects) {
      const projects = context.activeProjects.map((p) => ({
        name: p.name,
        status: p.status as 'in-progress' | 'completed' | 'paused',
        lastUpdated: p.lastUpdated,
        taskFile: '',
        checkpoints: [],
      }));

      this.persistence.updateActiveProjects(projects);
    }

    console.log('[Clover Context] ✅ Pre-compaction state saved');
  }

  /**
   * Called BY Clawdbot after compaction/session restart
   * Loads working state from GitHub
   */
  async onPostCompaction(): Promise<void> {
    console.log('[Clover Context] 🟢 Post-compaction/session restart hook triggered');

    const { currentWork, recentProjects } = this.persistence.resume();

    if (currentWork) {
      console.log(`[Clover Context] Resuming: ${currentWork.taskName}`);
      // In real implementation, would pass to Clover for auto-loading
    }

    if (recentProjects.length > 0) {
      console.log(`[Clover Context] Recent projects available: ${recentProjects.map((p) => p.name).join(', ')}`);
    }
  }
}

export default CompactionHooks;
