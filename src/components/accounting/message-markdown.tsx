import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

type MessageMarkdownProps = {
  content: string
  inverted?: boolean
}

export function MessageMarkdown({ content, inverted }: MessageMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ className, ...props }) => (
          <a
            className={cn(
              "font-medium underline underline-offset-2",
              inverted ? "text-primary-foreground" : "text-foreground",
              className
            )}
            rel="noreferrer"
            target="_blank"
            {...props}
          />
        ),
        h1: ({ className, ...props }) => (
          <p
            className={cn("font-semibold leading-relaxed", className)}
            {...props}
          />
        ),
        h2: ({ className, ...props }) => (
          <p
            className={cn("font-semibold leading-relaxed", className)}
            {...props}
          />
        ),
        h3: ({ className, ...props }) => (
          <p
            className={cn("font-semibold leading-relaxed", className)}
            {...props}
          />
        ),
        li: ({ className, ...props }) => (
          <li className={cn("pl-1 leading-relaxed", className)} {...props} />
        ),
        ol: ({ className, ...props }) => (
          <ol
            className={cn("my-2 list-decimal space-y-1 pl-5", className)}
            {...props}
          />
        ),
        p: ({ className, ...props }) => (
          <p
            className={cn("leading-relaxed not-first:mt-2", className)}
            {...props}
          />
        ),
        strong: ({ className, ...props }) => (
          <strong className={cn("font-semibold", className)} {...props} />
        ),
        ul: ({ className, ...props }) => (
          <ul
            className={cn("my-2 list-disc space-y-1 pl-5", className)}
            {...props}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
