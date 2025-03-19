
// WebRTC configuration
export const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Add more STUN servers for increased reliability
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

// Improved BroadcastChannel for signaling
export class BroadcastSignaling {
  private channel: BroadcastChannel;
  private userId: string;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private pendingMessages: Map<string, any[]> = new Map(); // Store messages that might arrive before listeners

  constructor(userId: string) {
    this.userId = userId;
    this.channel = new BroadcastChannel('webrtc-signaling');
    this.channel.onmessage = this.handleMessage;
    
    console.log(`[Signaling] Created for user ${userId}`);
    
    // Send a ping to announce presence
    this.sendPing();
    
    // Set interval to periodically ping to maintain presence
    setInterval(() => this.sendPing(), 5000);
  }

  private sendPing() {
    this.channel.postMessage({
      type: 'ping',
      from: this.userId,
      timestamp: Date.now()
    });
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
    
    this.channel.postMessage(message);
    
    // For critical messages, send again after a short delay to improve reliability
    if (['offer_sdp', 'answer_sdp', 'ice_candidate'].includes(eventType)) {
      setTimeout(() => {
        console.log(`[Signaling] Resending ${eventType} for reliability`);
        this.channel.postMessage(message);
      }, 1000);
    }
  }

  public cleanup() {
    this.channel.close();
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
  };
  
  peerConnection.onicegatheringstatechange = () => {
    console.log(`[PeerConnection] ICE gathering state: ${peerConnection.iceGatheringState}`);
  };
  
  peerConnection.onsignalingstatechange = () => {
    console.log(`[PeerConnection] Signaling state: ${peerConnection.signalingState}`);
  };
  
  peerConnection.onconnectionstatechange = () => {
    console.log(`[PeerConnection] Connection state: ${peerConnection.connectionState}`);
    
    if (peerConnection.connectionState === 'connected') {
      console.log(`[PeerConnection] Connection established successfully!`);
    }
  };
  
  peerConnection.ontrack = (event) => {
    console.log(`[PeerConnection] Remote track received:`, event.track);
    onTrack(event);
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
export const setupReliableDataChannel = (
  dataChannel: RTCDataChannel, 
  onOpen?: () => void, 
  onClose?: () => void, 
  onMessage?: (data: any) => void
) => {
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
