
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatMessage = ({ content, isUser, timestamp }: ChatMessageProps) => {
  const messageRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [content]);

  return (
    <motion.div
      ref={messageRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full mb-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] md:max-w-[70%] px-4 py-2 rounded-2xl",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-none"
            : "bg-secondary text-secondary-foreground rounded-tl-none"
        )}
      >
        <p className="text-sm md:text-base">{content}</p>
        <div className="flex justify-end mt-1">
          <time className="text-xs opacity-70">
            {timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;
