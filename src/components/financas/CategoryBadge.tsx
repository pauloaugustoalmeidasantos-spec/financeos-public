import { cn } from "@/lib/utils";
import { LUCIDE_ICON_MAP } from "./CategoryManager";

interface CategoryIconDisplayProps {
  icon?: string | null;
  color?: string | null;
  size?: number; // px
  className?: string;
}

/**
 * Renders the icon for a category:
 * - dataURL (uploaded image)
 * - :lucide:<id> (Lucide icon)
 * - short string ≤4 chars = legacy emoji
 * - fallback: colored dot
 */
export function CategoryIconDisplay({ icon, color, size = 20, className }: CategoryIconDisplayProps) {
  const hex = color || "#6366F1";

  if (!icon) {
    // No icon — render colored circle as fallback
    return (
      <div
        className={cn("rounded-full flex-shrink-0", className)}
        style={{ width: size, height: size, backgroundColor: `${hex}60` }}
      />
    );
  }

  if (icon.startsWith("data:image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt="icon"
        className={cn("object-cover rounded-lg flex-shrink-0", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  if (icon.startsWith(":lucide:")) {
    const id = icon.replace(":lucide:", "");
    const IconComp = LUCIDE_ICON_MAP[id];
    if (IconComp) {
      return <IconComp className={cn("flex-shrink-0", className)} style={{ color: hex, width: size, height: size }} />;
    }
  }

  // Legacy emoji (short string)
  if (icon.length <= 6) {
    return <span className={cn("leading-none", className)} style={{ fontSize: size * 0.8 }}>{icon}</span>;
  }

  return (
    <div
      className={cn("rounded-full flex-shrink-0", className)}
      style={{ width: size, height: size, backgroundColor: `${hex}60` }}
    />
  );
}

interface CategoryBadgeProps {
  category: {
    name: string;
    color?: string | null;
    icon?: string | null;
  };
  size?: "sm" | "md";
  className?: string;
}

export function CategoryBadge({ category, size = "md", className }: CategoryBadgeProps) {
  const isSm = size === "sm";
  const hex = category.color || "#cbd5e1";
  const iconSize = isSm ? 12 : 14;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full cursor-default",
        isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className
      )}
      style={{
        backgroundColor: `${hex}18`,
        color: hex,
        border: `1px solid ${hex}35`,
      }}
    >
      <CategoryIconDisplay icon={category.icon} color={hex} size={iconSize} />
      <span>{category.name}</span>
    </div>
  );
}
