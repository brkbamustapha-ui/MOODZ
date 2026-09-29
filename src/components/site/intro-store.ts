/**
 * État du rideau d'ouverture, partagé entre l'intro et le reste de la page
 * (le hero ne s'anime qu'une fois le rideau levé).
 */

export const INTRO_SESSION_KEY = "moodz-intro-seen";

type IntroState = "playing" | "done";

let finished = false;
const listeners = new Set<() => void>();

export const introStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): IntroState {
    // Le script de démarrage marque <html data-intro="skip"> si l'intro a déjà été vue
    return finished || document.documentElement.dataset.intro === "skip" ? "done" : "playing";
  },
  getServerSnapshot(): IntroState {
    return "playing";
  },
  finish() {
    if (finished) return;
    finished = true;
    try {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    } catch {}
    for (const listener of listeners) listener();
  },
};
