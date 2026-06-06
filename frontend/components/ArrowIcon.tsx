"use client";

interface ArrowIconProps {
  direction?: "left" | "right" | "up" | "down";
  className?: string;
  size?: number;
}

export default function ArrowIcon({
  direction = "right",
  className = "",
  size = 20,
}: ArrowIconProps) {
  const getRotation = () => {
    switch (direction) {
      case "left":
        return "rotate-180";
      case "up":
        return "-rotate-90";
      case "down":
        return "rotate-90";
      default:
        return "rotate-0";
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block transition-transform duration-200 ${getRotation()} ${className}`}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
