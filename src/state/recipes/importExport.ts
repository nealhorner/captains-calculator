import { RecipeId } from 'state/app/effects/loadJsonData'
import ProductionNode, { RecipeIODictInput, RecipeIODictOutput } from './ProductionNode'

export const EXPORT_FORMAT = 'captains-calculator'
export const EXPORT_FORMAT_VERSION = 1

export type ExportedNode = {
    id: string;
    recipeId: RecipeId;
    machinesCount: number;
    duration: number;
    inputs: RecipeIODictInput;
    outputs: RecipeIODictOutput;
}

export type ExportedGraph = {
    format: typeof EXPORT_FORMAT;
    version: number;
    exportedAt: string;
    nodes: ExportedNode[];
}

export const buildExportedGraph = (nodes: ProductionNode[]): ExportedGraph => ({
    format: EXPORT_FORMAT,
    version: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    nodes: nodes.map(node => ({
        id: node.id,
        recipeId: node.recipe.id,
        machinesCount: node.machinesCount,
        duration: node.duration,
        inputs: node.inputs,
        outputs: node.outputs
    }))
})

export const isExportedGraph = (data: any): data is ExportedGraph => {
    return !!data
        && typeof data === 'object'
        && data.format === EXPORT_FORMAT
        && Array.isArray(data.nodes)
}
