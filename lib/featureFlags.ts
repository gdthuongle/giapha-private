export const featureFlags = {
  readFamilies: process.env.NEXT_PUBLIC_FF_READ_FAMILIES === "true",
  writeFamilies: process.env.NEXT_PUBLIC_FF_WRITE_FAMILIES === "true",
  readPersonNames: process.env.NEXT_PUBLIC_FF_READ_PERSON_NAMES === "true",
  readEvents: process.env.NEXT_PUBLIC_FF_READ_EVENTS === "true",
  writeEvents: process.env.NEXT_PUBLIC_FF_WRITE_EVENTS === "true",
};
