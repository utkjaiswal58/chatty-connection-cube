
// WebRTC configuration with expanded STUN/TURN servers for better connectivity
export const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Add TURN servers for NAT traversal (need to replace with your own TURN server in production)
    // { urls: 'turn:YOUR_TURN_SERVER', username: 'username', credential: 'credential' },
  ],
  iceCandidatePoolSize: 10, // Increase candidate pool for better connectivity
};

// Socket.io signaling client implementation
export class SocketSignaling {
  private socket: any;
  private userId: string;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private isActive = true;
  private connectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private reconnectInterval: NodeJS.Timeout | null = null;
  
  constructor(userId: string, socketIOInstance: any) {
    this.userId = userId;
    this.socket = socketIOInstance;
    
    console.log(`[Signaling] Created for user ${userId}`);
    
    if (!this.socket) {
      console.error('[Signaling] Socket.io instance not provided');
      return;
    }
    
    // Setup socket event listeners
    this.setupSocketListeners();
    
    // Announce presence
    this.sendPresence();
    
    // Set interval to periodically send presence
    this.reconnectInterval = setInterval(() => {
      if (this.isActive) {
        this.sendPresence();
      }
    }, 10000);
  }
  
  private setupSocketListeners() {
    if (!this.socket) return;
    
    // Handle socket connection events
    this.socket.on('connect', () => {
      console.log('[Signaling] Socket connected');
      this.sendPresence();
    });
    
    this.socket.on('disconnect', () => {
      console.log('[Signaling] Socket disconnected');
    });
    
    this.socket.on('reconnect', () => {
      console.log('[Signaling] Socket reconnected');
      this.sendPresence();
    });
    
    // Handle direct messages to this user
    this.socket.on('message', (data: any) => {
      if (data.target === this.userId) {
        this.handleMessage(data);
      }
    });
    
    // Handle specific WebRTC signaling events
    ['offer', 'answer', 'ice-candidate'].forEach(eventType => {
      this.socket.on(eventType, (data: any) => {
        if (data.to === this.userId) {
          console.log(`[Signaling] Received ${eventType}:`, data);
          this.notifyListeners(eventType, data);
        }
      });
    });
  }
  
  private sendPresence() {
    if (!this.socket || !this.socket.connected) return;
    
    try {
      this.socket.emit('presence', {
        userId: this.userId,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error('[Signaling] Error sending presence:', e);
    }
  }
  
  private handleMessage(data: any) {
    try {
      const eventType = data.type;
      
      if (eventType !== 'ping') {
        console.log(`[Signaling] Received message:`, data);
      }
      
      // Notify listeners
      this.notifyListeners(eventType, data);
    } catch (e) {
      console.error('[Signaling] Error handling message:', e);
    }
  }
  
  private notifyListeners(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error(`[Signaling] Error in listener for ${eventType}:`, e);
      }
    });
  }
  
  public on(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(callback);
    
    // For direct socket.io events, also register on the socket
    if (['offer', 'answer', 'ice-candidate'].includes(eventType)) {
      this.socket.on(eventType, (data: any) => {
        if (data.to === this.userId) {
          callback(data);
        }
      });
    }
  }
  
  public send(eventType: string, target: string, data: any) {
    if (!this.isActive || !this.socket) {
      console.warn(`[Signaling] Attempted to send message when signaling is inactive`);
      return;
    }
    
    if (eventType !== 'ping') {
      console.log(`[Signaling] Sending ${eventType} to ${target}:`, data);
    }
    
    const message = {
      type: eventType,
      from: this.userId,
      to: target,
      ...data,
      timestamp: Date.now()
    };
    
    try {
      // Use specific event emitters for WebRTC signaling
      if (eventType === 'offer') {
        this.socket.emit('call-user', {
          offer: data.sdp,
          to: target,
          from: this.userId
        });
      } else if (eventType === 'answer') {
        this.socket.emit('make-answer', {
          answer: data.sdp,
          to: target,
          from: this.userId
        });
      } else if (eventType === 'ice_candidate') {
        this.socket.emit('ice-candidate', {
          candidate: data.candidate,
          to: target,
          from: this.userId
        });
      } else {
        // For other message types
        this.socket.emit('message', message);
      }
      
      // For critical messages, set up a timeout to retry if needed
      if (['offer', 'answer', 'ice_candidate'].includes(eventType)) {
        // Clear any existing timeout for this target and event type
        const timeoutKey = `${target}_${eventType}`;
        if (this.connectionTimeouts.has(timeoutKey)) {
          clearTimeout(this.connectionTimeouts.get(timeoutKey)!);
        }
        
        // Set a new timeout to check if connection was established
        this.connectionTimeouts.set(
          timeoutKey,
          setTimeout(() => {
            console.log(`[Signaling] Connection timeout for ${eventType}, resending`);
            // Resend the message
            this.send(eventType, target, data);
            this.connectionTimeouts.delete(timeoutKey);
          }, 5000)
        );
      }
    } catch (e) {
      console.error(`[Signaling] Error sending ${eventType}:`, e);
    }
  }
  
  public cleanup() {
    this.isActive = false;
    
    // Clear all timeouts
    this.connectionTimeouts.forEach(timeout => clearTimeout(timeout));
    this.connectionTimeouts.clear();
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    // Don't disconnect socket as it might be used elsewhere
    // Just remove our listeners
    if (this.socket) {
      ['offer', 'answer', 'ice-candidate', 'message'].forEach(event => {
        this.socket.off(event);
      });
    }
    
    this.listeners.clear();
    console.log(`[Signaling] Cleaned up for user ${this.userId}`);
  }
}

