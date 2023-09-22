export function randomID(): string {
  const buffer = new Uint8Array(13);
  window.crypto.getRandomValues(buffer);
  return btoa(String(buffer)).slice(0, 16);
}
