export default function AuthCallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground font-sans">
      <span className="text-2xl font-semibold tracking-tight font-display">Cartify</span>
      <div className="mt-6 h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      <p className="mt-6 text-sm text-muted-foreground">
        You're being signed in. This page will close automatically.
      </p>
    </div>
  );
}
