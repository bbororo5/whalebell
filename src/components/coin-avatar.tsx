import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  WLD: "bg-black text-white",
  ETH: "bg-indigo-500 text-white",
  USDT: "bg-emerald-500 text-white",
  BTC: "bg-orange-500 text-white",
  XRP: "bg-slate-700 text-white",
  SOL: "bg-purple-500 text-white",
  DOGE: "bg-yellow-400 text-yellow-900",
  SHIB: "bg-red-500 text-white",
  PEPE: "bg-green-500 text-white",
};

export function CoinAvatar({
  symbol,
  size = "md",
  className,
}: {
  symbol: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const color = COLORS[symbol.toUpperCase()] ?? "bg-slate-400 text-white";
  const sizes =
    size === "lg" ? "h-16 w-16 text-lg" : "h-12 w-12 text-sm";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-extrabold",
        color,
        sizes,
        className,
      )}
      aria-hidden
    >
      {symbol.slice(0, 3)}
    </div>
  );
}
