import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import App from '../src/App.tsx';

const template = await readFile('dist/index.html', 'utf8');
const outlet = '<div id="root"></div>';
assert.ok(template.includes(outlet), 'Vite HTML must contain the React root placeholder.');
const pages = [
  { path: '/', file: 'index.html', title: 'Kalash Code — Your code. Your models. Your control.', text: 'An AI coding agent that works where you do.' },
  { path: '/docs', file: 'docs.html', title: 'Developer guide — Kalash Code', text: 'Prepare your environment' },
  { path: '/signin', file: 'signin.html', title: 'Sign in — Kalash Code', text: 'Welcome back.' },
  { path: '/signup', file: 'signup.html', title: 'Create your account — Kalash Code', text: 'Create your account.' },
  { path: '/workspace', file: 'workspace.html', title: 'Your workspace — Kalash Code', text: 'Your workspace awaits.' },
];
for (const page of pages) {
  const content = renderToString(createElement<{ pathname?: string }>(App, { pathname: page.path }));
  assert.ok(content.includes(page.text), `${page.path} must include its page content without JavaScript.`);
  const html = template.replace(outlet, `<div id="root" data-page="${page.path}">${content}</div>`)
    .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`);
  await writeFile(`dist/${page.file}`, html);
  console.log(`Prerendered ${page.path}: ${content.length} characters of HTML`);
}
