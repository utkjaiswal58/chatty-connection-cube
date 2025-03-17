
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  return (
    <header className={cn("w-full border-b border-border/40 backdrop-blur-md bg-background/80 fixed top-0 z-50", className)}>
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link 
          to="/" 
          className="flex items-center space-x-2 transition-opacity hover:opacity-90"
        >
          <div className="relative size-8 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="absolute size-4 rounded-full bg-primary/30 animate-pulse-soft"></div>
            <div className="size-2 rounded-full bg-primary"></div>
          </div>
          <span className="font-medium text-xl tracking-tight">Connect</span>
        </Link>
        
        <nav className="hidden md:flex gap-6">
          <Link 
            to="/" 
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link 
            to="/chat" 
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Start Chat
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
