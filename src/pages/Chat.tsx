
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
    isSearching, 
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
    if (!isConnected && !isConnecting && !isSearching) {
      connect();
    }
  }, [isConnected, isConnecting, isSearching, connect]);

  const getStatusMessage = () => {
    if (isConnected) return "You are connected to another user.";
    if (isSearching) return "Searching for users...";
    if (isConnecting) return "Initializing connection...";
    return "You are not connected. Click below to start.";
  };

  const getButtonText = () => {
    if (isConnected) return "End Chat";
    if (isSearching) return "Cancel Search";
    if (isConnecting) return "Connecting...";
    return "New Chat";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4 pt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-6xl mx-auto"
        >
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Video Chat</h1>
            <p className="text-muted-foreground">
              {getStatusMessage()}
            </p>
          </div>
          
          {isConnecting ? (
            <div className="h-[500px] flex items-center justify-center">
              <Loading />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Video display - increased gap and adjusted height for better laptop view */}
              <VideoDisplay 
                localStream={mediaState.localStream}
                remoteStream={mediaState.remoteStream}
                isConnected={isConnected}
                isSearching={isSearching}
                mediaEnabled={mediaEnabled}
                onToggleMedia={toggleMedia}
                className="aspect-video h-[300px] md:h-auto lg:h-[450px]"
              />
              
              {/* Chat container - adjusted height for better laptop view */}
              <ChatContainer
                messages={messages}
                onSendMessage={sendMessage}
                onDisconnect={disconnect}
                isConnected={isConnected}
                isTyping={isTyping}
                className="h-[300px] md:h-auto lg:h-[450px]"
              />
            </div>
          )}
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {isConnected 
                ? "To end this conversation and find a new one, click the button below." 
                : isSearching
                  ? "Still looking for someone to chat with. You can cancel the search below."
                  : "Click the button below to start looking for someone to chat with."}
            </p>
            <Button
              onClick={disconnect}
              variant={isConnected || isSearching ? "destructive" : "default"}
              className="min-w-40"
              isLoading={isConnecting}
            >
              {getButtonText()}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Chat;
