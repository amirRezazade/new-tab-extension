const DATABASE_NAME = "new-tab-dashboard-assets";
const STORE_NAME = "assets";
const WALLPAPER_KEY = "custom-wallpaper";
let databasePromise;

function openDatabase() {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error("This browser does not support local image storage."));
  }
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open wallpaper storage."));
    });
  }
  return databasePromise;
}

async function runTransaction(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = action(store);
    let result;
    if (request) {
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error || new Error("Wallpaper storage request failed."));
    }
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error("Wallpaper storage transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("Wallpaper storage transaction was aborted."));
  });
}

export function saveWallpaper(blob) {
  return runTransaction("readwrite", (store) => store.put(blob, WALLPAPER_KEY));
}

export function loadWallpaper() {
  return runTransaction("readonly", (store) => store.get(WALLPAPER_KEY));
}

export function removeWallpaper() {
  return runTransaction("readwrite", (store) => store.delete(WALLPAPER_KEY));
}
