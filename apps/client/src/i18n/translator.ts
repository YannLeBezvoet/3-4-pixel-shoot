// Translations (decision 0009). Interface texts come from locales/<language>.json; each theme
// adds its texts under the namespace "theme.<id>". Components read `current`, so changing the
// language re-renders them.
import type { ReadonlySignal } from '@preact/signals';
import { signal } from '@preact/signals';
import type {
  ContentIndex,
  FileProvider,
  IssueCollector,
  Locale,
  Theme,
} from '@pixel-shoot/content';
import { joinPath, parseLocale } from '@pixel-shoot/content';
import { createInstance } from 'i18next';
import { pickLanguage } from './pick-language';

export interface Language {
  readonly code: string;
  /** The language's own name, e.g. "Français". */
  readonly name: string;
}

export type TextParams = Readonly<Record<string, string | number>>;

export interface Translator {
  readonly languages: ReadonlySignal<readonly Language[]>;
  readonly current: ReadonlySignal<string>;
  /** An interface text. */
  t(key: string, params?: TextParams): string;
  /** A theme text, falling back to the theme's default language. */
  themeText(theme: Pick<Theme, 'id' | 'defaultLanguage'>, key: string, params?: TextParams): string;
  setLanguage(code: string): void;
  /** Adds or replaces a theme's texts (also used by hot reload). */
  addTheme(theme: Theme): void;
  /** Reloads the interface languages, e.g. after a locale file changed or was added. */
  reload(index: ContentIndex, issues: IssueCollector): Promise<void>;
}

const STORAGE_KEY = 'pixel-shoot.language';
const UI_NAMESPACE = 'ui';

function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function save(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private windows may refuse storage; the choice then lasts until the page closes.
  }
}

const asResources = (locale: Locale) => Object.fromEntries(locale.strings);

async function loadInterfaceLocales(
  files: FileProvider,
  index: ContentIndex,
  issues: IssueCollector,
) {
  const loaded: { code: string; locale: Locale }[] = [];
  for (const code of index.languages) {
    const file = joinPath('locales', `${code}.json`);
    const text = await files.readText(file);
    if (text === undefined) continue;
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (error) {
      issues.error(file, '', `Invalid JSON: ${(error as Error).message}`);
      continue;
    }
    const locale = parseLocale(json, file, issues, { requireMeta: true });
    if (locale) loaded.push({ code, locale });
  }
  return loaded;
}

/** Creates the translator; languages are loaded by `reload` (the content store calls it). */
export async function createTranslator(files: FileProvider): Promise<Translator> {
  const i18n = createInstance();
  await i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    ns: [UI_NAMESPACE],
    defaultNS: UI_NAMESPACE,
    keySeparator: false,
    nsSeparator: false,
    // Preact escapes text itself; canvas text needs no escaping.
    interpolation: { escapeValue: false },
    resources: {},
  });
  const languages = signal<readonly Language[]>([]);
  const current = signal('en');
  // Bumped when texts change without the language changing (theme added, file reloaded).
  const revision = signal(0);
  let initialized = false;

  const translator: Translator = {
    languages,
    current,
    t(key, params) {
      void revision.value;
      return i18n.t(key, { ...params, lng: current.value, ns: UI_NAMESPACE });
    },
    themeText(theme, key, params) {
      void revision.value;
      return i18n.t(key, {
        ...params,
        ns: `theme.${theme.id}`,
        lngs: [current.value, theme.defaultLanguage],
      });
    },
    setLanguage(code) {
      if (!languages.value.some((l) => l.code === code)) return;
      save(code);
      document.documentElement.lang = code;
      current.value = code;
    },
    addTheme(theme) {
      for (const [code, locale] of theme.translations) {
        i18n.addResourceBundle(code, `theme.${theme.id}`, asResources(locale), false, true);
      }
      revision.value++;
    },
    async reload(nextIndex, nextIssues) {
      const loaded = await loadInterfaceLocales(files, nextIndex, nextIssues);
      for (const { code, locale } of loaded)
        i18n.addResourceBundle(code, UI_NAMESPACE, asResources(locale), false, true);
      languages.value = loaded.map(({ code, locale }) => ({
        code,
        name: locale.meta?.name ?? code,
      }));
      // First load: saved choice or browser languages. Later reloads keep the current language.
      const preferred = readSaved() ?? (initialized ? current.value : null);
      const code = pickLanguage(
        loaded.map((l) => l.code),
        preferred,
        navigator.languages,
      );
      initialized = true;
      document.documentElement.lang = code;
      current.value = code;
      revision.value++;
    },
  };
  return translator;
}