// Use a compatible interface with the existing BroadcastSignaling class for backward compatibility
export class BroadcastSignaling {
  private channel: BroadcastChannel;
  private userId: string;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private pendingMessages: Map<string, any[]> = new Map(); // Store messages that might arrive before listeners
  private isActive = true;
  private reconnectInterval: NodeJS.Timeout | null = null;

  constructor(userId: string) {
    this.userId = userId;
    this.channel = new BroadcastChannel('webrtc-signaling');
    this.channel.onmessage = this.handleMessage;
    
    console.log(`[Signaling] Created for user ${userId}`);
    
    // Send a ping to announce presence
    this.sendPing();
    
    // Set interval to periodically ping to maintain presence
    this.reconnectInterval = setInterval(() => {
      if (this.isActive) {
        this.sendPing();
      }
    }, 5000);
  }

  private sendPing() {
    try {
      this.channel.postMessage({
        type: 'ping',
        from: this.userId,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error('[Signaling] Error sending ping:', e);
      
      // If channel is closed, try to reopen it
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        console.log('[Signaling] Channel closed, reopening');
        try {
          this.channel = new BroadcastChannel('webrtc-signaling');
          this.channel.onmessage = this.handleMessage;
          // Try sending the ping again
          setTimeout(() => this.sendPing(), 100);
        } catch (reopenError) {
          console.error('[Signaling] Error reopening channel:', reopenError);
        }
      }
    }
  }

  private handleMessage = (event: MessageEvent) => {
    try {
      const data = event.data;
      
      // Always log received messages for debugging
      if (data.type !== 'ping') {
        console.log(`[Signaling] Received message:`, data);
      }
      
      if (data.target === this.userId) {
        const eventType = data.type;
        
        // Notify current listeners
        this.notifyListeners(eventType, data);
        
        // Store message for potential listeners that haven't been registered yet
        if (!this.listeners.has(eventType) || this.listeners.get(eventType)?.length === 0) {
          if (!this.pendingMessages.has(eventType)) {
            this.pendingMessages.set(eventType, []);
          }
          this.pendingMessages.get(eventType)?.push(data);
        }
      }
    } catch (e) {
      console.error('[Signaling] Error parsing message:', e);
    }
  };

  private notifyListeners(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (e) {
        console.error(`[Signaling] Error in listener for ${eventType}:`, e);
      }
    });
  }

  public on(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(callback);
    
    // Check if there are any pending messages for this event type
    const pendingMessages = this.pendingMessages.get(eventType) || [];
    if (pendingMessages.length > 0) {
      console.log(`[Signaling] Processing ${pendingMessages.length} pending messages for ${eventType}`);
      pendingMessages.forEach(msg => callback(msg));
      this.pendingMessages.delete(eventType);
    }
  }

  public send(eventType: string, target: string, data: any) {
    if (!this.isActive) {
      console.warn(`[Signaling] Attempted to send message when signaling is inactive`);
      return;
    }
    
    if (eventType !== 'ping') {
      console.log(`[Signaling] Sending ${eventType} to ${target}:`, data);
    }
    
    const message = {
      type: eventType,
      from: this.userId,
      target,
      ...data,
      timestamp: Date.now()
    };
    
    try {
      this.channel.postMessage(message);
      
      // For critical messages, send again after a short delay to improve reliability
      if (['offer_sdp', 'answer_sdp', 'ice_candidate'].includes(eventType)) {
        setTimeout(() => {
          if (this.isActive) {
            console.log(`[Signaling] Resending ${eventType} for reliability`);
            try {
              this.channel.postMessage(message);
            } catch (e) {
              console.error(`[Signaling] Error resending ${eventType}:`, e);
              
              // Handle closed channel case
              if (e instanceof DOMException && e.name === 'InvalidStateError') {
                console.log('[Signaling] Channel closed during resend, reopening');
                try {
                  this.channel = new BroadcastChannel('webrtc-signaling');
                  this.channel.onmessage = this.handleMessage;
                  
                  // Try sending the message again after a brief delay
                  setTimeout(() => {
                    try {
                      this.channel.postMessage(message);
                    } catch (finalError) {
                      console.error('[Signaling] Final error sending message:', finalError);
                    }
                  }, 100);
                } catch (reopenError) {
                  console.error('[Signaling] Error reopening channel:', reopenError);
                }
              }
            }
          }
        }, 1000);
      }
    } catch (e) {
      console.error(`[Signaling] Error sending ${eventType}:`, e);
      
      // Handle closed channel case
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        console.log('[Signaling] Channel closed, reopening');
        try {
          this.channel = new BroadcastChannel('webrtc-signaling');
          this.channel.onmessage = this.handleMessage;
          
          // Try sending the message again after a brief delay
          setTimeout(() => {
            try {
              this.channel.postMessage(message);
            } catch (retryError) {
              console.error('[Signaling] Error after reopening channel:', retryError);
            }
          }, 100);
        } catch (reopenError) {
          console.error('[Signaling] Error reopening channel:', reopenError);
        }
      }
    }
  }

  public cleanup() {
    this.isActive = false;
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    try {
      this.channel.close();
    } catch (e) {
      console.error('[Signaling] Error closing channel:', e);
    }
    this.listeners.clear();
    this.pendingMessages.clear();
    console.log(`[Signaling] Cleaned up for user ${this.userId}`);
  }
}

