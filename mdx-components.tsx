import type { MDXComponents } from "mdx/types";

const components: MDXComponents = {
  blockquote: ({ children }) => (
    <blockquote className="not-italic border-l-4 border-accent bg-accent-soft rounded-r-lg px-4 py-3 my-6 text-ink [&>p]:m-0">
      {children}
    </blockquote>
  ),
  ol: ({ children }) => <ol className="step-list not-prose my-6">{children}</ol>,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
