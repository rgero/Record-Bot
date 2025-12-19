export const normalizeString = (value = "") => {
  return value.toLowerCase().replace(/^(the|a|an)\s+/i, "").trim();
};