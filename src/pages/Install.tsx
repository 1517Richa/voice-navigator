import { useEffect, useState } from 'react';
import { Download, Smartphone, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  const goToApp = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* App Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-3xl bg-card border-2 border-primary flex items-center justify-center shadow-[var(--glow-primary)]">
            <Smartphone className="w-12 h-12 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            Voice Navigator
          </h1>
          <p className="text-lg text-muted-foreground">
            AI-powered voice navigation for accessibility
          </p>
        </div>

        {/* Install Status */}
        {isInstalled ? (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3 p-4 bg-success/20 rounded-2xl border border-success">
              <Check className="w-6 h-6 text-success" />
              <span className="text-lg text-success font-medium">App Installed!</span>
            </div>
            <button
              onClick={goToApp}
              className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-primary text-primary-foreground rounded-2xl text-xl font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-4 focus:ring-primary/50"
            >
              Open App
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        ) : isIOS ? (
          <div className="space-y-6">
            <div className="p-6 bg-card rounded-2xl border border-border text-left space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Install on iPhone/iPad:</h2>
              <ol className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</span>
                  <span>Tap the <strong className="text-foreground">Share</strong> button at the bottom of Safari</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</span>
                  <span>Scroll and tap <strong className="text-foreground">"Add to Home Screen"</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</span>
                  <span>Tap <strong className="text-foreground">"Add"</strong> to install</span>
                </li>
              </ol>
            </div>
            <button
              onClick={goToApp}
              className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-secondary text-secondary-foreground rounded-2xl text-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Continue in Browser
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        ) : deferredPrompt ? (
          <div className="space-y-4">
            <button
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-primary text-primary-foreground rounded-2xl text-xl font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-4 focus:ring-primary/50 animate-pulse-glow"
            >
              <Download className="w-6 h-6" />
              Install App
            </button>
            <button
              onClick={goToApp}
              className="w-full px-8 py-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              Continue in Browser
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-card rounded-2xl border border-border text-left space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Install on Android:</h2>
              <ol className="space-y-3 text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</span>
                  <span>Tap the <strong className="text-foreground">menu icon</strong> (⋮) in Chrome</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</span>
                  <span>Tap <strong className="text-foreground">"Install app"</strong> or <strong className="text-foreground">"Add to Home screen"</strong></span>
                </li>
              </ol>
            </div>
            <button
              onClick={goToApp}
              className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-primary text-primary-foreground rounded-2xl text-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Open App
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Features */}
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            ✓ Works offline &nbsp;•&nbsp; ✓ Voice-first &nbsp;•&nbsp; ✓ No app store needed
          </p>
        </div>
      </div>
    </div>
  );
};

export default Install;
