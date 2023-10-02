
const idBytes = 12;
const chunks = 100;
let chunk = chunks;
const randomValues = new Uint8Array(idBytes * chunks);

export function randomID(): string {
  if (chunk >= chunks) {
    window.crypto.getRandomValues(randomValues);  
    chunk = 0;
  }

  const data = new DataView(randomValues.buffer, chunk * idBytes, idBytes);
  chunk++;

  return (
    data.getUint32(0).toString(36) +
    data.getUint32(4).toString(36) +
    data.getUint32(8).toString(36)
  );
}
