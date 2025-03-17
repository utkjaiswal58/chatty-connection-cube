
import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

// In a real app, this would be implemented with WebSockets
// For this demo, we'll simulate the behavior
const TYPING_DURATION = 2000; // milliseconds
const RESPONSE_DELAY = 3000; // milliseconds
const CONNECT_DELAY = 2000; // milliseconds
const DISCONNECT_DELAY = 1000; // milliseconds

// Sample responses
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

const useChat = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<{
    content: string;
    isUser: boolean;
    timestamp: Date;
  }[]>([]);

  // Function to get a random response
  const getRandomResponse = () => {
    const randomIndex = Math.floor(Math.random() * SAMPLE_RESPONSES.length);
    return SAMPLE_RESPONSES[randomIndex];
  };

  // Function to handle sending a message
  const sendMessage = useCallback((content: string) => {
    // Add user message to the chat
    const newMessage = {
      content,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, newMessage]);

    // Simulate the stranger typing
    setIsTyping(true);
    
    // Simulate a random response time
    const responseTime = Math.random() * RESPONSE_DELAY + 1000;
    
    setTimeout(() => {
      setIsTyping(false);
      
      // Add stranger's response
      const response = {
        content: getRandomResponse(),
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, response]);
    }, responseTime);
  }, []);

  // Function to connect to a new chat
  const connect = useCallback(() => {
    setIsConnecting(true);
    setMessages([]);
    
    // Simulate connection delay
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      
      toast({
        title: "Connected",
        description: "You are now chatting with a stranger.",
      });
    }, CONNECT_DELAY);
  }, []);

  // Function to disconnect from the current chat
  const disconnect = useCallback(() => {
    if (isConnected) {
      setIsConnected(false);
      
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
  }, [isConnected, connect]);

  return {
    isConnecting,
    isConnected,
    isTyping,
    messages,
    sendMessage,
    connect,
    disconnect,
  };
};

export default useChat;
