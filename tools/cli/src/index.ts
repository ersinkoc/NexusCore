#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createProject } from './commands/create';

const program = new Command();

program
  .name('create-nexuscore')
  .description('Create a new NexusCore project')
  .version('1.0.0');

program
  .command('create [project-name]')
  .description('Create a new NexusCore project')
  .action(async (projectName?: string) => {
    console.log(chalk.blue.bold('\n🚀 Welcome to NexusCore CLI!\n'));
    await createProject(projectName);
  });

// Default action
program.action(async () => {
  console.log(chalk.blue.bold('\n🚀 Welcome to NexusCore CLI!\n'));
  await createProject();
});

program.parse(process.argv);
