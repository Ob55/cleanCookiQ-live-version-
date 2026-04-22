import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const IDLE_MS = 3 * 60 * 1000; // 3 minutes before warning
const COUNTDOWN_SEC = 50;       // 50-second countdown before logout

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export default function IdleLogoutGuard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<number | null>(null);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<number | null>(null);

  const clearAll = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    idleTimer.current = null;
    countdownInterval.current = null;
  }, []);

  const startCountdown = useCallback(() => {
    countdownRef.current = COUNTDOWN_SEC;
    setCountdown(COUNTDOWN_SEC);

    countdownInterval.current = setInterval(() => {
      countdownRef.current = (countdownRef.current ?? 1) - 1;
      setCountdown(countdownRef.current);

      if (countdownRef.current <= 0) {
        clearAll();
        setCountdown(null);
        signOut().then(() => navigate("/auth/login"));
      }
    }, 1000);
  }, [clearAll, signOut, navigate]);

  const resetIdle = useCallback(() => {
    // If countdown is showing, cancel it and restart the idle timer
    if (countdownRef.current !== null) {
      clearAll();
      setCountdown(null);
      countdownRef.current = null;
    } else {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    }

    idleTimer.current = setTimeout(() => {
      startCountdown();
    }, IDLE_MS);
  }, [clearAll, startCountdown]);

  // User interacted during countdown — dismiss and reset
  const handleActivity = useCallback(() => {
    resetIdle();
  }, [resetIdle]);

  useEffect(() => {
    if (!user) return;

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    resetIdle();

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
      clearAll();
      setCountdown(null);
      countdownRef.current = null;
    };
  }, [user, handleActivity, resetIdle, clearAll]);

  const handleStayLoggedIn = () => {
    resetIdle();
  };

  const handleLogoutNow = async () => {
    clearAll();
    setCountdown(null);
    countdownRef.current = null;
    await signOut();
    navigate("/auth/login");
  };

  if (countdown === null || !user) return null;

  // Progress bar width
  const pct = Math.round((countdown / COUNTDOWN_SEC) * 100);
  const isUrgent = countdown <= 15;

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100vw-2rem)] max-w-sm"
      role="alertdialog"
      aria-live="assertive"
    >
      <div className={`rounded-2xl shadow-2xl border overflow-hidden transition-colors ${isUrgent ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
        {/* Progress bar */}
        <div className="h-1 bg-muted w-full">
          <div
            className={`h-1 transition-all duration-1000 ${isUrgent ? "bg-red-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${isUrgent ? "bg-red-100" : "bg-primary/10"}`}>
              <Clock className={`h-4 w-4 ${isUrgent ? "text-red-600" : "text-primary"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isUrgent ? "text-red-700" : "text-foreground"}`}>
                Auto-logout in {countdown} second{countdown !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You've been inactive. Move your mouse or click anywhere to stay logged in.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={handleStayLoggedIn}
              variant={isUrgent ? "default" : "default"}
            >
              Stay Logged In
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleLogoutNow}
            >
              <LogOut className="h-3.5 w-3.5" />
              Log Out
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Kindly login again if you are logged out automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
