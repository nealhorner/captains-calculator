import { describe, it, expect } from 'vitest'

import { linkRecipe } from './linkRecipe'
import ProductionNode from '../ProductionNode'
import { loadMachineData, loadProductData, loadRecipeData, loadCategoryData } from 'state/app/effects/loadJsonData'
import { RecipeId } from 'state/app/effects'

const recipeData = loadRecipeData()
const machineData = loadMachineData()
const productData = loadProductData()
const categoryData = loadCategoryData()

type LinkRecipeContext = Parameters<typeof linkRecipe>[0]

const buildContext = (): LinkRecipeContext => {
    const state = {
        recipes: { items: recipeData, nodes: {} as { [id: string]: ProductionNode } },
        machines: { items: machineData },
        categories: { items: categoryData },
        products: { items: productData },
    }

    const actions = {
        recipes: {
            getInputSources: () => ({}),
            getOutputTargets: () => ({}),
            saveGraphState: () => {},
        },
    }

    // linkRecipe only touches state.{recipes,machines,categories,products} and
    // actions.recipes.{getInputSources,getOutputTargets}; the full Overmind
    // context (effects/reaction/etc) is irrelevant here.
    return { state, actions } as unknown as LinkRecipeContext
}

const buildNode = (recipeId: RecipeId): ProductionNode => {
    const recipe = recipeData[recipeId]
    const machine = machineData[recipe.machine]
    const category = categoryData[machine.category_id]
    const inputs = recipe.inputs.map(({ id, quantity }) => ({ ...productData[id], quantity }))
    const outputs = recipe.outputs.map(({ id, quantity }) => ({ ...productData[id], quantity }))
    return new ProductionNode({ recipe, machine, category, inputs, outputs, sources: {}, targets: {} })
}

describe('linkRecipe', () => {

    it('creates a new node and links it as an input source to the current node', async () => {
        const context = buildContext()

        // acid_dumping needs 200 acid/min, acid_mixing produces 72 acid/min
        const currentNode = buildNode('acid_dumping')
        context.state.recipes.nodes[currentNode.id] = currentNode

        await linkRecipe(context, {
            currentNodeId: currentNode.id,
            newNodeId: 'acid_mixing',
            productId: 'acid',
            direction: 'input',
        })

        const nodes = Object.values(context.state.recipes.nodes)
        expect(nodes).toHaveLength(2)

        const newNode = nodes.find(n => n.id !== currentNode.id)!
        expect(newNode).toBeDefined()
        expect(newNode.recipe.id).toBe('acid_mixing')

        // Current node imports as much acid as the new node can export (72, since neither is a mine/storage)
        expect(currentNode.inputs['acid'].imported).toBe(72)
        expect(currentNode.inputs['acid'].imports).toEqual([{ source: newNode.id, quantity: 72 }])

        // New node exports that same quantity back to the current node
        expect(newNode.outputs['acid'].exported).toBe(72)
        expect(newNode.outputs['acid'].exports).toEqual([{ target: currentNode.id, quantity: 72 }])
    })

    it('creates a new node and links it as an output target for the current node', async () => {
        const context = buildContext()

        const currentNode = buildNode('acid_mixing')
        context.state.recipes.nodes[currentNode.id] = currentNode

        await linkRecipe(context, {
            currentNodeId: currentNode.id,
            newNodeId: 'acid_dumping',
            productId: 'acid',
            direction: 'output',
        })

        const nodes = Object.values(context.state.recipes.nodes)
        const newNode = nodes.find(n => n.id !== currentNode.id)!
        expect(newNode.recipe.id).toBe('acid_dumping')

        expect(currentNode.outputs['acid'].exported).toBe(72)
        expect(currentNode.outputs['acid'].exports).toEqual([{ target: newNode.id, quantity: 72 }])

        expect(newNode.inputs['acid'].imported).toBe(72)
        expect(newNode.inputs['acid'].imports).toEqual([{ source: currentNode.id, quantity: 72 }])
    })

})
