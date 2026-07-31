import { Action } from 'state/_types';
import packageJson from '../../../../package.json';

export const loadSettings: Action = async ({ state, effects }) => {
  let settings = effects.loadLocalStorageSettings();
  if (settings) {
    state.settings = settings;
  }
  state.version = packageJson.version;
};
