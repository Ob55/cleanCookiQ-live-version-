import cleancookIqLogo from "@/assets/cleancookiq-logo.png";

interface Props {
  message?: string;
}

export default function BrandedLoader({ message = "Loading your dashboard…" }: Props) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10">
      <div className="relative h-24 w-24 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-accent animate-spin" />
        <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center shadow-inner">
          <img src={cleancookIqLogo} alt="CleanCookiQ" className="h-12 w-12 object-contain animate-pulse" />
        </div>
      </div>
      <p className="font-display font-semibold text-lg text-foreground/90">CleanCook<span className="text-accent">iQ</span></p>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
      <div className="mt-5 flex gap-1.5">
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
      </div>
    </div>
  );
}
