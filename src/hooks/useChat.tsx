
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { CONNECT_DELAY, DISCONNECT_DELAY } from "./chat/constants";
import { cleanupResources, simulateUserSearch } from "./chat/chatUtils";
import { startLocalStream, stopMediaTracks, toggleMediaTrack } from "./chat/mediaUtils";
import { ChatState, Message, MediaEnabled, MediaStreamState } from "./chat/types";

// This is our main hook that coordinates the chat functionality
const useChat = () => {
  // State management
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userId] = useState(() => `user_${Math.random().toString(36).substring(2, 9)}`);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mediaState, setMediaState] = useState<MediaStreamState>({
    localStream: null,
    remoteStream: null,
  });
  const [mediaEnabled, setMediaEnabled] = useState<MediaEnabled>({
    video: true,
    audio: true,
  });
  
  // References for cleanup and timeout management
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const responseTimeoutRef = useRef<number | null>(null);

  // Function to handle sending a message
  const sendMessage = useCallback((content: string) => {
    // Add user message to the chat
    const newMessage = {
      content,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, newMessage]);

    // Only simulate typing if connected to someone
    if (isConnected) {
      setIsTyping(true);
      
      // In a real implementation, this would send the message via WebRTC data channel
      // For demo, we'll simulate the other user typing
      setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    }
  }, [isConnected]);

  // Toggle video or audio
  const toggleMedia = useCallback((type: 'video' | 'audio') => {
    setMediaEnabled(prev => {
      const newState = { ...prev, [type]: !prev[type] };
      
      // Update tracks in the local stream
      toggleMediaTrack(mediaState.localStream, type, newState[type]);
      
      return newState;
    });
  }, [mediaState.localStream]);

  // Simulate searching for another user (wrapper function)
  const continueSearch = useCallback(() => {
    simulateUserSearch(
      setIsSearching,
      setPeerId,
      setMediaState,
      setIsConnected,
      searchTimeoutRef,
      // Pass this function itself to allow recursive calling
      () => continueSearch()
    );
  }, []);

  // Function to connect to a new chat
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setMessages([]);
    setPeerId(null);
    
    try {
      // Start local media stream
      const stream = await startLocalStream(mediaEnabled);
      
      if (!stream) {
        setIsConnecting(false);
        return;
      }
      
      // Update state with local stream
      setMediaState(prev => ({ ...prev, localStream: stream }));
      
      toast({
        title: "Searching for users",
        description: "Looking for someone to chat with...",
      });
      
      // After initial connection setup, start searching for users
      setTimeout(() => {
        setIsConnecting(false);
        continueSearch();
      }, CONNECT_DELAY);
    } catch (error) {
      setIsConnecting(false);
      console.error("Connection error:", error);
      toast({
        title: "Connection failed",
        description: "Failed to establish connection. Please try again.",
        variant: "destructive",
      });
    }
  }, [mediaEnabled, continueSearch]);

  // Function to disconnect from the current chat
  const disconnect = useCallback(() => {
    if (isConnected || isSearching) {
      // Call cleanup utility to stop tracks and clear timeouts
      cleanupResources(
        mediaState,
        peerConnectionRef,
        searchTimeoutRef,
        responseTimeoutRef
      );
      
      // Reset state
      setIsConnected(false);
      setIsSearching(false);
      setPeerId(null);
      setMediaState({ localStream: null, remoteStream: null });
      
      setTimeout(() => {
        toast({
          title: "Disconnected",
          description: "You have disconnected from the chat.",
        });
      }, DISCONNECT_DELAY);
    } else {
      // If not connected or searching, try to connect
      connect();
    }
  }, [isConnected, isSearching, connect, mediaState]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop all media tracks on unmount
      stopMediaTracks(mediaState.localStream);
      
      // Clear any pending timeouts
      if (responseTimeoutRef.current) {
        window.clearTimeout(responseTimeoutRef.current);
      }
      
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
      
      // Close any peer connections
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [mediaState.localStream]);

  // Return all necessary state and functions
  return {
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
    toggleMedia,
  };
};

export default useChat;
