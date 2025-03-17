
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";

// For a real app, this would use WebRTC for peer-to-peer connections
// This is a simplified frontend-only implementation
const TYPING_DURATION = 2000; // milliseconds
const CONNECT_DELAY = 2000; // milliseconds
const DISCONNECT_DELAY = 1000; // milliseconds

// Sample responses - only used when no peer is connected in this demo
const SAMPLE_RESPONSES = [
  "Hi there! How are you doing today?",
  "Nice to meet you! What brings you here?",
  "Hello! I'm just hanging out. What about you?",
  "That's interesting! Tell me more about it.",
  "I've never thought about it that way. You make a good point.",
  "I understand what you mean. It happens to everyone.",
  "What do you like to do in your free time?",
  "I'm just looking to chat with new people. How about you?",
  "Do you have any recommendations for good books or movies?",
  "I'm from the internet, where are you from?",
  "That sounds fun! I wish I could join you.",
  "It's been nice talking with you!",
];

interface MediaStreamState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

const useChat = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
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
  const responseTimeoutRef = useRef<number | null>(null);

  // Function to get a random response (only used in demo mode)
  const getRandomResponse = () => {
    const randomIndex = Math.floor(Math.random() * SAMPLE_RESPONSES.length);
    return SAMPLE_RESPONSES[randomIndex];
  };

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

    // In a real implementation, this would send the message via WebRTC data channel
    // For now, we'll simulate the stranger typing
    setIsTyping(true);
    
    // Clear any existing timeout
    if (responseTimeoutRef.current) {
      window.clearTimeout(responseTimeoutRef.current);
    }
    
    // Simulate a response (in a real app, this would come from the peer)
    const responseTime = Math.random() * 3000 + 1000;
    responseTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      
      // Add stranger's response
      const response = {
        content: getRandomResponse(),
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, response]);
      responseTimeoutRef.current = null;
    }, responseTime);
  }, []);

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

  // Function to connect to a new chat
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setMessages([]);
    
    try {
      // Start local media stream
      const stream = await startLocalStream();
      
      if (!stream) {
        setIsConnecting(false);
        return;
      }
      
      // In a real implementation, this would establish a WebRTC connection
      // For now, we'll simulate the connection delay
      setTimeout(() => {
        setIsConnecting(false);
        setIsConnected(true);
        
        // Add a simulated remote stream for demo purposes
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        oscillator.frequency.setValueAtTime(0, audioContext.currentTime); // Silent
        const destination = audioContext.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();
        
        // Create a fake video stream (black screen)
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        const fakeVideoStream = canvas.captureStream();
        
        // Combine audio and video
        const fakeTracks = [
          ...fakeVideoStream.getVideoTracks(),
          ...destination.stream.getAudioTracks()
        ];
        const fakeStream = new MediaStream(fakeTracks);
        
        setMediaState(prev => ({ ...prev, remoteStream: fakeStream }));
        
        toast({
          title: "Connected",
          description: "You are now chatting with a stranger.",
        });
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
  }, [startLocalStream]);

  // Function to disconnect from the current chat
  const disconnect = useCallback(() => {
    if (isConnected) {
      // Stop all media tracks
      if (mediaState.localStream) {
        mediaState.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Clear any pending response timeout
      if (responseTimeoutRef.current) {
        window.clearTimeout(responseTimeoutRef.current);
        responseTimeoutRef.current = null;
      }
      
      setIsConnected(false);
      setMediaState({ localStream: null, remoteStream: null });
      
      setTimeout(() => {
        toast({
          title: "Disconnected",
          description: "You have disconnected from the chat.",
        });
      }, DISCONNECT_DELAY);
    } else {
      // If not connected, try to connect
      connect();
    }
  }, [isConnected, connect, mediaState]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop all media tracks
      if (mediaState.localStream) {
        mediaState.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Clear any pending timeouts
      if (responseTimeoutRef.current) {
        window.clearTimeout(responseTimeoutRef.current);
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
    isTyping,
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
