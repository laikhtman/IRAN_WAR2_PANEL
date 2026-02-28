import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface KeyboardShortcutsProps {
  onToggleMute: () => void;
  onTogglePresentation: () => void;
}

const shortcuts = [
  { key: "F", description: "Toggle fullscreen / presentation mode" },
  { key: "M", description: "Toggle mute / unmute alerts" },
  { key: "?", description: "Show / hide this help overlay" },
  { key: "Esc", description: "Close overlay / exit fullscreen" },
];

export function KeyboardShortcuts({ onToggleMute, onTogglePresentation }: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in form fields
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key.toLowerCase()) {
        case "f":
          e.preventDefault();
          onTogglePresentation();
          break;
        case "m":
          e.preventDefault();
          onToggleMute();
          break;
        case "?":
          e.preventDefault();
          setShowHelp(prev => !prev);
          break;
        case "escape":
          if (showHelp) {
            e.preventDefault();
            setShowHelp(false);
          }
          break;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onToggleMute, onTogglePresentation, showHelp]);

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {shortcuts.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between gap-4 px-2 py-1.5 rounded-md hover:bg-muted/50">
              <span className="text-sm text-muted-foreground">{description}</span>
              <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-muted px-2 text-xs font-mono font-semibold text-foreground">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Press <kbd className="text-[11px] font-mono border border-border rounded px-1">?</kbd> to toggle this overlay
        </p>
      </DialogContent>
    </Dialog>
  );
}
