import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MessageSquare, Mic, Video } from "lucide-react";
import Header from "@/components/Header";
import Button from "@/components/Button";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Talk to Strangers
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with random people worldwide through video, audio or text chat.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 rounded-xl bg-card border shadow-sm"
            >
              <div className="mb-4 flex justify-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">Video Chat</h3>
              <p className="text-sm text-muted-foreground">
                Connect face-to-face with people from around the world.
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 rounded-xl bg-card border shadow-sm"
            >
              <div className="mb-4 flex justify-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className="text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">Voice Chat</h3>
              <p className="text-sm text-muted-foreground">
                Have audio conversations without sharing your video.
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-6 rounded-xl bg-card border shadow-sm"
            >
              <div className="mb-4 flex justify-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">Text Chat</h3>
              <p className="text-sm text-muted-foreground">
                Send messages back and forth in text-only mode.
              </p>
            </motion.div>
          </div>
          
          <div className="flex justify-center">
            <Link to="/chat">
              <Button size="lg" className="px-8">
                Start Chatting
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
