const BackendSelector = ({ value, onChange, disabled }) => (
  <div className="space-y-2">
    <label htmlFor="backend-select" className="text-xs uppercase tracking-[0.2em] text-sky-200">
      Backend
    </label>
    <select
      id="backend-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white focus:border-sky-300/50 focus:outline-none focus:ring-2 focus:ring-sky-300/30 disabled:opacity-60"
    >
      <option value="remote">Remote (API)</option>
      <option value="ollama">Local (Ollama)</option>
      <option value="stub">Stub</option>
    </select>
  </div>
);

export default BackendSelector;
