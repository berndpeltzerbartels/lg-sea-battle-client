// Bound both network transfer and JSON decoding. Some embedded browsers fail to
// settle fetch after abort; a separate deadline must release the retry queue.
export async function fetchSnapshotWithDeadline(url, options, timeoutMs, controller = new AbortController()) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Zeitlimit fuer Positionsbestaetigung erreicht'));
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const snapshot = response.ok ? await response.json() : null;
        return { response, snapshot };
      })(),
      deadline
    ]);
  } finally {
    clearTimeout(timer);
  }
}
