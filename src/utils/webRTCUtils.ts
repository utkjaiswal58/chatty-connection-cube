
// WebRTC configuration
export const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// Simple signaling server simulation using localStorage
// In production, you would use a real signaling server
export class LocalStorageSignaling {
  private userId: string;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor(userId: string) {
    this.userId = userId;
    window.addEventListener('storage', this.handleStorageEvent);
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (!event.key || !event.newValue) return;
    
    try {
      const data = JSON.parse(event.newValue);
      if (data.target === this.userId) {
        const eventType = event.key.split('_')[0];
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
      from: this.userId,
      target,
      ...data,
      timestamp: Date.now()
    };
    
    // Using localStorage as a simple signaling method
    // In production, this would be done via a server
    localStorage.setItem(`${eventType}_${Date.now()}`, JSON.stringify(message));
  }

  public cleanup() {
    window.removeEventListener('storage', this.handleStorageEvent);
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
