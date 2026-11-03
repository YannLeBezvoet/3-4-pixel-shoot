import { useTranslator } from './translator-context';

/** Lists the interface languages by their own names; adding a locale file adds an entry. */
export function LanguageMenu() {
  const translator = useTranslator();
  return (
    <fieldset class="language-menu">
      <legend>{translator.t('settings.language')}</legend>
      {translator.languages.value.map((language) => (
        <button
          type="button"
          key={language.code}
          lang={language.code}
          aria-pressed={language.code === translator.current.value}
          onClick={() => translator.setLanguage(language.code)}
        >
          {language.name}
        </button>
      ))}
    </fieldset>
  );
}
