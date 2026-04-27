const storage = {};
module.exports = {
  getItem: jest.fn((key) => Promise.resolve(storage[key] ?? null)),
  setItem: jest.fn((key, value) => { storage[key] = value; return Promise.resolve(); }),
  removeItem: jest.fn((key) => { delete storage[key]; return Promise.resolve(); }),
  clear: jest.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); return Promise.resolve(); }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(storage))),
  multiGet: jest.fn((keys) => Promise.resolve(keys.map(k => [k, storage[k] ?? null]))),
  multiSet: jest.fn((pairs) => { pairs.forEach(([k,v]) => { storage[k] = v; }); return Promise.resolve(); }),
  multiRemove: jest.fn((keys) => { keys.forEach(k => delete storage[k]); return Promise.resolve(); }),
};
