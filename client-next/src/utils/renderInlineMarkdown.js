import React from 'react';

const TOKEN = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

const LINK_CLASS = "text-[var(--green)] font-semibold underline underline-offset-2 hover:text-[var(--green-dark)]";
const BOLD_CLASS = "font-sans font-bold not-italic";

function isSafeUrl(url) {
  if (url === '#') return true;
  return /^https?:\/\//i.test(url) || url.startsWith('/');
}

export function renderInlineMarkdown(text) {
  if (!text) return null;
  const parts = [];
  let last = 0;
  let key = 0;
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const label = m[1];
      const url = m[2];
      parts.push(
        isSafeUrl(url)
          ? React.createElement('a', {
              key: key++,
              href: url,
              target: '_blank',
              rel: 'sponsored noreferrer',
              className: LINK_CLASS,
            }, label)
          : label
      );
    } else if (m[3] !== undefined) {
      parts.push(
        React.createElement('strong', { key: key++, className: BOLD_CLASS }, m[3])
      );
    }
    last = TOKEN.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
