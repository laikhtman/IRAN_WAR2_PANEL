import { useTranslation } from "react-i18next";
import { LANGUAGE_OPTIONS, isRTL } from "@/lib/i18n";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (value: string) => {
    i18n.changeLanguage(value);
    const dir = isRTL(value) ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = value;
  };

  return (
    <div className="flex items-center gap-1.5" data-testid="language-switcher">
      <Globe className="w-3 h-3 text-primary" />
      <Select value={i18n.language.split("-")[0]} onValueChange={handleChange}>
        <SelectTrigger
          className="h-6 w-auto min-w-[80px] text-[9px] bg-card/50 border-border px-2 py-0 gap-1"
          data-testid="language-select-trigger"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGE_OPTIONS.map((lang) => (
            <SelectItem
              key={lang.code}
              value={lang.code}
              className="text-[10px]"
              data-testid={`language-option-${lang.code}`}
            >
              {lang.nativeLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
