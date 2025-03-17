
import { toast } from "@/hooks/use-toast";
import { RefObject } from "react";
import { createFakeRemoteStream } from "./mediaUtils";
import { ChatState, MediaStreamState } from "./types";
import { SEARCHING_DELAY } from "./constants";

// Simulate searching for another user
export const simulateUserSearch = (
  setIsSearching: (value: boolean) => void,
  setPeerId: (value: string | null) => void,
  setMediaState: (value: React.SetStateAction<MediaStreamState>) => void,
  setIsConnected: (value: boolean) => void,
  searchTimeoutRef: RefObject<number | null>,
  continueSearch: () => void
): void => {
  setIsSearching(true);
  
  // Clear existing timeout if any
  if (searchTimeoutRef.current) {
    window.clearTimeout(searchTimeoutRef.current);
  }
  
  // Simulate looking for another user with a random delay
  // In a real app, this would be a WebSocket or WebRTC signaling
  const searchTime = Math.random() * 5000 + SEARCHING_DELAY;
  
  // Using window.setTimeout and storing ID in ref for cleanup
  const timeoutId = window.setTimeout(() => {
    setIsSearching(false);
    
    // Simulate finding another user (50% chance)
    const foundUser = Math.random() > 0.5;
    
    if (foundUser) {
      // Generate a peer ID for the connected user
      const generatedPeerId = `user_${Math.random().toString(36).substring(2, 9)}`;
      setPeerId(generatedPeerId);
      
      try {
        // Create a fake remote stream for demonstration
        const fakeStream = createFakeRemoteStream(generatedPeerId);
        
        setMediaState(prev => ({ ...prev, remoteStream: fakeStream }));
        setIsConnected(true);
        
        toast({
          title: "User Found!",
          description: `You are now connected with ${generatedPeerId}.`,
        });
      } catch (error) {
        console.error("Error creating fake stream:", error);
        continueSearch(); // Try again if failed
      }
    } else {
      // Continue searching if no user found
      toast({
        title: "Still searching...",
        description: "No users found yet. Continuing to search.",
      });
      continueSearch();
    }
    
    if (searchTimeoutRef.current === timeoutId) {
      searchTimeoutRef.current = null;
    }
  }, searchTime);
  
  searchTimeoutRef.current = timeoutId;
};

// Clean up all resources
export const cleanupResources = (
  mediaState: MediaStreamState,
  peerConnectionRef: RefObject<RTCPeerConnection | null>,
  searchTimeoutRef: RefObject<number | null>,
  responseTimeoutRef: RefObject<number | null>
): void => {
  // Stop all media tracks
  if (mediaState.localStream) {
    mediaState.localStream.getTracks().forEach(track => track.stop());
  }
  
  // Close peer connection
  if (peerConnectionRef.current) {
    peerConnectionRef.current.close();
    peerConnectionRef.current = null;
  }
  
  // Clear any pending timeouts
  if (responseTimeoutRef.current) {
    window.clearTimeout(responseTimeoutRef.current);
    responseTimeoutRef.current = null;
  }
  
  if (searchTimeoutRef.current) {
    window.clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = null;
  }
};
