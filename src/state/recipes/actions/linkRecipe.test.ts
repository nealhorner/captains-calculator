import { describe, it, expect } from 'vitest'

import { linkRecipe } from './linkRecipe'
import ProductionNode from '../ProductionNode'

import recipeData from 'data/recipes.json'
import machineData from 'data/machines.json'
import productData from 'data/products.json'
import categoryData from 'data/categories.json'

const buildContext = () => {
    const state: any = {
        recipes: { items: recipeData, nodes: {} },
        machines: { items: machineData },
        categories: { items: categoryData },
        products: { items: productData },
    }

    const actions: any = {
        recipes: {
            getInputSources: () => ({}),
            getOutputTargets: () => ({}),
        },
    }

    return { state, actions }
}

const buildNode = (recipeId: string): ProductionNode => {
    const recipe = (recipeData as any)[recipeId]
    const machine = (machineData as any)[recipe.machine]
    const category = (categoryData as any)[machine.category_id]
    const inputs = recipe.inputs.map(({ id, quantity }: any) => ({ ...(productData as any)[id], quantity }))
    const outputs = recipe.outputs.map(({ id, quantity }: any) => ({ ...(productData as any)[id], quantity }))
    return new ProductionNode({ recipe, machine, category, inputs, outputs, sources: {}, targets: {} })
}

describe('linkRecipe', () => {

    it('creates a new node and links it as an input source to the current node', async () => {
        const { state, actions } = buildContext()

        // acid_dumping needs 200 acid/min, acid_mixing produces 72 acid/min
        const currentNode = buildNode('acid_dumping')
        state.recipes.nodes[currentNode.id] = currentNode

        await linkRecipe({ state, actions } as any, {
            currentNodeId: currentNode.id,
            newNodeId: 'acid_mixing' as any,
            productId: 'acid' as any,
            direction: 'input',
        })

        const nodes = Object.values(state.recipes.nodes) as ProductionNode[]
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
        const { state, actions } = buildContext()

        const currentNode = buildNode('acid_mixing')
        state.recipes.nodes[currentNode.id] = currentNode

        await linkRecipe({ state, actions } as any, {
            currentNodeId: currentNode.id,
            newNodeId: 'acid_dumping' as any,
            productId: 'acid' as any,
            direction: 'output',
        })

        const nodes = Object.values(state.recipes.nodes) as ProductionNode[]
        const newNode = nodes.find(n => n.id !== currentNode.id)!
        expect(newNode.recipe.id).toBe('acid_dumping')

        expect(currentNode.outputs['acid'].exported).toBe(72)
        expect(currentNode.outputs['acid'].exports).toEqual([{ target: newNode.id, quantity: 72 }])

        expect(newNode.inputs['acid'].imported).toBe(72)
        expect(newNode.inputs['acid'].imports).toEqual([{ source: currentNode.id, quantity: 72 }])
    })

})
