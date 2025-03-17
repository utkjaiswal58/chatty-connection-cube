
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Button from "@/components/Button";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-16">
        <div className="max-w-4xl w-full mx-auto text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <span className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
              Anonymous Chat
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Connect with random people from around the world
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Chat anonymously with strangers in a simple, clean, and intuitive interface.
              No registration required.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/chat">
              <Button size="lg" className="min-w-40">
                Start Chatting
              </Button>
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="grid md:grid-cols-3 gap-8 mt-20"
          >
            <div className="glass p-6 rounded-xl space-y-4">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-center">Text Chat</h3>
              <p className="text-muted-foreground text-center">
                Connect with strangers through text messages instantly.
              </p>
            </div>
            
            <div className="glass p-6 rounded-xl space-y-4">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6" />
                  <path d="m9 9 6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-center">Anonymity</h3>
              <p className="text-muted-foreground text-center">
                Your identity remains completely anonymous during chats.
              </p>
            </div>
            
            <div className="glass p-6 rounded-xl space-y-4">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-center">One Click</h3>
              <p className="text-muted-foreground text-center">
                Start a new conversation with just one click.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
      
      <footer className="py-6 md:py-8 border-t">
        <div className="container px-4 md:px-6">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Connect. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
