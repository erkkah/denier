import { DEBUG } from "./debug";

export function randomID(prefix: string): string {
  const buffer = new Uint8Array(13);
  window.crypto.getRandomValues(buffer);
  return (DEBUG ? prefix : "") + btoa(String(buffer)).slice(0, 16);
}
