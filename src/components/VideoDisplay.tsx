
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Mic, MicOff, User, Video, VideoOff } from "lucide-react";
import Button from "./Button";
import Loading from "./Loading";

interface VideoDisplayProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  isSearching?: boolean;
  userId: string;
  peerId: string | null;
  mediaEnabled: {
    video: boolean;
    audio: boolean;
  };
  onToggleMedia: (type: 'video' | 'audio') => void;
  className?: string;
}

const VideoDisplay = ({
  localStream,
  remoteStream,
  isConnected,
  isSearching = false,
  userId,
  peerId,
  mediaEnabled,
  onToggleMedia,
  className
}: VideoDisplayProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Connect local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);
  
  // Connect remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className={cn("relative rounded-lg overflow-hidden bg-black flex flex-col", className)}>
      {/* Remote video (full size) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted={false}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isConnected && remoteStream ? "opacity-100" : "opacity-0"
        )}
      />
      
      {/* User ID badge for remote user */}
      {isConnected && peerId && (
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white flex items-center gap-2 text-sm">
          <User size={14} />
          <span className="font-medium">{peerId}</span>
        </div>
      )}
      
      {/* Overlay when not connected or searching */}
      {(!isConnected || !remoteStream) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
          {isSearching ? (
            <div className="text-center">
              <Loading size="sm" />
              <p className="mt-4">Searching for someone to chat with...</p>
            </div>
          ) : (
            <p className="text-center">
              {isConnected ? "Waiting for peer video..." : "Not connected"}
            </p>
          )}
        </div>
      )}
      
      {/* Local video (picture-in-picture) - increased size slightly for better visibility */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute bottom-16 right-4 w-1/3 max-w-[180px] aspect-video rounded-lg overflow-hidden shadow-xl border-2 border-white/20"
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* User ID badge for local user */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white flex items-center gap-1.5 text-xs">
          <User size={10} />
          <span className="font-medium">{userId}</span>
        </div>
        
        {/* Overlay when video is disabled */}
        {!mediaEnabled.video && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <VideoOff className="text-white/70" size={24} />
          </div>
        )}
      </motion.div>
      
      {/* Media controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        <Button
          variant={mediaEnabled.audio ? "default" : "destructive"}
          size="sm"
          onClick={() => onToggleMedia('audio')}
          className="rounded-full h-10 w-10 p-0 flex items-center justify-center"
        >
          {mediaEnabled.audio ? <Mic size={18} /> : <MicOff size={18} />}
        </Button>
        
        <Button
          variant={mediaEnabled.video ? "default" : "destructive"}
          size="sm"
          onClick={() => onToggleMedia('video')}
          className="rounded-full h-10 w-10 p-0 flex items-center justify-center"
        >
          {mediaEnabled.video ? <Video size={18} /> : <VideoOff size={18} />}
        </Button>
      </div>
    </div>
  );
};

export default VideoDisplay;
