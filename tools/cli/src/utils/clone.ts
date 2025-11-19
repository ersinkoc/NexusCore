import execa from 'execa';
import fs from 'fs-extra';
import path from 'path';

/**
 * Clone NexusCore repository or copy template
 */
export async function cloneTemplate(targetDir: string): Promise<void> {
  const REPO_URL = 'https://github.com/ersinkoc/NexusCore.git';

  try {
    // Try to clone from GitHub
    await execa('git', ['clone', '--depth', '1', REPO_URL, targetDir]);

    // Remove .git directory to start fresh
    const gitDir = path.join(targetDir, '.git');
    if (await fs.pathExists(gitDir)) {
      await fs.remove(gitDir);
    }

    // Remove CLI tool from the cloned project
    const cliDir = path.join(targetDir, 'tools', 'cli');
    if (await fs.pathExists(cliDir)) {
      await fs.remove(cliDir);
    }
  } catch (error) {
    throw new Error('Failed to clone repository. Make sure git is installed and you have internet access.');
  }
}

/**
 * Initialize git repository
 */
export async function initGit(targetDir: string): Promise<void> {
  try {
    await execa('git', ['init'], { cwd: targetDir });
    await execa('git', ['add', '.'], { cwd: targetDir });
    await execa('git', ['commit', '-m', 'Initial commit from NexusCore'], { cwd: targetDir });
  } catch (error) {
    // Git init is optional, don't fail if it doesn't work
    console.warn('Warning: Could not initialize git repository');
  }
}
