
import { useEffect, useRef, useState } from "react";
import { Send, User } from "lucide-react";
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
  userId: string;
  peerId: string | null;
  className?: string;
}

const ChatContainer = ({ 
  messages, 
  onSendMessage, 
  onDisconnect,
  isConnected,
  isTyping = false,
  userId,
  peerId,
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

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className={cn("flex flex-col h-full w-full overflow-hidden rounded-lg border glass", className)}>
      {/* Chat header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative mr-2">
            <div className={cn("size-3 rounded-full", isConnected ? "bg-primary animate-pulse" : "bg-muted")}></div>
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            {isConnected && peerId && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User size={10} /> {peerId}
              </span>
            )}
          </div>
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
              userName={msg.isUser ? userId : (peerId || "Unknown")}
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
            placeholder={isConnected ? "Type a message..." : "Connect to start chatting"}
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
