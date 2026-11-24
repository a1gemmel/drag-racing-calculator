type Option<T extends string> = { value: T; label: string; hint?: string };

type Props<T extends string> = {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  size?: "default" | "small";
  className?: string;
};

/** A row of mutually exclusive buttons (radio-group semantics, arrow keys move the selection). */
export function Segmented<T extends string>({ label, value, options, onChange, size = "default", className }: Props<T>) {
  const move = (group: HTMLElement, delta: number) => {
    const index = options.findIndex((option) => option.value === value);
    const nextIndex = (index + delta + options.length) % options.length;
    onChange(options[nextIndex].value);
    group.querySelectorAll<HTMLButtonElement>("button")[nextIndex]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={["segmented", size === "small" ? "segmented-small" : "", className ?? ""].join(" ").trim()}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          move(event.currentTarget, 1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          move(event.currentTarget, -1);
        }
      }}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            title={option.hint}
            className={checked ? "segment active" : "segment"}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
