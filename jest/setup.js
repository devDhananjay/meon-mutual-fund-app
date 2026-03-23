jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map();
  return {
    setItem: jest.fn((k, v) => Promise.resolve(storage.set(k, v))),
    getItem: jest.fn(k => Promise.resolve(storage.get(k) ?? null)),
    removeItem: jest.fn(k => Promise.resolve(storage.delete(k))),
    multiGet: jest.fn(keys =>
      Promise.resolve(keys.map(k => [k, storage.get(k) ?? null])),
    ),
    multiSet: jest.fn(pairs =>
      Promise.resolve(pairs.forEach(([k, v]) => storage.set(k, v))),
    ),
    multiRemove: jest.fn(keys =>
      Promise.resolve(keys.forEach(k => storage.delete(k))),
    ),
    clear: jest.fn(() => Promise.resolve(storage.clear())),
  };
});
