import { Category, Machine, Product, Recipe, RecipeProduct } from "state/app/effects"
import { ProductRecipes } from "state/_types";
import { Edge }  from 'react-flow-renderer';

import { RecipeNode } from "components/calculator/Editor";
import { EPSILON } from "utils/numbers";
import { SolverNode, SolverNodeKind, SolverNodeSolution, meetsRate } from "./solver";

type ProductionNodeParams = {
    recipe: Recipe;
    machine: Machine;
    category: Category;
    inputs: (Product & RecipeProduct)[];
    outputs: (Product & RecipeProduct)[];
    sources: ProductRecipes;
    targets: ProductRecipes;
}

export type RecipeIOImport =  {
    /** What this node needs, per 60s: quantity * machinesCount. */
    rate: number;
    /** What linked sources actually supply, per 60s. */
    imported: number;
    /** Shortfall that has to be fed in from outside the chain. */
    deficit: number;
    /** Whether `imported` covers `rate` — i.e. no room for another source. */
    satisfied: boolean;
    imports: {
        source: string;
        quantity: number;
    }[]
}

export type RecipeIOExport =  {
    /** What this node produces, per 60s: quantity * machinesCount. */
    rate: number;
    /** What downstream consumers draw, per 60s. */
    exported: number;
    /** Produced but unconsumed. */
    surplus: number;
    /** Whether the whole output is consumed downstream. */
    satisfied: boolean;
    exports: {
        target: string;
        quantity: number;
    }[]
}

export type RecipeIOImportProduct = Product & RecipeProduct & RecipeIOImport
export type RecipeIOExportProduct = Product & RecipeProduct & RecipeIOExport

export type RecipeIODictInput = {
    [index: string]: RecipeIOImportProduct
}

export type RecipeIODictOutput= {
    [index: string]: RecipeIOExportProduct
}

/**
 * Monotonic suffix for node ids. Nodes are now created programmatically — a
 * target can mint a root and its suppliers in one tick — so a timestamp is not
 * unique enough.
 */
let nodeSequence = 0

class ProductionNode {

    id: string;
    recipe: Recipe;
    machine: Machine;
    category: Category;

    inputs: RecipeIODictInput;
    outputs: RecipeIODictOutput;

    sources: ProductRecipes;
    targets: ProductRecipes;

    duration: number = 60;
    /** Derived from the demand on this node's outputs. Fractional by design. */
    machinesCount: number = 1;
    /** Set when the user types a count by hand, which then wins over the derived one. */
    pinnedMachinesCount: number | null = null;

    constructor( { recipe, machine, category, inputs, outputs, sources, targets }: ProductionNodeParams ) {

        this.id = `${recipe.id}_${++nodeSequence}`
        this.recipe = {...recipe}
        this.machine = {...machine}
        this.category = {...category}

        this.machinesCount = 1

        let inputProducts = inputs.reduce((items,item)=>({
            ...items,
            [item.id]: {
                ...item,
                quantity: item.quantity,
                rate: item.quantity,
                imported: 0,
                deficit: item.quantity,
                satisfied: false,
                imports: []
            }
        }),{})

        let outputProducts = outputs.reduce((items,item)=>({
            ...items,
            [item.id]: {
                ...item,
                quantity: item.quantity,
                rate: item.quantity,
                exported: 0,
                surplus: item.quantity,
                satisfied: false,
                exports: []
            }
        }),{})

        this.inputs = inputProducts
        this.outputs = outputProducts

        this.sources = sources
        this.targets = targets
    }

    /**
     * Normalises a raw recipe quantity to a per-60-second rate. Every recipe in
     * the current data set already has a duration of 60, so this is presently
     * the identity — it is here so the math stays correct if the game data ever
     * ships other durations.
     */
    calculateProduct60(originalDuration: number, quantity: number) {
        return (this.duration/originalDuration) * quantity
    }

    /** How this node behaves when the solver sizes it. */
    get kind(): SolverNodeKind {
        if (this.machine.isStorage) return 'passthrough'
        let outputs = Object.values(this.outputs)
        // Mines and wells carry a zero output quantity in the data, so there is
        // no rate to scale and they simply supply what is asked of them.
        if (this.machine.isMine) return 'infinite'
        if (outputs.length && outputs.every(output => output.quantity === 0)) return 'infinite'
        return 'normal'
    }

    /**
     * Records that `sourceNodeId` supplies `productId` to this node. Quantities
     * are resolved by the solver, so this only touches topology.
     */
    addImportLink(productId: string, sourceNodeId: string): boolean {
        if (!this.inputs.hasOwnProperty(productId)) return false
        if (this.inputs[productId].imports.some(i => i.source === sourceNodeId)) return false
        this.inputs[productId].imports.push({ source: sourceNodeId, quantity: 0 })
        return true
    }

    removeImportLink(productId: string, sourceNodeId: string): void {
        if (!this.inputs.hasOwnProperty(productId)) return
        this.inputs[productId].imports = this.inputs[productId].imports.filter(i => i.source !== sourceNodeId)
    }

