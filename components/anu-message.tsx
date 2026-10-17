"use client";

import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AnuMessage({ text, fresh }: { text: string; fresh: boolean }) {
  let wordIndex = 0;
  // Animate text leaves so Markdown keeps its semantic structure and links.
  function reveal(children: ReactNode): ReactNode {
    if (!fresh) return children;
    return Children.map(children, (child) => {
      if (typeof child === "string") return child.split(/(\s+)/).map((token, index) =>
        /\s/.test(token) ? token : <span key={index} className="reply-word" style={{ animationDelay: `${Math.min(wordIndex++ * 18, 1400)}ms` }}>{token}</span>);
      if (isValidElement<{ children?: ReactNode }>(child) && typeof child.type === "string" && ["strong", "em", "a", "del"].includes(child.type)) {
        return cloneElement(child, {}, reveal(child.props.children));
      }
      return child;
    });
  }
  return <div className="message-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    p: ({ children }) => <p>{reveal(children)}</p>,
    li: ({ children }) => <li>{reveal(children)}</li>,
    h1: ({ children }) => <h3>{reveal(children)}</h3>,
    h2: ({ children }) => <h3>{reveal(children)}</h3>,
    h3: ({ children }) => <h3>{reveal(children)}</h3>,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    table: ({ children }) => <div className="message-table"><table>{children}</table></div>,
  }}>{text}</ReactMarkdown></div>;
}
