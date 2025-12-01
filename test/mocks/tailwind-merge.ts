export function twMerge(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}
