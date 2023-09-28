export function randomID(): string {
  const buffer = new Uint8Array(12);
  window.crypto.getRandomValues(buffer);
  const data = new DataView(buffer.buffer);
  return (
    data.getUint32(0).toString(36) +
    data.getUint32(4).toString(36) +
    data.getUint32(8).toString(36)
  );
}
