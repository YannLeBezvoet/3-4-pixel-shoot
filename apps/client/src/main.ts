// Client entry point (composition root).
import { signal } from '@preact/signals';
import { IssueCollector, formatIssues, parseGpl } from '@pixel-shoot/content';
import paletteText from '../../../palette/resurrect-64.gpl?raw';
import { fetchFileProvider, loadContentIndex } from './content/fetch-files';
import { createTranslator } from './i18n/translator';
import { createRenderer } from './render/renderer';
import { createTestPattern } from './render/test-pattern';
import { mountUi } from './ui/mount';
import './style.css';

const host = document.getElementById('game');
if (!host) throw new Error('Missing #game element in index.html.');

const files = fetchFileProvider();
const issues = new IssueCollector();
const index = await loadContentIndex(files, issues);
const translator = await createTranslator(files, index, issues);
if (issues.issues.length > 0) console.warn(formatIssues(issues.issues));

const renderer = await createRenderer(host);
const layout = signal(renderer.layout());
renderer.onLayout((next) => (layout.value = next));
if (import.meta.env.DEV) renderer.app.stage.addChild(createTestPattern(parseGpl(paletteText)));

mountUi({ host, layout, translator, devPages: [] });
