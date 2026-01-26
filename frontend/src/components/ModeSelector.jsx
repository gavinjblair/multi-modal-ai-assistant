import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, StickyNote } from "lucide-react";

const MODES = [
  { value: "general", label: "General", hint: "Balanced description", icon: Sparkles },
  { value: "safety", label: "Safety", hint: "Call out risks", icon: ShieldCheck },
  { value: "slide_summary", label: "Slides", hint: "Summarise slides", icon: StickyNote },
];

const ModeSelector = ({ mode, onChange, disabled }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="uppercase tracking-[0.2em] text-xs text-sky-200">Mode</p>
        <p className="text-xs text-slate-400">Adjust answer style</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {MODES.map((option) => {
          const ActiveIcon = option.icon;
          const isActive = mode === option.value;
          return (
            <motion.button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              whileHover={{ scale: disabled ? 1 : 1.02 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              className={`chip ${isActive ? "chip-active" : ""} ${
                disabled ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <ActiveIcon className="h-4 w-4" />
              {option.label}
              <span className="text-[11px] text-slate-300/90">• {option.hint}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ModeSelector;
