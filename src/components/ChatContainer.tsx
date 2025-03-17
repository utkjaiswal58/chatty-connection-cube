
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import ChatMessage from "./ChatMessage";
import Button from "./Button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface ChatContainerProps {
  messages: { content: string; isUser: boolean; timestamp: Date }[];
  onSendMessage: (message: string) => void;
  onDisconnect: () => void;
  isConnected: boolean;
  isTyping?: boolean;
  className?: string;
}

const ChatContainer = ({ 
  messages, 
  onSendMessage, 
  onDisconnect,
  isConnected,
  isTyping = false,
  className 
}: ChatContainerProps) => {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && isConnected) {
      onSendMessage(message);
      setMessage("");
    } else if (!isConnected) {
      toast({
        title: "Not connected",
        description: "You need to be connected to send messages.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Auto-focus input when connected
    if (isConnected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isConnected]);

  return (
    <div className={cn("flex flex-col h-full w-full overflow-hidden rounded-lg border glass", className)}>
      {/* Chat header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative mr-2">
            <div className="size-3 rounded-full bg-primary"></div>
            {isConnected && (
              <div className="absolute -inset-1 rounded-full border border-primary animate-pulse-soft"></div>
            )}
          </div>
          <span className="font-medium">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDisconnect}
          className="text-sm"
        >
          {isConnected ? "Disconnect" : "Find New Chat"}
        </Button>
      </div>

      {/* Chat messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-center p-4">
            <p>No messages yet. Say hello to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <ChatMessage
              key={i}
              content={msg.content}
              isUser={msg.isUser}
              timestamp={msg.timestamp}
            />
          ))
        )}
        
        {isTyping && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2 px-4 py-2 w-max rounded-2xl bg-secondary"
          >
            <div className="flex space-x-1">
              <div className="size-2 bg-secondary-foreground/60 rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></div>
              <div className="size-2 bg-secondary-foreground/60 rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></div>
              <div className="size-2 bg-secondary-foreground/60 rounded-full animate-pulse" style={{ animationDelay: "600ms" }}></div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Chat input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={!isConnected}
          />
          <Button 
            type="submit" 
            size="sm"
            disabled={!message.trim() || !isConnected}
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatContainer;
