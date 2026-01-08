export const normalizeString = (value: string = ""): string => {
  return value.toLowerCase().replace(/^(the|a|an)\s+/i, "").trim();
};