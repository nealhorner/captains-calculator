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
    let skipped = 0

    data.nodes.forEach(exportedNode => {

        if (newNodes[exportedNode.id]) {
            skipped++
            errors.push(`Skipped a duplicate node id "${exportedNode.id}" in the import file.`)
            return
        }

        const recipe = state.recipes.items[exportedNode.recipeId]

        if (!recipe) {
            skipped++
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

    // If nothing could be imported, leave the existing chain untouched
    // rather than replacing it with an empty graph.
    if (Object.keys(newNodes).length === 0) {
        return { imported: 0, skipped, errors }
    }

    // Nodes skipped above (missing recipe, duplicate id) can still be
    // referenced by a surviving node's imports/exports. Strip those
    // dangling links so the rebuilt graph never points at a node that
    // doesn't exist.
    Object.values(newNodes).forEach(node => {

        Object.values(node.inputs).forEach(input => {
            const droppedQuantity = input.imports
                .filter(imp => !newNodes[imp.source])
                .reduce((total, imp) => total + imp.quantity, 0)
            if (droppedQuantity > 0) {
                input.imports = input.imports.filter(imp => newNodes[imp.source])
                input.imported -= droppedQuantity
                input.maxed = input.imported >= input.quantity
            }
        })

        Object.values(node.outputs).forEach(output => {
            const droppedQuantity = output.exports
                .filter(exp => !newNodes[exp.target])
                .reduce((total, exp) => total + exp.quantity, 0)
            if (droppedQuantity > 0) {
                output.exports = output.exports.filter(exp => newNodes[exp.target])
                output.exported -= droppedQuantity
                output.maxed = output.exported >= output.quantity
            }
        })

    })

    state.recipes.nodes = newNodes
    state.recipes.currentNodeId = null
    actions.recipes.saveGraphState()

    return {
        imported: Object.keys(newNodes).length,
        skipped,
        errors
    }

}
