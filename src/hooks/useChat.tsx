import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { 
  iceServers, 
  BroadcastSignaling, 
  createPeerConnection, 
  addTracksToConnection,
  getUserMedia,
  setupReliableDataChannel
} from "@/utils/webRTCUtils";

// Constants
const TYPING_DURATION = 2000; // milliseconds
const CONNECT_DELAY = 1000; // milliseconds
const DISCONNECT_DELAY = 1000; // milliseconds

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
  
  // WebRTC related refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<BroadcastSignaling | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // Initialize signaling
  useEffect(() => {
    // Create new signaling instance using BroadcastChannel
    signalingRef.current = new BroadcastSignaling(userId);
    
    // Listen for offer requests
    signalingRef.current.on('offer', async (data) => {
      console.log('Received offer request from:', data.from);
      if (!isConnected && !isSearching && !isConnecting) {
        toast({
          title: "Connection Request",
          description: `${data.from} wants to connect with you. Auto-accepting...`,
        });
        
        await connect(data.from);
      }
    });
    
    // Listen for offers
    signalingRef.current.on('offer_sdp', async (data) => {
      console.log('Received SDP offer from:', data.from);
      if (data.target === userId && peerConnectionRef.current && targetUserId === data.from) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
          
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          signalingRef.current?.send('answer_sdp', data.from, {
            sdp: answer
          });
        } catch (error) {
          console.error("Error handling offer:", error);
        }
      }
    });
    
    // Listen for answers
    signalingRef.current.on('answer_sdp', async (data) => {
      console.log('Received SDP answer from:', data.from);
      if (data.target === userId && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (error) {
          console.error("Error handling answer:", error);
        }
      }
    });
    
    // Listen for ICE candidates
    signalingRef.current.on('ice_candidate', async (data) => {
      if (data.target === userId && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    });
    
    // Listen for disconnects
    signalingRef.current.on('disconnect', (data) => {
      if (data.target === userId && data.from === peerId) {
        toast({
          title: "Peer Disconnected",
          description: `${data.from} has disconnected from the chat.`,
        });
        disconnect();
      }
    });
    
    return () => {
      signalingRef.current?.cleanup();
    };
  }, [userId, isConnected, isSearching, isConnecting, targetUserId, peerId]);

  // Function to start local media stream
  const startLocalStream = useCallback(async () => {
    try {
      // Using our improved getUserMedia utility with fallbacks
      const stream = await getUserMedia({ 
        video: mediaEnabled.video, 
        audio: mediaEnabled.audio 
      });
      
      if (!stream) {
        throw new Error("Could not access media devices");
      }
      
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

  // Function to create and initialize peer connection
  const initPeerConnection = useCallback(async (localStream: MediaStream, initiator: boolean) => {
    console.log(`Initializing peer connection as ${initiator ? 'initiator' : 'receiver'}`);
    
    // Create a new peer connection
    const pc = createPeerConnection(
      iceServers,
      (candidate) => {
        console.log("ICE candidate generated, sending to peer");
        if (signalingRef.current && targetUserId) {
          signalingRef.current.send('ice_candidate', targetUserId, {
            candidate
          });
        }
      },
      (event) => {
        console.log("Remote track received");
        // Handle incoming tracks
        if (event.streams && event.streams[0]) {
          setMediaState(prev => ({ ...prev, remoteStream: event.streams[0] }));
          remoteStreamRef.current = event.streams[0];
        }
      }
    );
    
    // Create data channel for text messaging
    if (initiator) {
      console.log("Creating data channel as initiator");
      const dataChannel = pc.createDataChannel('chat', {
        ordered: true,
        maxRetransmits: 3
      });
      dataChannelRef.current = setupReliableDataChannel(
        dataChannel,
        undefined,
        undefined,
        (data) => {
          if (data.type === 'chat') {
            handleIncomingMessage(data.content);
          } else if (data.type === 'typing') {
            setIsTyping(true);
            
            // Clear existing timeout if there is one
            if (typingTimeoutRef.current) {
              window.clearTimeout(typingTimeoutRef.current);
            }
            
            // Set a new timeout to stop the typing indicator
            typingTimeoutRef.current = window.setTimeout(() => {
              setIsTyping(false);
              typingTimeoutRef.current = null;
            }, TYPING_DURATION);
          }
        }
      );
    } else {
      console.log("Setting up ondatachannel as receiver");
      pc.ondatachannel = (event) => {
        console.log("Data channel received from peer");
        dataChannelRef.current = setupReliableDataChannel(
          event.channel,
          undefined,
          undefined,
          (data) => {
            if (data.type === 'chat') {
              handleIncomingMessage(data.content);
            } else if (data.type === 'typing') {
              setIsTyping(true);
              
              // Clear existing timeout if there is one
              if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current);
              }
              
              // Set a new timeout to stop the typing indicator
              typingTimeoutRef.current = window.setTimeout(() => {
                setIsTyping(false);
                typingTimeoutRef.current = null;
              }, TYPING_DURATION);
            }
          }
        );
      };
    }
    
    // Add tracks from local stream to peer connection
    console.log("Adding local stream tracks to peer connection");
    addTracksToConnection(pc, localStream);
    
    peerConnectionRef.current = pc;
    return pc;
  }, [targetUserId]);

  // Handle incoming message
  const handleIncomingMessage = (content: string) => {
    const newMessage = {
      content,
      isUser: false,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  // Send typing indicator
  const sendTypingIndicator = useCallback(() => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({
        type: 'typing',
        timestamp: Date.now()
      }));
    }
  }, []);

  // Function to handle sending a message
  const sendMessage = useCallback((content: string) => {
    // Add user message to the chat
    const newMessage = {
      content,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);

    // Send message through data channel if connected
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({
        type: 'chat',
        content,
        timestamp: Date.now()
      }));
    }
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

  // Register an active user for discovery
  const registerAsActive = useCallback(() => {
    const key = `active_${userId}`;
    const data = {
      userId,
      timestamp: Date.now()
    };
    
    sessionStorage.setItem(key, JSON.stringify(data));
    
    // Cleanup old entries
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('active_')) {
        try {
          const data = JSON.parse(sessionStorage.getItem(key) || '{}');
          if (Date.now() - data.timestamp > 60000) {
            sessionStorage.removeItem(key);
          }
        } catch (e) {
          console.error('Error parsing active user data:', e);
        }
      }
    }
  }, [userId]);
  
  // Find active users
  const findActiveUsers = useCallback(() => {
    const activeUsers = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('active_')) {
        try {
          const data = JSON.parse(sessionStorage.getItem(key) || '{}');
          if (data.userId !== userId && Date.now() - data.timestamp < 60000) {
            activeUsers.push(data.userId);
          }
        } catch (e) {
          console.error('Error parsing active user data:', e);
        }
      }
    }
    return activeUsers;
  }, [userId]);

  // Function to connect to a new chat
  const connect = useCallback(async (specificUserId?: string) => {
    console.log(`Attempting to connect${specificUserId ? ' to specific user: ' + specificUserId : ''}`);
    setIsConnecting(true);
    setMessages([]);
    setPeerId(null);
    setTargetUserId(specificUserId || null);
    
    try {
      // Register as active user
      registerAsActive();
      
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
      
      // After a short delay, initiate the connection process
      setTimeout(async () => {
        setIsConnecting(false);
        
        if (specificUserId) {
          // Direct connection to specific user
          setIsSearching(true);
          
          // Send an offer request to the target user
          if (signalingRef.current) {
            console.log("Sending offer request to:", specificUserId);
            signalingRef.current.send('offer', specificUserId, {
              userId
            });
          }
          
          // Initialize peer connection as the initiator
          const pc = await initPeerConnection(stream, true);
          
          // Create and send an offer
          console.log("Creating and sending SDP offer");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          if (signalingRef.current) {
            signalingRef.current.send('offer_sdp', specificUserId, {
              sdp: offer
            });
          }
          
          setPeerId(specificUserId);
          setIsSearching(false);
          setIsConnected(true);
        } else {
          // Random user search
          setIsSearching(true);
          
          // Find active users
          const activeUsers = findActiveUsers();
          
          if (activeUsers.length > 0) {
            // Connect to a random active user
            const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
            console.log("Found active user, connecting to:", randomUser);
            connect(randomUser);
          } else {
            // No users found, keep searching
            toast({
              title: "No users found",
              description: "Waiting for other users to connect...",
            });
            
            // Clean up after 30 seconds if no connection is made
            const timeoutId = window.setTimeout(() => {
              if (isSearching) {
                setIsSearching(false);
                sessionStorage.removeItem(`active_${userId}`);
                toast({
                  title: "Connection timeout",
                  description: "No users found. Please try again.",
                  variant: "destructive",
                });
              }
              searchTimeoutRef.current = null;
            }, 30000);
            
            searchTimeoutRef.current = timeoutId;
          }
        }
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
  }, [startLocalStream, initPeerConnection, userId, isSearching, registerAsActive, findActiveUsers]);

  // Function to disconnect from the current chat
  const disconnect = useCallback(() => {
    console.log("Disconnecting from chat");
    if (isConnected || isSearching) {
      // Notify peer about disconnection
      if (signalingRef.current && peerId) {
        signalingRef.current.send('disconnect', peerId, {
          reason: 'user_disconnect'
        });
      }
      
      // Stop all media tracks
      if (mediaState.localStream) {
        mediaState.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Close data channel
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      
      // Clear any pending timeouts
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      if (searchTimeoutRef.current !== null) {
        window.clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      
      // Remove active user entry
      sessionStorage.removeItem(`active_${userId}`);
      
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
  }, [isConnected, isSearching, mediaState, userId, peerId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop all media tracks
      if (mediaState.localStream) {
        mediaState.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Clear any pending timeouts
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      
      if (searchTimeoutRef.current !== null) {
        window.clearTimeout(searchTimeoutRef.current);
      }
      
      // Close any peer connections
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      
      // Close any data channels
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
      }
      
      // Remove active user entry
      sessionStorage.removeItem(`active_${userId}`);
    };
  }, [mediaState.localStream, userId]);

  // Keep active status fresh
  useEffect(() => {
    if (isSearching) {
      const interval = setInterval(() => {
        registerAsActive();
      }, 20000);
      
      return () => clearInterval(interval);
    }
  }, [isSearching, registerAsActive]);

  return {
    isConnecting,
    isConnected,
    isSearching,
    isTyping,
    userId,
    peerId,
    messages,
    sendMessage,
    sendTypingIndicator,
    connect,
    disconnect,
    mediaState,
    mediaEnabled,
    toggleMedia,
  };
};

export default useChat;
