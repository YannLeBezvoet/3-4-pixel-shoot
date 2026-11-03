// Client entry point (composition root).
import { parseGpl } from '@pixel-shoot/content';
import paletteText from '../../../palette/resurrect-64.gpl?raw';
import { createRenderer } from './render/renderer';
import { createTestPattern } from './render/test-pattern';
import './style.css';

const host = document.getElementById('game');
if (!host) throw new Error('Missing #game element in index.html.');

const renderer = await createRenderer(host);
if (import.meta.env.DEV) renderer.app.stage.addChild(createTestPattern(parseGpl(paletteText)));
