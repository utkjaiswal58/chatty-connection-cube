
import { cn } from "@/lib/utils";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Loading = ({ size = "md", className }: LoadingProps) => {
  const sizes = {
    sm: "size-6",
    md: "size-12",
    lg: "size-20",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className={cn("relative", sizes[size])}>
        <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin-slow"></div>
        <div className="absolute inset-1 rounded-full border-r-2 border-primary/50 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '6s' }}></div>
        <div className="absolute inset-2 rounded-full border-b-2 border-primary/30 animate-spin-slow" style={{ animationDuration: '4s' }}></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-2 bg-primary rounded-full animate-pulse-soft"></div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground animate-pulse-soft">Connecting...</p>
    </div>
  );
};

export default Loading;
