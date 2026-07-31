import { Action } from "state/_types";
import ProductionNode from "../ProductionNode";
import { isExportedGraph } from "../importExport";

export type ImportGraphResult = {
    imported: number;
    skipped: number;
    errors: string[];
}

export const importGraph: Action<unknown, ImportGraphResult> = ({ state, actions }, data) => {

    if (!isExportedGraph(data)) {
        return { imported: 0, skipped: 0, errors: ["File is not a valid Captain's Calculator export."] }
    }

    const errors: string[] = []
    const newNodes: { [key: string]: ProductionNode } = {}

    data.nodes.forEach(exportedNode => {

        const recipe = state.recipes.items[exportedNode.recipeId]

        if (!recipe) {
            errors.push(`Skipped a node — recipe "${exportedNode.recipeId}" no longer exists in the current game data.`)
            return
        }

        const machine = state.machines.items[recipe.machine]
        const category = state.categories.items[machine.category_id]
        const sources = actions.recipes.getInputSources(recipe.id)
        const targets = actions.recipes.getOutputTargets(recipe.id)

        const node = new ProductionNode({ recipe, machine, category, inputs: [], outputs: [], sources, targets })

        node.id = exportedNode.id
        node.machinesCount = exportedNode.machinesCount
        node.duration = exportedNode.duration
        node.inputs = exportedNode.inputs
        node.outputs = exportedNode.outputs

        newNodes[node.id] = node

    })

    state.recipes.nodes = newNodes
    state.recipes.currentNodeId = null
    actions.recipes.saveGraphState()

    return {
        imported: Object.keys(newNodes).length,
        skipped: data.nodes.length - Object.keys(newNodes).length,
        errors
    }

}
