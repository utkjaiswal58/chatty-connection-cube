
import { useEffect } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import ChatContainer from "@/components/ChatContainer";
import VideoDisplay from "@/components/VideoDisplay";
import Button from "@/components/Button";
import Loading from "@/components/Loading";
import useChat from "@/hooks/useChat";

const Chat = () => {
  const { 
    isConnecting, 
    isConnected, 
    isTyping, 
    messages, 
    sendMessage, 
    connect, 
    disconnect,
    mediaState,
    mediaEnabled,
    toggleMedia
  } = useChat();

  useEffect(() => {
    // Auto-connect when the page loads
    if (!isConnected && !isConnecting) {
      connect();
    }
  }, [isConnected, isConnecting, connect]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4 pt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-5xl mx-auto"
        >
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Video Chat</h1>
            <p className="text-muted-foreground">
              You are {isConnected ? "connected" : "not connected"} to a random stranger.
            </p>
          </div>
          
          {isConnecting ? (
            <div className="h-[500px] flex items-center justify-center">
              <Loading />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Video display */}
              <VideoDisplay 
                localStream={mediaState.localStream}
                remoteStream={mediaState.remoteStream}
                isConnected={isConnected}
                mediaEnabled={mediaEnabled}
                onToggleMedia={toggleMedia}
                className="aspect-video h-[300px] md:h-[400px]"
              />
              
              {/* Chat container */}
              <ChatContainer
                messages={messages}
                onSendMessage={sendMessage}
                onDisconnect={disconnect}
                isConnected={isConnected}
                isTyping={isTyping}
                className="h-[300px] md:h-[400px]"
              />
            </div>
          )}
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {isConnected 
                ? "To end this conversation and start a new one, click the button below." 
                : "Click the button below to start a new conversation."}
            </p>
            <Button
              onClick={disconnect}
              variant={isConnected ? "destructive" : "default"}
              className="min-w-40"
              isLoading={isConnecting}
            >
              {isConnected ? "End Chat" : "New Chat"}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Chat;
