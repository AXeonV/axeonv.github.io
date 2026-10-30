import assert from 'node:assert/strict';
import { test } from 'node:test';
import { markdownToHtml } from 'satteri';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { satteriKatex } from 'satteri-katex';

const options = { features: { math: true }, mdastPlugins: [satteriKatex()] };
const publicProcessor = await createSatteriMarkdownProcessor(options);
const renderers = {
 public: async source => (await publicProcessor.render(source)).code,
 private: source => markdownToHtml(source, {
  ...options,
  mdastPlugins: [
   { name: 'literal-html', html(node, ctx) { ctx.replaceNode(node, { type: 'text', value: node.value }); } },
   satteriKatex(),
  ],
 }).html,
};

for (const [name, render] of Object.entries(renderers)) {
 test(`${name}: musical accidentals render as inline math`, async () => {
  const html = await render(String.raw`$\flat 3 \sim \sharp 4$ 和 $\flat 6 \sim 7$`);
  assert.equal((html.match(/class="katex"/g) ?? []).length, 2);
  assert.ok(html.includes('♭') && html.includes('♯') && html.includes('∼'));
  assert.ok(!html.includes('katex-error') && !html.includes('math-inline'));
 });
 test(`${name}: display math renders outside code blocks`, async () => {
  const html = await render('$$\n\\frac{1}{2} + x^2\n$$');
  assert.ok(html.includes('class="katex-display"'));
  assert.ok(!html.includes('<pre') && !html.includes('katex-error'));
 });
 test(`${name}: code examples and escaped dollars stay literal`, async () => {
  const html = await render('`$x^2$`\n\n```text\n$y^2$\n```\n\n\\$5 and \\$10');
  assert.ok(!html.includes('class="katex"'));
  assert.ok(html.includes('$x^2$') && html.includes('$y^2$'));
 });
}

test('private: source HTML remains inert with math enabled', async () => {
 const html = await renderers.private('<script>alert(1)</script>\n\n$x^2$');
 assert.ok(!html.includes('<script>') && html.includes('&lt;script&gt;'));
 assert.ok(html.includes('class="katex"'));
});
