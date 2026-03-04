const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, opts = {}) {
  return execSync(cmd, Object.assign({ stdio: 'inherit' }, opts));
}

function rmrf(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.lstatSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      rmrf(path.join(target, entry));
    }
    fs.rmdirSync(target);
  } else {
    fs.unlinkSync(target);
  }
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.lstatSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  const repoRoot = execSync('git rev-parse --show-toplevel').toString().trim();
  const projectRoot = path.resolve(__dirname, '..');
  const distDir = path.join(projectRoot, 'dist');
  if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory not found. Run the build first.');
    process.exit(1);
  }

  const ghDir = path.join(repoRoot, '.gh-pages');

  // Create or reset the worktree at .gh-pages
  if (!fs.existsSync(ghDir) || !fs.existsSync(path.join(ghDir, '.git'))) {
    console.log('Creating git worktree for gh-pages...');
    run(`git worktree add -B gh-pages "${ghDir}"` , { cwd: repoRoot });
  }

  // Remove everything except .git inside .gh-pages
  for (const item of fs.readdirSync(ghDir)) {
    if (item === '.git') continue;
    rmrf(path.join(ghDir, item));
  }

  // Copy dist contents into .gh-pages
  copyRecursive(distDir, ghDir);

  // Commit & push if changes
  run('git add --all', { cwd: ghDir });
  const status = execSync('git status --porcelain', { cwd: ghDir }).toString().trim();
  if (status) {
    run('git commit -m "Deploy site"', { cwd: ghDir });
    run('git push origin gh-pages --force', { cwd: ghDir });
    console.log('Deployed to origin/gh-pages');
  } else {
    console.log('No changes to deploy');
  }
} catch (err) {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
}
