import React, { useEffect, useState } from "react";

export default function InstallPrompt() {
  const tooShort = window.innerHeight < 640;
  if (tooShort) return null;

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Never show again if dismissed
    const dismissed = localStorage.getItem("cc-install-dismissed") === "true";

    // Detect iOS
    const ua = navigator.userAgent.toLowerCase();
    const isiOS = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isiOS);

    // Detect standalone mode
    const standalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    setIsStandalone(standalone);

    // iOS: manually show banner if not dismissed & not standalone
    if (isiOS && !standalone && !dismissed) {
      setVisible(true);
    }

    // Android/Desktop install prompt handling
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();

      if (!dismissed) {
        setDeferredPrompt(e);
        setVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // --------------------
  // DISMISS BANNER
  // --------------------
  function handleDismiss() {
    localStorage.setItem("cc-install-dismissed", "true");
    setVisible(false);
  }

  // --------------------
  // INSTALL (Android / Desktop)
  // --------------------
  async function handleInstall() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setVisible(false);
  }

  // --------------------
  // ⭐ iOS MANUAL INSTALL BANNER (FIXED)
  // --------------------
  if (isIOS && !isStandalone) {
    if (!visible) return null; // <-- FIX: allow dismissal to hide banner

    return (
      <div className="cc-install-banner">
        <div className="cc-install-content">
          <p>
            Install CruiseCast: tap the <strong>Share</strong> icon and choose{" "}
            <strong>“Add to Home Screen.”</strong>
          </p>

          <button
            type="button"
            className="cc-install-close"
            aria-label="Dismiss install prompt"
            onClick={handleDismiss}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // --------------------
  // ⭐ Android / Desktop BANNER
  // --------------------
  if (!visible || !deferredPrompt) return null;

  return (
    <div className="cc-install-banner">
      <div className="cc-install-content">
        <p>Install CruiseCast for quicker access to saved cruises.</p>

        <button
          type="button"
          className="cc-install-btn"
          onClick={handleInstall}
          aria-label="Install CruiseCast"
        >
          <img
            src="/install-icon.svg"
            alt=""
            aria-hidden="true"
            width={34}
            height={34}
          />
        </button>

        <button
          type="button"
          className="cc-install-close"
          aria-label="Dismiss install prompt"
          onClick={handleDismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
}
