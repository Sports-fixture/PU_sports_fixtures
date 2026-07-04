const fs = require('fs');
const path = require('path');

const root = __dirname;
const outfile = path.join(root, 'CODE_SUMMARY.md');

let summary = '# Project Code Summary\n\n';

const ignoreList = ['node_modules', '.git', 'build', 'dist', 'package-lock.json', 'scratch'];
const includeExts = ['.js', '.jsx', '.css', '.json'];

function walk(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (ignoreList.includes(file)) continue;
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walk(filepath, filelist);
    } else {
      if (includeExts.includes(path.extname(file))) {
        filelist.push(filepath);
      }
    }
  }
  return filelist;
}

const backendFiles = walk(path.join(root, 'backend')).filter(f => !f.includes('package-lock.json'));
const frontendFiles = walk(path.join(root, 'frontend', 'src'));
const packageJsonFrontend = path.join(root, 'frontend', 'package.json');
const allFiles = [...backendFiles, ...frontendFiles, packageJsonFrontend];

for (const f of allFiles) {
  if (!fs.existsSync(f)) continue;
  const relPath = path.relative(root, f).replace(/\\/g, '/');
  let content = fs.readFileSync(f, 'utf8');
  let lang = path.extname(f).slice(1);
  if (lang === 'js' || lang === 'jsx') lang = 'javascript';
  summary += `## File: ${relPath}\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
}

fs.writeFileSync(outfile, summary);
console.log('CODE_SUMMARY.md updated successfully.');
