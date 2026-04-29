import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function AuthBackButton() {
  return (
    <div className="absolute top-6 left-6 z-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}
