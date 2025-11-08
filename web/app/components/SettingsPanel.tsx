"use client";

export type Settings = { system: string; temperature: number; maxTokens: number };

export default function SettingsPanel({
  value, onChange,
}: { value: Settings; onChange: (v: Settings) => void }) {
  return (
    <div className="p-3 space-y-4">
      <div>
        <div className="text-sm mb-2">System Prompt</div>
        <textarea
          className="w-full rounded border p-2 text-sm"
          rows={5}
          value={value.system}
          onChange={(e) => onChange({ ...value, system: e.target.value })}
        />
      </div>
      <div>
        <div className="text-sm mb-2">Temperature: {value.temperature.toFixed(2)}</div>
        <input
          type="range" min={0} max={2} step={0.01}
          value={value.temperature}
          onChange={(e) => onChange({ ...value, temperature: Number(e.target.value) })}
          className="w-full"
        />
      </div>
      <div>
        <div className="text-sm mb-2">Max tokens: {value.maxTokens}</div>
        <input
          type="range" min={64} max={4096} step={32}
          value={value.maxTokens}
          onChange={(e) => onChange({ ...value, maxTokens: Number(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );
}
