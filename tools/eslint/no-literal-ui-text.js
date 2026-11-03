// ESLint rule: displayed text in interface components must come from translation keys
// (decision 0009). Reports letters written directly as JSX text, as a string expression
// child, or in attributes that are shown to the player.

const DISPLAYED_ATTRIBUTES = new Set([
  'title',
  'alt',
  'placeholder',
  'aria-label',
  'aria-description',
  'label',
]);
const HAS_LETTER = /\p{L}/u;

const message = 'Displayed text must come from a translation key (t("…")), not a literal string.';

/** @type {import('eslint').Rule.RuleModule} */
export const noLiteralUiText = {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid literal displayed text in interface components.' },
    schema: [],
  },
  create(context) {
    const report = (node) => context.report({ node, message });
    const isLiteralText = (node) =>
      (node.type === 'Literal' && typeof node.value === 'string' && HAS_LETTER.test(node.value)) ||
      (node.type === 'TemplateLiteral' &&
        node.quasis.some((q) => HAS_LETTER.test(q.value.cooked ?? '')));
    return {
      JSXText(node) {
        if (HAS_LETTER.test(node.value)) report(node);
      },
      JSXExpressionContainer(node) {
        if (node.parent?.type !== 'JSXAttribute' && isLiteralText(node.expression)) report(node);
      },
      JSXAttribute(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : '';
        if (!DISPLAYED_ATTRIBUTES.has(name) || !node.value) return;
        const value =
          node.value.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
        if (isLiteralText(value)) report(node);
      },
    };
  },
};

export default { rules: { 'no-literal-ui-text': noLiteralUiText } };
