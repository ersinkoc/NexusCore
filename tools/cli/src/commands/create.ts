import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

import { cloneTemplate, initGit } from '../utils/clone';
import {
  generatePackageJson,
  generateApiEnv,
  generateWebEnv,
  generateDbEnv,
  generateReadme,
  generateGitignore,
} from '../utils/templates';

export async function createProject(projectName?: string) {
  console.log(chalk.blue.bold('\n🚀 Welcome to NexusCore CLI!\n'));
  console.log(chalk.gray('The Ultimate Node.js & React Boilerplate\n'));

  // Prompt for project configuration
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is your project name?',
      default: projectName || 'my-nexuscore-app',
      when: !projectName,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Project name is required';
        }
        if (!/^[a-z0-9-_]+$/i.test(input)) {
          return 'Project name can only contain letters, numbers, hyphens, and underscores';
        }
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'includeDocker',
      message: 'Include Docker configuration?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'initGit',
      message: 'Initialize git repository?',
      default: true,
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Which package manager do you want to use?',
      choices: ['pnpm', 'npm', 'yarn'],
      default: 'pnpm',
    },
  ]);

  const finalProjectName = answers.projectName || projectName!;
  const targetDir = path.join(process.cwd(), finalProjectName);

  // Check if directory exists
  if (await fs.pathExists(targetDir)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory "${finalProjectName}" already exists. Overwrite?`,
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('\n⚠️  Cancelled\n'));
      return;
    }

    await fs.remove(targetDir);
  }

  const spinner = ora('Creating project...').start();

  try {
    // Clone template
    spinner.text = 'Cloning NexusCore template...';
    await cloneTemplate(targetDir);

    // Update package.json with project name
    spinner.text = 'Configuring project...';
    const rootPkgPath = path.join(targetDir, 'package.json');
    const rootPkg = await fs.readJson(rootPkgPath);
    rootPkg.name = finalProjectName;
    await fs.writeJson(rootPkgPath, rootPkg, { spaces: 2 });

    // Generate .env files
    spinner.text = 'Generating environment files...';
    await fs.writeFile(path.join(targetDir, 'apps', 'api', '.env'), generateApiEnv());
    await fs.writeFile(path.join(targetDir, 'apps', 'web', '.env'), generateWebEnv());
    await fs.writeFile(path.join(targetDir, 'packages', 'db', '.env'), generateDbEnv());

    // Generate README
    spinner.text = 'Creating README...';
    await fs.writeFile(path.join(targetDir, 'README.md'), generateReadme(finalProjectName));

    // Generate .gitignore
    await fs.writeFile(path.join(targetDir, '.gitignore'), generateGitignore());

    // Remove Docker files if not needed
    if (!answers.includeDocker) {
      spinner.text = 'Removing Docker files...';
      await fs.remove(path.join(targetDir, 'docker-compose.yml'));
      await fs.remove(path.join(targetDir, 'docker-compose.dev.yml'));
      await fs.remove(path.join(targetDir, 'Dockerfile.api'));
    }

    // Install dependencies
    if (answers.packageManager === 'pnpm') {
      spinner.text = 'Installing dependencies with pnpm (this may take a while)...';
      await execa('pnpm', ['install'], { cwd: targetDir });
    } else if (answers.packageManager === 'npm') {
      spinner.text = 'Installing dependencies with npm (this may take a while)...';
      await execa('npm', ['install'], { cwd: targetDir });
    } else if (answers.packageManager === 'yarn') {
      spinner.text = 'Installing dependencies with yarn (this may take a while)...';
      await execa('yarn', ['install'], { cwd: targetDir });
    }

    // Generate Prisma client
    spinner.text = 'Generating Prisma client...';
    await execa(answers.packageManager, ['db:generate'], { cwd: targetDir });

    // Initialize git
    if (answers.initGit) {
      spinner.text = 'Initializing git repository...';
      await initGit(targetDir);
    }

    spinner.succeed(chalk.green.bold('✅ Project created successfully!'));

    // Success message
    console.log(chalk.blue.bold(`\n🎉 ${finalProjectName} is ready!\n`));
    console.log(chalk.white('📝 Next steps:\n'));
    console.log(chalk.cyan(`  cd ${finalProjectName}`));

    if (answers.includeDocker) {
      console.log(chalk.cyan('  pnpm docker:up'));
      console.log(chalk.gray('     # Start PostgreSQL, Redis, and pgAdmin\n'));
    } else {
      console.log(chalk.gray('  # Make sure PostgreSQL and Redis are running\n'));
    }

    console.log(chalk.cyan('  pnpm db:push'));
    console.log(chalk.gray('     # Push database schema\n'));

    console.log(chalk.cyan('  pnpm --filter @nexuscore/db seed'));
    console.log(chalk.gray('     # Seed database with test users\n'));

    console.log(chalk.cyan('  pnpm dev'));
    console.log(chalk.gray('     # Start development servers\n'));

    console.log(chalk.white('🌐 Access points:\n'));
    console.log(chalk.gray('  Frontend: http://localhost:5173'));
    console.log(chalk.gray('  API:      http://localhost:4000'));
    if (answers.includeDocker) {
      console.log(chalk.gray('  pgAdmin:  http://localhost:5050\n'));
    }

    console.log(chalk.white('👤 Demo credentials:\n'));
    console.log(chalk.gray('  Admin: admin@nexuscore.local / Admin123!'));
    console.log(chalk.gray('  User:  user@nexuscore.local / User123!\n'));

    console.log(chalk.green('Happy coding! 🚀\n'));
    console.log(chalk.gray('📚 Documentation: https://github.com/ersinkoc/NexusCore\n'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to create project'));
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
    console.log(chalk.yellow('\nPlease try again or report the issue at:'));
    console.log(chalk.blue('https://github.com/ersinkoc/NexusCore/issues\n'));
    process.exit(1);
  }
}
