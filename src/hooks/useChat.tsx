
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";

// For a real app, this would use WebRTC for peer-to-peer connections
// This is a simplified frontend-only implementation
const TYPING_DURATION = 2000; // milliseconds
const CONNECT_DELAY = 2000; // milliseconds
const DISCONNECT_DELAY = 1000; // milliseconds
const SEARCHING_DELAY = 3000; // milliseconds for simulating search for another user

interface MediaStreamState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

const useChat = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userId] = useState(() => `user_${Math.random().toString(36).substring(2, 9)}`);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{
    content: string;
    isUser: boolean;
    timestamp: Date;
  }[]>([]);
  const [mediaState, setMediaState] = useState<MediaStreamState>({
    localStream: null,
    remoteStream: null,
  });
  const [mediaEnabled, setMediaEnabled] = useState({
    video: true,
    audio: true,
  });
  
  // In a real implementation, these would be actual WebRTC connections
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const responseTimeoutRef = useRef<number | null>(null);

  // Function to start local media stream
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: mediaEnabled.video, 
        audio: mediaEnabled.audio 
      });
      
      setMediaState(prev => ({ ...prev, localStream: stream }));
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast({
        title: "Media access error",
        description: "Could not access camera or microphone. Please check permissions.",
        variant: "destructive",
      });
      return null;
    }
  }, [mediaEnabled]);

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
      }, TYPING_DURATION);
    }
  }, [isConnected]);

  // Toggle video or audio
  const toggleMedia = useCallback((type: 'video' | 'audio') => {
    setMediaEnabled(prev => {
      const newState = { ...prev, [type]: !prev[type] };
      
      // Update tracks in the local stream if it exists
      if (mediaState.localStream) {
        const tracks = type === 'video' 
          ? mediaState.localStream.getVideoTracks() 
          : mediaState.localStream.getAudioTracks();
          
        tracks.forEach(track => {
          track.enabled = newState[type];
        });
      }
      
      return newState;
    });
  }, [mediaState.localStream]);

  // Simulate searching for another user
  const simulateUserSearch = useCallback(() => {
    setIsSearching(true);
    
    // Clear existing timeout if any
    if (searchTimeoutRef.current !== null) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    // If target user ID is provided, simulate direct connection
    if (targetUserId) {
      // For demo purposes, we'll just simulate connecting to this user ID
      const searchTime = 1500;
      
      const timeoutId = window.setTimeout(() => {
        setIsSearching(false);
        connectWithUser(targetUserId);
      }, searchTime);
      
      searchTimeoutRef.current = timeoutId;
      return;
    }
    
    // Simulate looking for another user with a random delay
    // In a real app, this would be a WebSocket or WebRTC signaling
    const searchTime = Math.random() * 5000 + SEARCHING_DELAY;
    const timeoutId = window.setTimeout(() => {
      setIsSearching(false);
      
      // For demo purposes, always find a user when searching
      const generatedPeerId = `user_${Math.random().toString(36).substring(2, 9)}`;
      connectWithUser(generatedPeerId);
      
      searchTimeoutRef.current = null;
    }, searchTime);
    
    searchTimeoutRef.current = timeoutId;
  }, [targetUserId]);

  // Function to connect with a specific user
  const connectWithUser = useCallback((userIdToConnect: string) => {
    // Generate a peer ID for the connected user
    setPeerId(userIdToConnect);
    
    // Create a remote video stream
    try {
      // Create a fake remote stream for demonstration
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      oscillator.frequency.setValueAtTime(0, audioContext.currentTime); // Silent
      const destination = audioContext.createMediaStreamDestination();
      oscillator.connect(destination);
      oscillator.start();
      
      // Create a fake video stream (black screen with random pixels)
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      // Add some visual indication this is a "real user"
      if (ctx) {
        setInterval(() => {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw random colored pixels to simulate video noise
          for (let i = 0; i < 100; i++) {
            ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`;
            ctx.fillRect(
              Math.random() * canvas.width,
              Math.random() * canvas.height,
              5,
              5
            );
          }
          
          // Add "USER" text to the canvas to make it more clear it's a user
          ctx.fillStyle = '#ffffff';
          ctx.font = '30px Arial';
          ctx.fillText(`Remote: ${userIdToConnect}`, 20, 50);
        }, 100);
      }
      
      const fakeVideoStream = canvas.captureStream();
      
      // Combine audio and video
      const fakeTracks = [
        ...fakeVideoStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ];
      const fakeStream = new MediaStream(fakeTracks);
      
      setMediaState(prev => ({ ...prev, remoteStream: fakeStream }));
      setIsConnected(true);
      
      toast({
        title: "User Found!",
        description: `You are now connected with ${userIdToConnect}.`,
      });
    } catch (error) {
      console.error("Error creating fake stream:", error);
      toast({
        title: "Connection failed",
        description: "Failed to establish connection. Please try again.",
        variant: "destructive",
      });
    }
  }, []);

  // Function to connect to a new chat
  const connect = useCallback(async (specificUserId?: string) => {
    setIsConnecting(true);
    setMessages([]);
    setPeerId(null);
    setTargetUserId(specificUserId || null);
    
    try {
      // Start local media stream
      const stream = await startLocalStream();
      
      if (!stream) {
        setIsConnecting(false);
        return;
      }
      
      toast({
        title: specificUserId ? "Connecting to specific user" : "Searching for users",
        description: specificUserId 
          ? `Attempting to connect with ${specificUserId}...` 
          : "Looking for someone to chat with...",
      });
      
      // After initial connection setup, start searching for users
      setTimeout(() => {
        setIsConnecting(false);
        simulateUserSearch();
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
  }, [startLocalStream, simulateUserSearch]);

  // Function to disconnect from the current chat
  const disconnect = useCallback(() => {
    if (isConnected || isSearching) {
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
      if (responseTimeoutRef.current !== null) {
        window.clearTimeout(responseTimeoutRef.current);
        responseTimeoutRef.current = null;
      }
      
      if (searchTimeoutRef.current !== null) {
        window.clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      
      setIsConnected(false);
      setIsSearching(false);
      setTargetUserId(null);
      setPeerId(null);
      setMediaState({ localStream: null, remoteStream: null });
      
      setTimeout(() => {
        toast({
          title: "Disconnected",
          description: "You have disconnected from the chat.",
        });
      }, DISCONNECT_DELAY);
    }
  }, [isConnected, isSearching, mediaState]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop all media tracks
      if (mediaState.localStream) {
        mediaState.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Clear any pending timeouts
      if (responseTimeoutRef.current !== null) {
        window.clearTimeout(responseTimeoutRef.current);
      }
      
      if (searchTimeoutRef.current !== null) {
        window.clearTimeout(searchTimeoutRef.current);
      }
      
      // Close any peer connections
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [mediaState.localStream]);

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
