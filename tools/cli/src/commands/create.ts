import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

export async function createProject(projectName?: string) {
  // Prompt for project configuration
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is your project name?',
      default: projectName || 'my-nexuscore-app',
      when: !projectName,
    },
    {
      type: 'confirm',
      name: 'includeDocker',
      message: 'Include Docker configuration?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'includeDemoModule',
      message: 'Install demo e-commerce module?',
      default: false,
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Which package manager do you want to use?',
      choices: ['pnpm', 'npm', 'yarn'],
      default: 'pnpm',
    },
  ]);

  const targetDir = path.join(process.cwd(), answers.projectName || projectName!);

  // Check if directory exists
  if (await fs.pathExists(targetDir)) {
    console.log(chalk.red(`\n❌ Directory "${answers.projectName}" already exists!\n`));
    return;
  }

  const spinner = ora('Creating project...').start();

  try {
    // Create project directory
    await fs.ensureDir(targetDir);

    spinner.text = 'Copying template files...';
    // TODO: Copy template files from NexusCore repository

    spinner.text = 'Generating .env file...';
    // TODO: Generate .env files based on answers

    if (answers.packageManager === 'pnpm') {
      spinner.text = 'Installing dependencies with pnpm...';
      await execa('pnpm', ['install'], { cwd: targetDir });
    }

    spinner.text = 'Generating Prisma client...';
    // TODO: Run prisma generate

    spinner.succeed(chalk.green('✅ Project created successfully!'));

    console.log(chalk.blue('\n📝 Next steps:\n'));
    console.log(`  cd ${answers.projectName || projectName}`);
    if (answers.includeDocker) {
      console.log(`  docker-compose up -d`);
    }
    console.log(`  pnpm dev\n`);

    console.log(chalk.gray('Happy coding! 🎉\n'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to create project'));
    console.error(error);
  }
}
