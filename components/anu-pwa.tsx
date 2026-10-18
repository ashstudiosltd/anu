"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function AnuPwa() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const refresh = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const frame = window.requestAnimationFrame(() => {
      refresh();
      setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    });
    const prompt = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    const done = () => { setInstalled(true); setInstall(null); };
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", done);
    standalone.addEventListener("change", refresh);
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((result) => { if (active) { registration = result; void result.update().catch(() => {}); } })
        .catch(() => { /* Browsers can disallow service workers; online chat still works. */ });
    }
    const check = () => { if (document.visibilityState === "visible") void registration?.update().catch(() => {}); };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", done);
      standalone.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
    };
  }, []);

  useEffect(() => {
    if (help && !dialog.current?.open) dialog.current?.showModal();
    else if (!help && dialog.current?.open) dialog.current.close();
  }, [help]);

  if (installed || (!install && !ios)) return null;
  return <>
    <button className="side-link pwa-install" title="Install Anu" aria-label="Install Anu" onClick={async () => {
      if (!install) { setHelp(true); return; }
      try { await install.prompt(); await install.userChoice; } finally { setInstall(null); }
    }}><Download size={16} /><span>Install Anu</span></button>
    <dialog ref={dialog} className="privacy-dialog" aria-labelledby="install-heading" onClose={() => setHelp(false)} onClick={(event) => { if (event.target === event.currentTarget) setHelp(false); }}>
      <div className="dialog-heading"><Download size={22} /><button className="icon-button" aria-label="Close install help" onClick={() => setHelp(false)}><X size={18} /></button></div>
      <h2 id="install-heading">Anu, on your home screen.</h2>
      <p>Open Anu in Safari, tap Share, then Add to Home Screen. Turn on Open as Web App if it appears, then tap Add.</p>
      <p>Chat needs an internet connection. New deployments appear when you reopen Anu.</p>
    </dialog>
  </>;
}
