import { Action } from 'state/_types';

export const saveGraphState: Action = ({ state, effects }) => {
  effects.recipes.saveGraphState(state.recipes.nodes);
};
