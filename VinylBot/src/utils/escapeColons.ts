export const escapeColons = (str:string = ""): string => {
  return str.replace(/:/g, "\\:");
};
