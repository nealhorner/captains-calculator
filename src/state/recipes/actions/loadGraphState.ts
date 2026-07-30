import { Action } from "state/_types";
import ProductionNode from "../ProductionNode";

export const loadGraphState: Action = ({ state, effects }) => {
    let savedNodes = effects.recipes.loadGraphState()
    if (savedNodes) {
        let nodes: { [key: string]: ProductionNode } = {}
        savedNodes.forEach(data => {
            let node = ProductionNode.fromJSON(data)
            nodes[node.id] = node
        })
        state.recipes.nodes = nodes
    }
}
