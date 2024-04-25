export function isStringList(value: any): value is string[] {
  return (
    value &&
    Array.isArray(value) &&
    value.every((val) => typeof val === "string")
  );
}
