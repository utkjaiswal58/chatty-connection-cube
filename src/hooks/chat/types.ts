
import { RefObject } from "react";

export interface MediaEnabled {
  video: boolean;
  audio: boolean;
}

export interface MediaStreamState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export interface Message {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ChatState {
  isConnecting: boolean;
  isConnected: boolean;
  isSearching: boolean;
  isTyping: boolean;
  userId: string;
  peerId: string | null;
  messages: Message[];
  mediaState: MediaStreamState;
  mediaEnabled: MediaEnabled;
}

export interface ChatRefs {
  peerConnectionRef: RefObject<RTCPeerConnection | null>;
  searchTimeoutRef: RefObject<number | null>;
  responseTimeoutRef: RefObject<number | null>;
}
