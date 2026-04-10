import type { ElementType, ReactNode } from "react";

// ============================================================
// Title — 見出し用（1種類）
// ============================================================

interface TitleProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

export function Title({
  children,
  as: Tag = "h3",
  className = "",
}: TitleProps) {
  return (
    <Tag
      className={`text-[18px] font-semibold text-text leading-relaxed ${className}`}
    >
      {children}
    </Tag>
  );
}

// ============================================================
// Typography — 本文テキスト用
// ============================================================

type TypographySize = "regular" | "small";
type TypographyWeight = "normal" | "bold";

interface TypographyProps {
  children: ReactNode;
  size?: TypographySize;
  weight?: TypographyWeight;
  as?: ElementType;
  muted?: boolean;
  secondary?: boolean;
  className?: string;
}

const SIZE_CLASS: Record<TypographySize, string> = {
  regular: "text-[16px]",
  small: "text-sm",
};

const WEIGHT_CLASS: Record<TypographyWeight, string> = {
  normal: "font-normal",
  bold: "font-medium",
};

export function Typography({
  children,
  size = "regular",
  weight = "normal",
  as: Tag = "p",
  muted = false,
  secondary = false,
  className = "",
}: TypographyProps) {
  const colorClass = muted
    ? "text-text-muted"
    : secondary
      ? "text-text-secondary"
      : "text-text";

  return (
    <Tag
      className={`${SIZE_CLASS[size]} ${WEIGHT_CLASS[weight]} ${colorClass} leading-relaxed ${className}`}
    >
      {children}
    </Tag>
  );
}
