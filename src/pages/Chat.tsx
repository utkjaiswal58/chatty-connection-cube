
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import ChatContainer from "@/components/ChatContainer";
import VideoDisplay from "@/components/VideoDisplay";
import Button from "@/components/Button";
import Loading from "@/components/Loading";
import useChat from "@/hooks/useChat";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const Chat = () => {
  const { 
    isConnecting, 
    isConnected,
    isSearching, 
    isTyping, 
    userId,
    peerId,
    messages, 
    sendMessage, 
    connect, 
    disconnect,
    mediaState,
    mediaEnabled,
    toggleMedia
  } = useChat();

  const [specificUserId, setSpecificUserId] = useState("");
  const [showDirectConnect, setShowDirectConnect] = useState(false);

  const handleConnectToUser = () => {
    if (!specificUserId.trim()) {
      toast({
        title: "Invalid User ID",
        description: "Please enter a valid User ID to connect",
        variant: "destructive"
      });
      return;
    }
    
    connect(specificUserId);
    setShowDirectConnect(false);
  };

  const handleDisconnect = () => {
    disconnect();
    setSpecificUserId("");
  };

  const getStatusMessage = () => {
    if (isConnected) return `You (${userId}) are connected to ${peerId || "another user"}.`;
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
            {!isConnected && !isSearching && !isConnecting && (
              <p className="text-sm text-muted-foreground mt-2">
                Your User ID: <span className="font-medium">{userId}</span> (share this with others to let them connect with you)
              </p>
            )}
          </div>
          
          {isConnecting ? (
            <div className="h-[500px] flex items-center justify-center">
              <Loading />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video display - increased gap and adjusted height for better laptop view */}
              <VideoDisplay 
                localStream={mediaState.localStream}
                remoteStream={mediaState.remoteStream}
                isConnected={isConnected}
                isSearching={isSearching}
                userId={userId}
                peerId={peerId}
                mediaEnabled={mediaEnabled}
                onToggleMedia={toggleMedia}
                className="aspect-video h-[300px] md:h-[400px] lg:h-auto"
              />
              
              {/* Chat container - adjusted height for better laptop view */}
              <ChatContainer
                messages={messages}
                onSendMessage={sendMessage}
                onDisconnect={handleDisconnect}
                isConnected={isConnected}
                isTyping={isTyping}
                userId={userId}
                peerId={peerId}
                className="h-[300px] md:h-[400px] lg:h-auto"
              />
            </div>
          )}
          
          <div className="mt-6 text-center">
            {!isConnected && !isSearching && !isConnecting && (
              <div className="mb-4">
                {showDirectConnect ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
                    <Input
                      placeholder="Enter User ID to connect with"
                      value={specificUserId}
                      onChange={(e) => setSpecificUserId(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleConnectToUser}
                        size="sm"
                      >
                        Connect
                      </Button>
                      <Button 
                        onClick={() => setShowDirectConnect(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row justify-center gap-3 mb-2">
                    <Button onClick={() => connect()}>Find Random User</Button>
                    <Button 
                      onClick={() => setShowDirectConnect(true)}
                      variant="outline"
                    >
                      Connect to Specific User
                    </Button>
                  </div>
                )}
              </div>
            )}

            {(isConnected || isSearching) && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {isConnected 
                    ? "To end this conversation and find a new one, click the button below." 
                    : "Still looking for someone to chat with. You can cancel the search below."}
                </p>
                <Button
                  onClick={handleDisconnect}
                  variant="destructive"
                  className="min-w-40"
                >
                  {isConnected ? "End Chat" : "Cancel Search"}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Chat;
