import { Marked, type Tokens } from "marked";
import { DOC_CSS } from "./style";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeHref = (href: string) => (/^(https?:|mailto:|#|\/|\.\.?\/)/i.test(href) ? href : "#");

/** Markdown to HTML where raw HTML in requester text is shown as text and links stay http(s) or relative. */
const marked = new Marked({
  gfm: true,
  renderer: {
    html: (token: Tokens.HTML | Tokens.Tag) => escape(token.text),
    code: (token: Tokens.Code) => (token.lang === "mermaid" ? `<pre class="mermaid">${escape(token.text)}</pre>` : `<pre><code>${escape(token.text)}</code></pre>`),
    link(token: Tokens.Link) {
      return `<a href="${escape(safeHref(token.href))}">${this.parser.parseInline(token.tokens)}</a>`;
    },
    image: (token: Tokens.Image) => `<img src="${escape(safeHref(token.href))}" alt="${escape(token.text)}">`,
  },
});

/** A complete, self-contained HTML document for one generated Markdown document. */
export function toHtml(markdown: string, title: string, lang: string): string {
  const body = marked.parse(markdown, { async: false });
  return `<!doctype html>
<html lang="${escape(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>${DOC_CSS}</style>
</head>
<body><main><div class="brand"><i></i><b>lastro</b></div>${body}</main></body>
</html>`;
}
