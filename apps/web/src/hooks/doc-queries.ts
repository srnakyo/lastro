import { queryOptions } from "@tanstack/react-query";
import type { DocumentId } from "@lastro/docs";
import { listDocs, readDoc } from "@/fns/docs";

export const docsQuery = (key: string) => queryOptions({ queryKey: ["project", key, "docs"], queryFn: () => listDocs({ data: { key } }) });
export const docQuery = (key: string, document: DocumentId) => queryOptions({ queryKey: ["project", key, "doc", document], queryFn: () => readDoc({ data: { key, document } }) });
