
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
import { Share, UserPlus } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

  const copyUserIdToClipboard = () => {
    navigator.clipboard.writeText(userId)
      .then(() => {
        toast({
          title: "User ID Copied",
          description: "Your User ID has been copied to clipboard",
        });
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          title: "Failed to copy",
          description: "Could not copy ID to clipboard",
          variant: "destructive"
        });
      });
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
            <h1 className="text-3xl font-bold tracking-tight mb-2">WebRTC Video Chat</h1>
            <p className="text-muted-foreground">
              {getStatusMessage()}
            </p>
            {!isConnected && !isSearching && !isConnecting && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Your User ID: <span className="font-medium">{userId}</span>
                  </p>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0" 
                    onClick={copyUserIdToClipboard}
                  >
                    <Share className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  (Share this with others to let them connect with you)
                </p>
              </div>
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
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                      <Button 
                        onClick={() => connect()}
                        className="flex items-center gap-2"
                      >
                        Find Random User
                      </Button>
                      <Button 
                        onClick={() => setShowDirectConnect(true)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <UserPlus size={16} />
                        Connect to Specific User
                      </Button>
                    </div>
                    
                    <div className="text-center">
                      <Separator className="my-4" />
                      <p className="text-sm text-muted-foreground mb-2">
                        This chat uses WebRTC for secure peer-to-peer connections.
                        <br />
                        Your video and audio stay private between you and the person you're chatting with.
                      </p>
                    </div>
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
