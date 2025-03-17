
import { toast } from "@/hooks/use-toast";
import { MediaEnabled, MediaStreamState } from "./types";

// Function to start a local media stream
export const startLocalStream = async (mediaEnabled: MediaEnabled): Promise<MediaStream | null> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: mediaEnabled.video, 
      audio: mediaEnabled.audio 
    });
    
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
};

// Create a fake remote stream for demonstration
export const createFakeRemoteStream = (peerId: string): MediaStream => {
  // Create a fake audio stream
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
      ctx.fillText(`Remote: ${peerId}`, 20, 50);
    }, 100);
  }
  
  const fakeVideoStream = canvas.captureStream();
  
  // Combine audio and video
  const fakeTracks = [
    ...fakeVideoStream.getVideoTracks(),
    ...destination.stream.getAudioTracks()
  ];
  
  return new MediaStream(fakeTracks);
};

// Function to stop all tracks in a media stream
export const stopMediaTracks = (stream: MediaStream | null) => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};

// Function to toggle video or audio tracks
export const toggleMediaTrack = (
  stream: MediaStream | null, 
  type: 'video' | 'audio', 
  enabled: boolean
): void => {
  if (stream) {
    const tracks = type === 'video' 
      ? stream.getVideoTracks() 
      : stream.getAudioTracks();
      
    tracks.forEach(track => {
      track.enabled = enabled;
    });
  }
};
