import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, CheckCircle2 } from "lucide-react";

export function FeedbackDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          email: email.trim() || undefined,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setMessage("");
        setEmail("");
      }, 2000);
    } catch {
      // silently fail — feedback is non-critical
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-[900] h-8 gap-1.5 rounded-full border-border/50 bg-card/90 backdrop-blur-sm text-[11px] shadow-lg hover:bg-card"
          aria-label="Send feedback"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-sm">Send Feedback</DialogTitle>
          <DialogDescription className="text-[11px]">
            Report issues, suggest features, or share observations about the intelligence dashboard.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <p className="text-sm text-muted-foreground">Thank you for your feedback!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              placeholder="Describe the issue or suggestion..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] text-[12px] resize-none"
              maxLength={2000}
            />
            <Input
              type="email"
              placeholder="Email (optional, for follow-up)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-[12px]"
            />
            <p className="text-[10px] text-muted-foreground">
              {message.length}/2000 characters
            </p>
          </div>
        )}

        {!sent && (
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || sending}
              size="sm"
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? "Sending..." : "Submit"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
