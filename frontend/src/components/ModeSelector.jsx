import { motion } from "framer-motion";
import { MODE_OPTIONS } from "../config/modes";

const ModeSelector = ({ mode, onChange, disabled }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="uppercase tracking-[0.2em] text-xs text-sky-200">Mode</p>
        <p className="text-xs text-slate-400">Choose the analysis lens</p>
      </div>
      <div className="grid gap-3">
        {MODE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = mode === option.value;

          return (
            <motion.button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              whileHover={{ scale: disabled ? 1 : 1.01 }}
              whileTap={{ scale: disabled ? 1 : 0.99 }}
              className={`relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all ${
                isActive
                  ? `${option.accent.card} shadow-glow`
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${
                      isActive ? option.accent.badge : "border-white/10 bg-white/5 text-slate-300"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {option.eyebrow}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-white">{option.label}</div>
                    <div className="text-sm text-slate-300">{option.hint}</div>
                  </div>
                </div>
                {isActive && (
                  <div className={`rounded-full px-2 py-1 text-[11px] font-semibold ${option.accent.badge}`}>
                    Active
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-300">{option.description}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default ModeSelector;
