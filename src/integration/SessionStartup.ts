import { GitHubPersistence, TaskCheckpoint, ActiveProject } from './GitHubPersistence';
import * as readline from 'readline';

/**
 * Session startup integration for Clover
 * Runs on every session start to resume interrupted work
 */

export class SessionStartup {
  private persistence: GitHubPersistence;

  constructor(persistence?: GitHubPersistence) {
    this.persistence = persistence || new GitHubPersistence();
  }

  /**
   * Main entry point: Called during Clover's session initialization
   * Returns context to inject into session, or null if no active work
   */
  async initialize(): Promise<{
    hasActiveWork: boolean;
    currentWork?: TaskCheckpoint;
    recentProjects: ActiveProject[];
    resumePrompt?: string;
  }> {
    console.log('[Clover Context] 🟢 Session startup - checking for active work...\n');

    const { currentWork, recentProjects } = this.persistence.resume();

    if (!currentWork) {
      console.log('[Clover Context] ✨ Fresh start - no active work found\n');
      return {
        hasActiveWork: false,
        recentProjects: recentProjects,
      };
    }

    // Found active work
    console.log('[Clover Context] ✅ Found active task!\n');
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`  RESUME: ${currentWork.taskName}`);
    console.log(`  Status: ${currentWork.status}`);
    console.log(`  Restore Point: ${currentWork.restorePointId}`);
    console.log(`═══════════════════════════════════════════════════════════\n`);

    if (recentProjects.length > 0) {
      console.log('Other active projects from last 5 days:');
      recentProjects.forEach((p) => {
        console.log(`  • ${p.name} (${p.status})`);
      });
      console.log('');
    }

    return {
      hasActiveWork: true,
      currentWork: currentWork,
      recentProjects: recentProjects,
      resumePrompt: `You were working on "${currentWork.taskName}". Should I load the task and continue? (y/n)`,
    };
  }

  /**
   * Inject context into Clover's system prompt/state
   * Tells Clover what it should know about ongoing work
   */
  getSessionContext(activeWork?: TaskCheckpoint): string {
    if (!activeWork) {
      return '';
    }

    return `
## Active Work Context

You have an active task from the previous session:

**Task:** ${activeWork.taskName}  
**Status:** ${activeWork.status}  
**Restore Point:** ${activeWork.restorePointId}  

This context was auto-loaded from GitHub when your session started. Use \`npm run get-checkpoint -- ${activeWork.restorePointId}\` to load the full restore point if needed.

If you want to resume this task, load it with your usual task-loading process. If you want to start something new, that's fine too — the system will track this as a separate piece of work.
`;
  }
}

export default SessionStartup;
