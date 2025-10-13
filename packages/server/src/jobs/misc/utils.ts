export function formatChainName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatCurrency(num: number) {
  const [integer, decimal = ""] = num.toString().split(".");

  if (!decimal.length) {
    return integer;
  }

  let decimalSignificantFoundAt = 0;

  for (let i = 0; i < decimal.length; i++) {
    if (decimal[i] !== "0") {
      decimalSignificantFoundAt = i;
      break;
    }
  }

  return (
    "$" +
    Intl.NumberFormat("en-US", {
      compactDisplay: "short",
      notation: "compact",
      maximumFractionDigits: decimalSignificantFoundAt + 2,
    }).format(num)
  );
}