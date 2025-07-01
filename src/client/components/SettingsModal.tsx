import { Settings, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface AppearanceSettings {
  fontSize: number;
  fontFamily: string;
  theme: 'light' | 'dark' | 'auto';
  syntaxTheme: 'github-dark' | 'github-light' | 'monokai' | 'dracula';
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppearanceSettings;
  onSettingsChange: (settings: AppearanceSettings) => void;
}

const DEFAULT_SETTINGS: AppearanceSettings = {
  fontSize: 14,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
  theme: 'dark',
  syntaxTheme: 'github-dark',
};

const FONT_FAMILIES = [
  {
    name: 'System Font',
    value:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
  },
  { name: 'Menlo', value: 'Menlo, Monaco, "Courier New", monospace' },
  { name: 'SF Mono', value: 'SF Mono, Consolas, "Liberation Mono", monospace' },
  { name: 'Fira Code', value: '"Fira Code", "Courier New", monospace' },
  { name: 'JetBrains Mono', value: '"JetBrains Mono", "Courier New", monospace' },
];

const SYNTAX_THEMES = [
  { name: 'GitHub Dark', value: 'github-dark' },
  { name: 'GitHub Light', value: 'github-light' },
  { name: 'Monokai', value: 'monokai' },
  { name: 'Dracula', value: 'dracula' },
];

export function SettingsModal({ isOpen, onClose, settings, onSettingsChange }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AppearanceSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-github-bg-secondary border border-github-border rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-github-border">
          <h2 className="text-lg font-semibold text-github-text-primary flex items-center gap-2">
            <Settings size={20} />
            Appearance Settings
          </h2>
          <button
            onClick={onClose}
            className="text-github-text-secondary hover:text-github-text-primary p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-github-text-primary mb-2">
              Font Size
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="10"
                max="20"
                step="1"
                value={localSettings.fontSize}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, fontSize: parseInt(e.target.value) })
                }
                className="flex-1 accent-github-accent"
              />
              <span className="text-sm text-github-text-secondary w-8 text-right">
                {localSettings.fontSize}px
              </span>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-github-text-primary mb-2">
              Font Family
            </label>
            <select
              value={localSettings.fontFamily}
              onChange={(e) => setLocalSettings({ ...localSettings, fontFamily: e.target.value })}
              className="w-full p-2 bg-github-bg-tertiary border border-github-border rounded text-github-text-primary text-sm"
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-github-text-primary mb-2">Theme</label>
            <div className="flex gap-2">
              {(['light', 'dark', 'auto'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setLocalSettings({ ...localSettings, theme })}
                  className={`px-3 py-2 text-sm rounded border transition-colors ${
                    localSettings.theme === theme
                      ? 'bg-github-accent text-white border-github-accent'
                      : 'bg-github-bg-tertiary text-github-text-secondary border-github-border hover:text-github-text-primary'
                  }`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Syntax Theme */}
          <div>
            <label className="block text-sm font-medium text-github-text-primary mb-2">
              Syntax Highlighting Theme
            </label>
            <select
              value={localSettings.syntaxTheme}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  syntaxTheme: e.target.value as AppearanceSettings['syntaxTheme'],
                })
              }
              className="w-full p-2 bg-github-bg-tertiary border border-github-border rounded text-github-text-primary text-sm"
            >
              {SYNTAX_THEMES.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-github-border">
          <button
            onClick={handleReset}
            className="px-3 py-2 text-sm text-github-text-secondary hover:text-github-text-primary"
          >
            Reset to Default
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-github-text-secondary hover:text-github-text-primary border border-github-border rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-github-accent text-white rounded hover:bg-green-600"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { AppearanceSettings };