export const createPeerConnection = (
  configuration: RTCConfiguration,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onTrack: (event: RTCTrackEvent) => void
): RTCPeerConnection => {
  console.log(`[PeerConnection] Creating with config:`, configuration);
  
  const peerConnection = new RTCPeerConnection(configuration);
  
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log(`[PeerConnection] ICE candidate generated:`, event.candidate);
      onIceCandidate(event.candidate);
    }
  };
  
  peerConnection.oniceconnectionstatechange = () => {
    console.log(`[PeerConnection] ICE connection state: ${peerConnection.iceConnectionState}`);
    
    // Handle ICE connection failures
    if (peerConnection.iceConnectionState === 'failed') {
      console.warn('[PeerConnection] ICE connection failed, attempting to restart ICE');
      try {
        peerConnection.restartIce();
      } catch (e) {
        console.error('[PeerConnection] Error restarting ICE:', e);
      }
    } else if (peerConnection.iceConnectionState === 'disconnected') {
      console.warn('[PeerConnection] ICE connection disconnected, watching for recovery');
      
      // Set a timeout to check if it recovers on its own or needs intervention
      setTimeout(() => {
        if (peerConnection.iceConnectionState === 'disconnected') {
          console.warn('[PeerConnection] ICE still disconnected, attempting to restart ICE');
          try {
            peerConnection.restartIce();
          } catch (e) {
            console.error('[PeerConnection] Error restarting ICE:', e);
          }
        }
      }, 5000);
    }
  };
  
  peerConnection.onicegatheringstatechange = () => {
    console.log(`[PeerConnection] ICE gathering state: ${peerConnection.iceGatheringState}`);
  };
  
  peerConnection.onsignalingstatechange = () => {
    console.log(`[PeerConnection] Signaling state: ${peerConnection.signalingState}`);
    
    if (peerConnection.signalingState === 'closed') {
      console.log('[PeerConnection] Connection closed');
    }
  };
  
  peerConnection.onconnectionstatechange = () => {
    console.log(`[PeerConnection] Connection state: ${peerConnection.connectionState}`);
    
    if (peerConnection.connectionState === 'connected') {
      console.log(`[PeerConnection] Connection established successfully!`);
    } else if (peerConnection.connectionState === 'failed') {
      console.error('[PeerConnection] Connection failed');
      
      // Try to restart ICE if the connection fails
      try {
        console.log('[PeerConnection] Attempting to restart ICE after connection failure');
        peerConnection.restartIce();
      } catch (e) {
        console.error('[PeerConnection] Error restarting ICE after connection failure:', e);
      }
    }
  };
  
  peerConnection.ontrack = (event) => {
    console.log(`[PeerConnection] Remote track received:`, event.track);
    onTrack(event);
    
    // Monitor track status
    event.track.onmute = () => console.log('[PeerConnection] Remote track muted:', event.track.kind);
    event.track.onunmute = () => console.log('[PeerConnection] Remote track unmuted:', event.track.kind);
    event.track.onended = () => console.log('[PeerConnection] Remote track ended:', event.track.kind);
  };
  
  return peerConnection;
};

