#!/usr/bin/env node

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

const TEMPLATES = ['blog', 'marketing', 'wordpress', 'drupal', 'college'];

function parseArgs() {
  const args = process.argv.slice(2);
  let name = '';
  let template = '';
  for (const arg of args) {
    if (arg.startsWith('--template=')) template = arg.split('=')[1];
    else if (arg.startsWith('--template')) template = args[args.indexOf(arg) + 1] || '';
    else if (!arg.startsWith('-')) name = name || arg;
  }
  return { name, template };
}

async function main() {
  console.log('\n  🚀 Create WollyCMS Project\n');

  const parsed = parseArgs();
  const projectName = parsed.name || await ask('  Project name: ');
  if (!projectName) {
    console.error('  Project name is required.');
    process.exit(1);
  }

  const projectDir = resolve(projectName);
  if (existsSync(projectDir)) {
    console.error(`  Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  const siteName = await ask(`  Site name [${projectName}]: `) || projectName;
  const port = await ask('  API port [4321]: ') || '4321';

  let template = parsed.template;
  if (!template) {
    console.log(`\n  Available templates: ${TEMPLATES.join(', ')}`);
    template = await ask('  Template (or press Enter to skip): ') || '';
  }
  if (template && !TEMPLATES.includes(template)) {
    console.error(`  Unknown template: "${template}". Available: ${TEMPLATES.join(', ')}`);
    process.exit(1);
  }

  rl.close();

  console.log(`\n  Creating project in ${projectDir}...\n`);

  // Create project structure
  mkdirSync(join(projectDir, 'data'), { recursive: true });
  mkdirSync(join(projectDir, 'uploads'), { recursive: true });

  const jwtSecret = randomBytes(32).toString('hex');

  // package.json
  writeFileSync(join(projectDir, 'package.json'), JSON.stringify({
    name: projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'wolly start',
      migrate: 'wolly migrate',
      seed: 'wolly seed',
      export: 'wolly export',
      'types:generate': 'wolly types generate',
    },
    dependencies: {
      '@wollycms/server': '^0.1.0',
    },
  }, null, 2) + '\n');

  // .env
  writeFileSync(join(projectDir, '.env'), `# WollyCMS Configuration
DATABASE_URL=sqlite:./data/wolly.db
PORT=${port}
HOST=localhost
JWT_SECRET=${jwtSecret}
MEDIA_DIR=./uploads
SITE_URL=http://localhost:4322
CORS_ORIGINS=*
NODE_ENV=development
`);

  // .env.example
  writeFileSync(join(projectDir, '.env.example'), `# WollyCMS Configuration
DATABASE_URL=sqlite:./data/wolly.db
PORT=4321
HOST=localhost
JWT_SECRET=change-me-to-a-random-secret
MEDIA_DIR=./uploads
SITE_URL=http://localhost:4322
CORS_ORIGINS=*
NODE_ENV=development
`);

  // .gitignore
  writeFileSync(join(projectDir, '.gitignore'), `.env
.env.*
!.env.example
node_modules/
data/
uploads/
*.log
.DS_Store
wolly-types.d.ts
`);

  // docker-compose.yml
  writeFileSync(join(projectDir, 'docker-compose.yml'), `services:
  wollycms:
    image: wollycms/server:latest
    ports:
      - "\${PORT:-4321}:4321"
    environment:
      - NODE_ENV=production
      - PORT=4321
      - HOST=0.0.0.0
      - DATABASE_URL=sqlite:./data/wolly.db
      - MEDIA_DIR=./uploads
      - JWT_SECRET=\${JWT_SECRET:?Set JWT_SECRET in .env}
      - CORS_ORIGINS=\${CORS_ORIGINS:-*}
      - SITE_URL=\${SITE_URL:-http://localhost:4322}
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    restart: unless-stopped
`);

  // README.md
  writeFileSync(join(projectDir, 'README.md'), `# ${siteName}

Powered by [WollyCMS](https://github.com/wollycms).

## Quick Start

\`\`\`bash
npm install
npm run migrate
npm run seed
npm run dev
\`\`\`

Open \`http://localhost:${port}\` for the API.
Default login: \`admin@wollycms.local\` / \`admin123\`

## Commands

| Command | Description |
|---|---|
| \`npm run dev\` | Start development server |
| \`npm run migrate\` | Run database migrations |
| \`npm run seed\` | Seed sample data |
| \`npm run export\` | Export all data as JSON |
| \`npm run types:generate\` | Generate TypeScript types from schemas |

## Docker

\`\`\`bash
docker compose up -d
\`\`\`

## Configuration

Edit \`.env\` to configure. See \`.env.example\` for all options.
`);

  // Copy template seed file if selected
  if (template) {
    try {
      const { fileURLToPath } = await import('url');
      const { dirname: dirn } = await import('path');
      const { copyFileSync } = await import('fs');
      // Try to find template seed.json relative to this script or in the installed package
      const scriptDir = dirn(fileURLToPath(import.meta.url));
      const possiblePaths = [
        join(scriptDir, '..', '..', '..', 'templates', template, 'seed.json'),
        join(scriptDir, '..', 'templates', template, 'seed.json'),
      ];
      let copied = false;
      for (const seedPath of possiblePaths) {
        if (existsSync(seedPath)) {
          copyFileSync(seedPath, join(projectDir, 'seed.json'));
          copied = true;
          break;
        }
      }
      if (!copied) {
        console.log(`  Template "${template}" seed file not found locally.`);
        console.log(`  Download it from: https://github.com/wollycms/wollycms/tree/main/templates/${template}/seed.json`);
      }
    } catch {
      console.log(`  Could not copy template seed file.`);
    }
  }

  console.log('  Created project files:');
  console.log('    package.json');
  console.log('    .env');
  console.log('    .env.example');
  console.log('    .gitignore');
  console.log('    docker-compose.yml');
  console.log('    README.md');
  if (template) console.log('    seed.json');
  console.log('');

  // Install dependencies
  console.log('  Installing dependencies...\n');
  try {
    execSync('npm install', { cwd: projectDir, stdio: 'inherit' });
  } catch {
    console.log('\n  npm install failed — run it manually after setup.');
  }

  const seedStep = template ? `    wolly import seed.json    # Import ${template} template content` : '    npm run seed              # Sample content';
  console.log(`
  ✅ Project created!${template ? ` (${template} template)` : ''}

  Next steps:
    cd ${projectName}
    npm run migrate
${seedStep}
    npm run dev

  Then open http://localhost:${port}
  Login: admin@wollycms.local / admin123
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
