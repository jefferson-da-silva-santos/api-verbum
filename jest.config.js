// Necessário porque o projeto usa ESM nativo ("type": "module" no package.json).
// O script "test" já roda com NODE_OPTIONS=--experimental-vm-modules.
export default {
  testEnvironment: 'node',
  transform: {},
};
