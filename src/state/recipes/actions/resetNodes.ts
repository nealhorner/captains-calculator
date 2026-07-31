import { Action } from "state/_types";

export const resetNodes: Action = async ({state, actions}) => {
    state.recipes.nodes = {}
    actions.recipes.saveGraphState()
}