import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'src', 'content', 'picks');

function listFiles() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));
}

function readJson(file) {
  const full = path.join(DIR, file);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

export function getPickSlugs() {
  return listFiles().map(f => f.replace(/\.json$/, ''));
}

export function getPick(slug) {
  const raw = readJson(`${slug}.json`);
  if (!raw) return null;
  return { ...raw, slug };
}

export function getAllPicks() {
  return listFiles()
    .map(f => {
      const slug = f.replace(/\.json$/, '');
      const raw = readJson(f);
      return raw ? { ...raw, slug } : null;
    })
    .filter(Boolean);
}
