import { describe, expect, it } from 'vitest'

import { buildExportedGraph, EXPORT_FORMAT, EXPORT_FORMAT_VERSION, isExportedGraph } from './importExport'
import { buildTestWorld } from './testFixtures'

describe('buildExportedGraph', () => {

    it('returns an empty node list for an empty graph', () => {
        const graph = buildExportedGraph([])
        expect(graph.format).toBe(EXPORT_FORMAT)
        expect(graph.version).toBe(EXPORT_FORMAT_VERSION)
        expect(graph.nodes).toEqual([])
        expect(typeof graph.exportedAt).toBe('string')
    })

    it('serializes each node with the fields needed to reconstruct it', () => {
        const { smelterNode, casterNode } = buildTestWorld()

        const graph = buildExportedGraph([smelterNode, casterNode])

        expect(graph.nodes).toHaveLength(2)

        const exportedCaster = graph.nodes.find(n => n.id === casterNode.id)
        expect(exportedCaster).toBeDefined()
        expect(exportedCaster?.recipeId).toBe(casterNode.recipe.id)
        expect(exportedCaster?.machinesCount).toBe(casterNode.machinesCount)
        expect(exportedCaster?.duration).toBe(casterNode.duration)
        expect(exportedCaster?.inputs).toEqual(casterNode.inputs)
        expect(exportedCaster?.outputs).toEqual(casterNode.outputs)
    })

    it('preserves import/export linkage between nodes', () => {
        const { smelterNode, casterNode } = buildTestWorld()

        const graph = buildExportedGraph([smelterNode, casterNode])

        const exportedSmelter = graph.nodes.find(n => n.id === smelterNode.id)!
        const exportedCaster = graph.nodes.find(n => n.id === casterNode.id)!

        expect(exportedSmelter.outputs.molten_steel.exports).toEqual([{ target: casterNode.id, quantity: 12 }])
        expect(exportedCaster.inputs.molten_steel.imports).toEqual([{ source: smelterNode.id, quantity: 12 }])
    })

})

describe('isExportedGraph', () => {

    it('accepts a well-formed exported graph', () => {
        const graph = buildExportedGraph([])
        expect(isExportedGraph(graph)).toBe(true)
    })

    it.each([
        ['null', null],
        ['undefined', undefined],
        ['a string', 'hello'],
        ['a number', 42],
        ['an array', []],
        ['an object missing format', { version: 1, nodes: [] }],
        ['an object with the wrong format', { format: 'some-other-app', version: 1, nodes: [] }],
        ['an object whose nodes is not an array', { format: EXPORT_FORMAT, version: 1, nodes: 'nope' }],
    ])('rejects %s', (_label, value) => {
        expect(isExportedGraph(value)).toBe(false)
    })

})
