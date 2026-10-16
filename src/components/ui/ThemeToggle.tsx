import { Moon, Sun } from "lucide-react"
import { useTheme } from "../../context/ThemeContext"

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const Icon = isDark ? Moon : Sun

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      aria-pressed={isDark}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-(--border) bg-(--surface) text-(--text-primary) shadow-sm transition-colors hover:bg-(--surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
    >
      <Icon size={15} aria-hidden="true" />
      <span className="sr-only">{isDark ? "Dark" : "Light"} theme</span>
    </button>
  )
}
