import Link from "next/link";
import { splitChatText } from "@/lib/chat-message";

export function ChatMessageText({ text }: { text: string }) {
  const segments = splitChatText(text);
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "link") {
          if (segment.href.startsWith("/")) {
            return (
              <Link key={index} href={segment.href} className="underline">
                {segment.text}
              </Link>
            );
          }
          return (
            <a
              key={index}
              href={segment.href}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {segment.text}
            </a>
          );
        }
        return <span key={index}>{segment.text}</span>;
      })}
    </>
  );
}
