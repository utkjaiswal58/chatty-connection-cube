
// WebRTC configuration
export const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// Signaling server using BroadcastChannel API
// This is a better in-browser solution than localStorage
export class BroadcastSignaling {
  private channel: BroadcastChannel;
  private userId: string;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor(userId: string) {
    this.userId = userId;
    this.channel = new BroadcastChannel('webrtc-signaling');
    this.channel.onmessage = this.handleMessage;
  }

  private handleMessage = (event: MessageEvent) => {
    try {
      const data = event.data;
      if (data.target === this.userId) {
        const eventType = data.type;
        this.notifyListeners(eventType, data);
      }
    } catch (e) {
      console.error('Error parsing signaling message:', e);
    }
  };

  private notifyListeners(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType) || [];
    listeners.forEach(listener => listener(data));
  }

  public on(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(callback);
  }

  public send(eventType: string, target: string, data: any) {
    const message = {
      type: eventType,
      from: this.userId,
      target,
      ...data,
      timestamp: Date.now()
    };
    
    // Using BroadcastChannel for more reliable signaling
    this.channel.postMessage(message);
  }

  public cleanup() {
    this.channel.close();
    this.listeners.clear();
  }
}

export const createPeerConnection = (
  configuration: RTCConfiguration,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onTrack: (event: RTCTrackEvent) => void
): RTCPeerConnection => {
  const peerConnection = new RTCPeerConnection(configuration);
  
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };
  
  peerConnection.ontrack = onTrack;
  
  return peerConnection;
};

export const addTracksToConnection = (
  peerConnection: RTCPeerConnection,
  stream: MediaStream
): void => {
  stream.getTracks().forEach(track => {
    peerConnection.addTrack(track, stream);
  });
};

// Utility function to get user media with fallbacks
export const getUserMedia = async (constraints: MediaStreamConstraints): Promise<MediaStream | null> => {
  try {
    // Ensure at least one of video or audio is true
    const safeConstraints = {
      video: constraints.video ?? true,
      audio: constraints.audio ?? true
    };
    
    // If somehow both are false, default to video
    if (!safeConstraints.video && !safeConstraints.audio) {
      safeConstraints.video = true;
    }
    
    return await navigator.mediaDevices.getUserMedia(safeConstraints);
  } catch (err) {
    console.error('Error accessing media devices:', err);
    
    // Try with just audio if video fails
    if (constraints.video) {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (audioErr) {
        console.error('Error accessing audio:', audioErr);
        return null;
      }
    }
    return null;
  }
};

// Function to ensure data channel reliability
export const setupReliableDataChannel = (dataChannel: RTCDataChannel, onOpen?: () => void, onClose?: () => void, onMessage?: (data: any) => void) => {
  dataChannel.binaryType = 'arraybuffer';
  dataChannel.onopen = () => {
    console.log('Data channel opened');
    if (onOpen) onOpen();
  };
  
  dataChannel.onclose = () => {
    console.log('Data channel closed');
    if (onClose) onClose();
  };
  
  dataChannel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data);
    } catch (error) {
      console.error('Error parsing data channel message:', error);
    }
  };
  
  return dataChannel;
};
