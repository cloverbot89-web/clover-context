/**
 * CloverContextInit
 *
 * This module is designed to be called from Clover's initialization code.
 * It sets up the context persistence layer and injects state into the session.
 *
 * Usage in Clover's startup:
 * ```
 * import { initializeCloverContext } from 'clover-context';
 * const contextInfo = await initializeCloverContext();
 * // contextInfo.hasActiveWork, contextInfo.currentWork, contextInfo.sessionContext
 * ```
 */

import { SessionStartup } from './integration/SessionStartup';
import { CompactionHooks } from './integration/CompactionHooks';
import { GitHubPersistence } from './integration/GitHubPersistence';

export interface CloverContextInfo {
  hasActiveWork: boolean;
  currentWork?: {
    taskName: string;
    status: string;
    restorePointId: string;
  };
  recentProjects: Array<{
    name: string;
    status: string;
  }>;
  sessionContext: string;
}

/**
 * Initialize Clover Context on session startup
 * Called automatically by Clover during initialization
 *
 * Returns information about any active work that should be resumed
 */
export async function initializeCloverContext(): Promise<CloverContextInfo> {
  const startup = new SessionStartup();
  const result = await startup.initialize();

  return {
    hasActiveWork: result.hasActiveWork,
    currentWork: result.currentWork
      ? {
          taskName: result.currentWork.taskName,
          status: result.currentWork.status,
          restorePointId: result.currentWork.restorePointId,
        }
      : undefined,
    recentProjects: result.recentProjects.map((p) => ({
      name: p.name,
      status: p.status,
    })),
    sessionContext: startup.getSessionContext(result.currentWork),
  };
}

/**
 * Register pre-compaction hook
 * Clawdbot should call this before compacting sessions
 *
 * Usage:
 * ```
 * import { registerCompactionHooks } from 'clover-context';
 * registerCompactionHooks(clawdbotCompactionManager);
 * ```
 */
export function registerCompactionHooks() {
  const hooks = new CompactionHooks();

  return {
    /**
     * Call this before Clawdbot compacts a session
     * Saves current work to GitHub
     */
    beforeCompaction: async (context: {
      currentTask?: { name: string; file: string; progress: string; restorePointId: string };
      activeProjects?: Array<{ name: string; status: string; lastUpdated: number }>;
    }) => {
      return hooks.onPreCompaction(context);
    },

    /**
     * Call this after Clawdbot restarts a session (post-compaction)
     * Loads work from GitHub
     */
    afterCompaction: async () => {
      return hooks.onPostCompaction();
    },
  };
}

/**
 * Create a checkpoint manually (for progress tracking)
 * Can be called by Clover during work
 *
 * Usage:
 * ```
 * import { createCheckpoint } from 'clover-context';
 * await createCheckpoint('Completed section A, debugging section B');
 * ```
 */
export async function createCheckpoint(progress: string, taskName: string, restorePointId: string) {
  const persistence = new GitHubPersistence();

  const checkpoint = {
    timestamp: Date.now(),
    taskName: taskName,
    taskFile: '',
    status: 'in-progress' as const,
    progress: progress,
    lastModified: Date.now(),
    restorePointId: restorePointId,
  };

  persistence.savePreCompactionCheckpoint(checkpoint);
  console.log('[Clover Context] ✅ Checkpoint created and pushed to GitHub');
}

export { GitHubPersistence, CompactionHooks, SessionStartup };