    /** Mirror of `addImportLink` on the supplying side, for edge rendering. */
    addExportLink(productId: string, targetNodeId: string): boolean {
        if (!this.outputs.hasOwnProperty(productId)) return false
        if (this.outputs[productId].exports.some(e => e.target === targetNodeId)) return false
        this.outputs[productId].exports.push({ target: targetNodeId, quantity: 0 })
        return true
    }

    removeExportLink(productId: string, targetNodeId: string): void {
        if (!this.outputs.hasOwnProperty(productId)) return
        this.outputs[productId].exports = this.outputs[productId].exports.filter(e => e.target !== targetNodeId)
    }

    /** Drops every link to and from `nodeId`, in both directions. */
    removeLinksTo(nodeId: string): void {
        Object.keys(this.inputs).forEach(productId => this.removeImportLink(productId, nodeId))
        Object.keys(this.outputs).forEach(productId => this.removeExportLink(productId, nodeId))
    }

    /** The shape the solver consumes. Topology and raw quantities only. */
    toSolverNode(): SolverNode {

        let recipeInputs: { [productId: string]: number } = {}
        let recipeOutputs: { [productId: string]: number } = {}
        let imports: { [productId: string]: { source: string }[] } = {}

        Object.values(this.inputs).forEach(input => {
            recipeInputs[input.id] = this.calculateProduct60(this.recipe.duration, input.quantity)
            imports[input.id] = input.imports.map(i => ({ source: i.source }))
        })

        Object.values(this.outputs).forEach(output => {
            recipeOutputs[output.id] = this.calculateProduct60(this.recipe.duration, output.quantity)
        })

        return {
            id: this.id,
            recipeInputs,
            recipeOutputs,
            imports,
            kind: this.kind,
            pinnedMachinesCount: this.pinnedMachinesCount
        }

    }

    /** Writes a solver result back onto this node. The only place rates are set. */
    applySolution(solution: SolverNodeSolution | undefined): void {

        if (!solution) return

        this.machinesCount = solution.machinesCount

        Object.values(this.inputs).forEach(input => {
            let rate = solution.inputRates[input.id] ?? 0
            let imported = solution.importedRates[input.id] ?? 0
            let flows = solution.importFlows[input.id] ?? []
            input.rate = rate
            input.imported = imported
            input.deficit = Math.max(0, rate - imported)
            input.satisfied = meetsRate(imported, rate)
            input.imports.forEach(link => {
                let flow = flows.find(f => f.source === link.source)
                link.quantity = flow ? flow.quantity : 0
            })
        })

        Object.values(this.outputs).forEach(output => {
            let rate = solution.outputRates[output.id] ?? 0
            let exported = solution.exportedRates[output.id] ?? 0
            output.rate = rate
            output.exported = exported
            output.surplus = Math.max(0, rate - exported)
            output.satisfied = meetsRate(exported, rate)
        })

    }

    /** Buildings actually constructed — you cannot build a fraction of one. */
    get buildingsRequired(): number {
        return Math.ceil(this.machinesCount - EPSILON)
    }

    toJson() {
        return JSON.stringify({
            recipe: this.recipe,
            machine: this.machine,
            category: this.category,
            inputs: this.inputs,
            outputs: this.outputs,
            duration: this.duration,
            machinesCount: this.machinesCount
        })
    }

    /**
     * A plain snapshot of everything the graph node renders.
     *
     * This has to be a copy rather than `this`: Overmind's derived state only
     * recomputes when the values it actually reads change, and React Flow
     * memoises nodes on `data` identity. Returning the live instance would track
     * nothing but `id` and hand React Flow an object whose identity never
     * changes, so re-sizing the chain would never reach the canvas.
     */
    get nodeData(): RecipeNode[] {

        let inputs: RecipeIODictInput = {}
        Object.values(this.inputs).forEach(input => {
            inputs[input.id] = { ...input, imports: input.imports.map(i => ({ ...i })) }
        })

        let outputs: RecipeIODictOutput = {}
        Object.values(this.outputs).forEach(output => {
            outputs[output.id] = { ...output, exports: output.exports.map(e => ({ ...e })) }
        })

        let mainNode = {
            id: this.id,
            type: 'RecipeNode',
            data: {
                id: this.id,
                recipe: this.recipe,
                machine: this.machine,
                category: this.category,
                inputs,
                outputs,
                sources: this.sources,
                targets: this.targets,
                machinesCount: this.machinesCount,
                pinnedMachinesCount: this.pinnedMachinesCount,
                buildingsRequired: this.buildingsRequired
            },
            position: { x: 0, y: 0 }
        }

        return [ mainNode ]
    }

    get edgeData(): Edge<any>[] {
        let edges: Edge<any>[] = []

        Object.values(this.inputs).forEach(input=>{
            input.imports.forEach(item=>{
                // No style here — the editor colours edges from their id, so that
                // re-sizing the chain does not recolour the whole graph.
                edges.push({
                    id: `${item.source}-${this.id}-${input.id}`,
                    source: item.source,
                    sourceHandle: `${item.source}-${input.id}-output`,
                    target: this.id,
                    targetHandle: `${this.id}-${input.id}-input`
                })
            })
        })
        return edges
    }

}

export default ProductionNode