export const addTracksToConnection = (
  peerConnection: RTCPeerConnection,
  stream: MediaStream
): void => {
  console.log(`[PeerConnection] Adding ${stream.getTracks().length} track(s) to connection`);
  
  stream.getTracks().forEach(track => {
    console.log(`[PeerConnection] Adding track: ${track.kind}`, track);
    try {
      peerConnection.addTrack(track, stream);
    } catch (error) {
      console.error(`[PeerConnection] Error adding track:`, error);
    }
  });
};

// Create an offer with proper options and error handling
export const createOffer = async (
  peerConnection: RTCPeerConnection
): Promise<RTCSessionDescriptionInit | null> => {
  try {
    console.log('[PeerConnection] Creating offer');
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      iceRestart: true
    });
    
    console.log('[PeerConnection] Offer created:', offer);
    await peerConnection.setLocalDescription(offer);
    console.log('[PeerConnection] Local description set from offer');
    
    return offer;
  } catch (error) {
    console.error('[PeerConnection] Error creating offer:', error);
    return null;
  }
};

// Create an answer with proper error handling
export const createAnswer = async (
  peerConnection: RTCPeerConnection
): Promise<RTCSessionDescriptionInit | null> => {
  try {
    console.log('[PeerConnection] Creating answer');
    const answer = await peerConnection.createAnswer();
    
    console.log('[PeerConnection] Answer created:', answer);
    await peerConnection.setLocalDescription(answer);
    console.log('[PeerConnection] Local description set from answer');
    
    return answer;
  } catch (error) {
    console.error('[PeerConnection] Error creating answer:', error);
    return null;
  }
};

// Set remote description with proper error handling
export const setRemoteDescription = async (
  peerConnection: RTCPeerConnection,
  description: RTCSessionDescriptionInit
): Promise<boolean> => {
  try {
    console.log('[PeerConnection] Setting remote description:', description);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    console.log('[PeerConnection] Remote description set successfully');
    return true;
  } catch (error) {
    console.error('[PeerConnection] Error setting remote description:', error);
    return false;
  }
};

// Add ICE candidate with proper error handling
export const addIceCandidate = async (
  peerConnection: RTCPeerConnection,
  candidate: RTCIceCandidateInit
): Promise<boolean> => {
  try {
    console.log('[PeerConnection] Adding ICE candidate:', candidate);
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    console.log('[PeerConnection] ICE candidate added successfully');
    return true;
  } catch (error) {
    console.error('[PeerConnection] Error adding ICE candidate:', error);
    return false;
  }
};

