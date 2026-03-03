import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground font-sans">
      <span className="text-2xl font-semibold tracking-tight font-display">Cartify</span>
      <h1 className="mt-6 text-6xl font-bold">404</h1>
      <p className="mt-3 text-sm text-muted-foreground">This page doesn't exist.</p>
      <a href="/" className="mt-6 text-sm font-medium underline underline-offset-4 hover:text-muted-foreground transition-colors">
        Back to home
      </a>
    </div>
  );
};

export default NotFound;
