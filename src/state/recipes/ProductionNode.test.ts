import { describe, it, expect } from 'vitest';

import ProductionNode, { reserveNodeId } from './ProductionNode';
import {
  loadMachineData,
  loadProductData,
  loadRecipeData,
  loadCategoryData,
} from 'state/app/effects/loadJsonData';
import { RecipeId } from 'state/app/effects';

const recipeData = loadRecipeData();
const machineData = loadMachineData();
const productData = loadProductData();
const categoryData = loadCategoryData();

const buildNode = (recipeId: RecipeId): ProductionNode => {
  const recipe = recipeData[recipeId];
  const machine = machineData[recipe.machine];
  const category = categoryData[machine.category_id];
  const inputs = recipe.inputs.map(({ id, quantity }) => ({ ...productData[id], quantity }));
  const outputs = recipe.outputs.map(({ id, quantity }) => ({ ...productData[id], quantity }));
  return new ProductionNode({
    recipe,
    machine,
    category,
    inputs,
    outputs,
    sources: {},
    targets: {},
  });
};

describe('ProductionNode', () => {
  it('initialises inputs and outputs from the recipe, unsupplied', () => {
    const node = buildNode('acid_mixing');

    expect(node.machinesCount).toBe(1);
    expect(node.pinnedMachinesCount).toBeNull();
    expect(node.id).toContain('acid_mixing_');

    Object.values(node.inputs).forEach((input) => {
      expect(input.imported).toBe(0);
      expect(input.satisfied).toBe(false);
      expect(input.imports).toEqual([]);
    });

    Object.values(node.outputs).forEach((output) => {
      expect(output.exported).toBe(0);
      expect(output.satisfied).toBe(false);
      expect(output.exports).toEqual([]);
    });
  });

  it('gives every node a distinct id, even within the same millisecond', () => {
    const ids = new Set([1, 2, 3, 4, 5].map(() => buildNode('acid_mixing').id));
    expect(ids.size).toBe(5);
  });

  it('keeps generated ids clear of any restored from a saved graph', () => {
    reserveNodeId('acid_mixing_9999');
    // The counter is module state, so assert it moved past the reservation
    // rather than pinning an exact value that other tests could shift.
    const id = buildNode('acid_mixing').id;
    expect(id).toMatch(/^acid_mixing_\d+$/);
    expect(Number(id.slice(id.lastIndexOf('_') + 1))).toBeGreaterThan(9999);
  });

  describe('links', () => {
    it('records an import link without assigning a quantity', () => {
      const node = buildNode('acid_mixing');

      expect(node.addImportLink('sulfur', 'source-1')).toBe(true);
      // Quantities belong to the solver, not to the link.
      expect(node.inputs['sulfur'].imports).toEqual([{ source: 'source-1', quantity: 0 }]);
    });

    it('refuses a link for a product the recipe does not use', () => {
      const node = buildNode('acid_mixing');

      expect(node.addImportLink('not_an_input', 'source-1')).toBe(false);
      expect(node.addExportLink('not_an_output', 'target-1')).toBe(false);
    });

    it('ignores a duplicate link to the same node', () => {
      const node = buildNode('acid_mixing');

      node.addImportLink('sulfur', 'source-1');
      expect(node.addImportLink('sulfur', 'source-1')).toBe(false);
      expect(node.inputs['sulfur'].imports).toHaveLength(1);
    });

    it('removes links in both directions for a given node', () => {
      const node = buildNode('acid_mixing');
      node.addImportLink('sulfur', 'other');
      node.addExportLink('acid', 'other');

      node.removeLinksTo('other');

      expect(node.inputs['sulfur'].imports).toEqual([]);
      expect(node.outputs['acid'].exports).toEqual([]);
    });
  });

  it('classifies mines as infinite and storage as pass-through', () => {
    // Mining recipes carry a zero output quantity, so there is no rate to scale.
    expect(buildNode('iron_mining').kind).toBe('infinite');
    expect(buildNode('acid_storage').kind).toBe('passthrough');
    expect(buildNode('acid_mixing').kind).toBe('normal');
  });

  it('rounds fractional counts up to whole buildings to construct', () => {
    const node = buildNode('acid_mixing');

    node.machinesCount = 2.08;
    expect(node.buildingsRequired).toBe(3);

    node.machinesCount = 3;
    expect(node.buildingsRequired).toBe(3);
  });

  it('serialises only the choices, not the derived rates', () => {
    const node = buildNode('acid_mixing');
    node.pinnedMachinesCount = 4;
    node.addImportLink('sulfur', 'source-1');

    expect(node.toSerialized()).toEqual({
      id: node.id,
      recipeId: 'acid_mixing',
      pinnedMachinesCount: 4,
      imports: { sulfur: ['source-1'] },
    });
  });

  it('exposes react-flow data derived from its links', () => {
    const node = buildNode('acid_mixing');
    node.addImportLink('sulfur', 'source-1');

    const [flowNode] = node.nodeData;
    expect(flowNode.id).toBe(node.id);
    expect(flowNode.type).toBe('RecipeNode');

    const [edge] = node.edgeData;
    // The id format is a consumed contract: EditorWrapper derives each edge's
    // colour from it.
    expect(edge.id).toBe(`source-1-${node.id}-sulfur`);
    expect(edge.source).toBe('source-1');
    expect(edge.target).toBe(node.id);
    expect(edge.sourceHandle).toBe('source-1-sulfur-output');
    expect(edge.targetHandle).toBe(`${node.id}-sulfur-input`);
  });
});