// Improved getUserMedia with more robust error handling and logging
export const getUserMedia = async (constraints: MediaStreamConstraints): Promise<MediaStream | null> => {
  console.log(`[Media] Requesting user media with constraints:`, constraints);
  
  try {
    // Ensure browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia is not supported in this browser');
    }
    
    // Ensure at least one of video or audio is true
    const safeConstraints = {
      video: constraints.video ?? true,
      audio: constraints.audio ?? true
    };
    
    // If somehow both are false, default to video
    if (!safeConstraints.video && !safeConstraints.audio) {
      safeConstraints.video = true;
    }
    
    console.log(`[Media] Using safe constraints:`, safeConstraints);
    const stream = await navigator.mediaDevices.getUserMedia(safeConstraints);
    
    console.log(`[Media] Stream obtained successfully with ${stream.getVideoTracks().length} video and ${stream.getAudioTracks().length} audio tracks`);
    return stream;
  } catch (err) {
    console.error(`[Media] Error accessing media devices:`, err);
    
    // Try with just audio if video fails
    if (constraints.video) {
      console.log(`[Media] Retrying with audio only`);
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log(`[Media] Audio-only stream obtained successfully`);
        return audioOnlyStream;
      } catch (audioErr) {
        console.error(`[Media] Error accessing audio:`, audioErr);
        return null;
      }
    }
    return null;
  }
};

// Enhanced data channel setup
export interface DataChannelWrapper {
  channel: RTCDataChannel;
  cleanup: () => void;
}

export const setupReliableDataChannel = (
  dataChannel: RTCDataChannel, 
  onOpen?: () => void, 
  onClose?: () => void, 
  onMessage?: (data: any) => void
): DataChannelWrapper => {
  console.log(`[DataChannel] Setting up channel: ${dataChannel.label}`);
  
  dataChannel.binaryType = 'arraybuffer';
  
  dataChannel.onopen = () => {
    console.log(`[DataChannel] Channel opened: ${dataChannel.label}`);
    
    // Send a ping message to verify the channel is working properly
    try {
      dataChannel.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error(`[DataChannel] Error sending ping:`, e);
    }
    
    if (onOpen) onOpen();
  };
  
  dataChannel.onclose = () => {
    console.log(`[DataChannel] Channel closed: ${dataChannel.label}`);
    if (onClose) onClose();
  };
  
  dataChannel.onerror = (error) => {
    console.error(`[DataChannel] Error in channel ${dataChannel.label}:`, error);
  };
  
  dataChannel.onmessage = (event) => {
    console.log(`[DataChannel] Message received on ${dataChannel.label}:`, event.data);
    try {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data);
    } catch (error) {
      console.error(`[DataChannel] Error parsing message:`, error);
    }
  };
  
  // Setup periodic health checks for the data channel
  const intervalId = setInterval(() => {
    if (dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn(`[DataChannel] Failed to send ping:`, e);
      }
    } else if (dataChannel.readyState === 'closed' || dataChannel.readyState === 'closing') {
      clearInterval(intervalId);
    }
  }, 30000); // Every 30 seconds
  
  // Return both the channel and a cleanup function
  return {
    channel: dataChannel,
    cleanup: () => {
      clearInterval(intervalId);
      if (dataChannel.readyState === 'open') {
        try {
          dataChannel.close();
        } catch (e) {
          console.error(`[DataChannel] Error closing channel:`, e);
        }
      }
    }
  };
};

// Create a data channel with proper configuration
export const createDataChannel = (
  peerConnection: RTCPeerConnection,
  label: string = 'chat',
  options: RTCDataChannelInit = {
    ordered: true,
    maxRetransmits: 3
  }
): RTCDataChannel | null => {
  try {
    console.log(`[DataChannel] Creating data channel: ${label}`);
    const dataChannel = peerConnection.createDataChannel(label, options);
    return dataChannel;
  } catch (error) {
    console.error(`[DataChannel] Error creating data channel:`, error);
    return null;
  }
};

// Utility for debugging WebRTC connection issues
export const logPeerConnectionState = (pc: RTCPeerConnection): void => {
  console.log('[PeerConnection] Current state:');
  console.log(`- ICE Connection State: ${pc.iceConnectionState}`);
  console.log(`- ICE Gathering State: ${pc.iceGatheringState}`);
  console.log(`- Signaling State: ${pc.signalingState}`);
  console.log(`- Connection State: ${pc.connectionState}`);
  
  // Log stats if available
  pc.getStats().then(stats => {
    console.log('[PeerConnection] Stats:', stats);
  }).catch(err => {
    console.error('[PeerConnection] Error getting stats:', err);
  });
  
  // Log currently active ICE candidates
  console.log('[PeerConnection] Local description:', pc.localDescription);
  console.log('[PeerConnection] Remote description:', pc.remoteDescription);
};
