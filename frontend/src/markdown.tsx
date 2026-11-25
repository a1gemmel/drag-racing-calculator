import { Fragment, type ReactNode } from "react";

/**
 * Minimal Markdown renderer for CHANGELOG.md: # / ## / ### headings, paragraphs, "- " bullet lists
 * (indented lines continue the item), [links](https://…), `code` and **bold**. Builds React elements
 * (no HTML strings), so nothing in the file can inject markup. Anything else renders as plain text.
 */
export function renderMarkdown(text: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={blocks.length}>{renderInline(paragraph.join(" "))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={blocks.length}>
          {list.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
    }
    list = [];
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const content = renderInline(heading[2]);
      blocks.push(
        level === 1 ? <h1 key={blocks.length}>{content}</h1> : level === 2 ? <h2 key={blocks.length}>{content}</h2> : <h3 key={blocks.length}>{content}</h3>,
      );
    } else if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
    } else if (line.trim() === "") {
      flushParagraph();
      flushList();
    } else if (list.length && /^\s+/.test(line)) {
      list[list.length - 1] += ` ${line.trim()}`;
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

const INLINE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g;

/** Links (http/https only), `code` and **bold** inside a line of text. */
export function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const [, linkText, href, code, bold] = match;
    const key = parts.length;
    if (href) {
      parts.push(
        <a key={key} href={href} target="_blank" rel="noreferrer">
          {linkText}
        </a>,
      );
    } else if (code) {
      parts.push(<code key={key}>{code}</code>);
    } else {
      parts.push(<strong key={key}>{bold}</strong>);
    }
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <Fragment>{parts}</Fragment>;
}
