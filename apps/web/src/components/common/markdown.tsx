import DOMPurify from "dompurify";
import { marked } from "marked";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Points artifact:ART-XXXXX links (images of a source) at the project's artifact route. */
const linkArtifacts = (text: string, projectKey?: string) => (projectKey ? text.replace(/\]\(artifact:([A-Z0-9-]+)\)/g, `](/api/projects/${projectKey}/artifacts/$1)`) : text);

/** Renders requester text as Markdown in the browser; the server sends the plain text first. */
export function Markdown({ text, className, projectKey }: { text: string; className?: string; projectKey?: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    setHtml(DOMPurify.sanitize(marked.parse(linkArtifacts(text, projectKey), { async: false })));
  }, [text, projectKey]);
  const base = cn("prose-lastro text-[13.5px] leading-relaxed", className);
  if (html === null) return <div className={cn(base, "whitespace-pre-wrap")}>{text}</div>;
  return <div className={base} dangerouslySetInnerHTML={{ __html: html }} />;
}
