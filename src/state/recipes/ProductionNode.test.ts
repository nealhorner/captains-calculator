import { describe, it, expect } from 'vitest';

import ProductionNode from './ProductionNode';
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
  it('initializes inputs/outputs from the recipe with zeroed import/export state', () => {
    const node = buildNode('acid_mixing');

    expect(node.machinesCount).toBe(1);
    expect(node.id).toContain('acid_mixing_');

    Object.values(node.inputs).forEach((input) => {
      expect(input.imported).toBe(0);
      expect(input.maxed).toBe(false);
      expect(input.imports).toEqual([]);
    });

    Object.values(node.outputs).forEach((output) => {
      expect(output.exported).toBe(0);
      expect(output.maxed).toBe(false);
      expect(output.exports).toEqual([]);
    });
  });

  it('canImport/canExport reflect maxed state', () => {
    const node = buildNode('acid_mixing');
    const [outputId] = Object.keys(node.outputs);

    expect(node.canImport('nonexistent-product')).toBe(false);
    expect(node.canExport('nonexistent-product')).toBe(false);
    expect(node.canExport(outputId)).toBe(true);

    node.outputs[outputId].maxed = true;
    expect(node.canExport(outputId)).toBe(false);
  });

  it('addImport imports up to the remaining quantity needed and marks maxed once satisfied', () => {
    const node = buildNode('acid_dumping');
    const [inputId] = Object.keys(node.inputs);
    const needed = node.inputs[inputId].quantity;

    // Import less than needed - not maxed yet
    const partial = node.addImport(inputId, 'source-a', needed / 2);
    expect(partial).toBe(needed / 2);
    expect(node.inputs[inputId].imported).toBe(needed / 2);
    expect(node.inputs[inputId].maxed).toBe(false);

    // Import more than the remainder - clamps to what's left and maxes out
    const remainder = node.addImport(inputId, 'source-b', needed * 10);
    expect(remainder).toBe(needed / 2);
    expect(node.inputs[inputId].imported).toBe(needed);
    expect(node.inputs[inputId].maxed).toBe(true);
    expect(node.inputs[inputId].imports).toEqual([
      { source: 'source-a', quantity: needed / 2 },
      { source: 'source-b', quantity: needed / 2 },
    ]);

    // Already maxed - can't import any more
    expect(node.addImport(inputId, 'source-c', 1)).toBe(false);
  });

  it('addExport accumulates exports and marks maxed once quantity is met', () => {
    const node = buildNode('acid_mixing');
    const [outputId] = Object.keys(node.outputs);
    const quantity = node.outputs[outputId].quantity;

    node.addExport(outputId, 'target-a', quantity);

    expect(node.outputs[outputId].exported).toBe(quantity);
    expect(node.outputs[outputId].maxed).toBe(true);
    expect(node.outputs[outputId].exports).toEqual([{ target: 'target-a', quantity }]);
  });

  it('removeExport reverses a prior export for the given target and leaves others intact', async () => {
    const node = buildNode('acid_mixing');
    const [outputId] = Object.keys(node.outputs);

    node.addExport(outputId, 'target-a', 10);
    node.addExport(outputId, 'target-b', 20);
    expect(node.outputs[outputId].exported).toBe(30);

    await node.removeExport(outputId, 'target-a');

    expect(node.outputs[outputId].exported).toBe(20);
    expect(node.outputs[outputId].exports).toEqual([{ target: 'target-b', quantity: 20 }]);
  });

  it('toJson/fromJSON round-trips the node data', () => {
    const node = buildNode('acid_dumping');
    const [inputId] = Object.keys(node.inputs);
    node.addImport(inputId, 'source-a', 1);

    const restored = ProductionNode.fromJSON({ ...JSON.parse(node.toJson()), id: node.id });

    expect(restored.recipe.id).toBe(node.recipe.id);
    expect(restored.inputs).toEqual(node.inputs);
    expect(restored.outputs).toEqual(node.outputs);
    expect(restored.canImport).toBeInstanceOf(Function);
  });

  it('fromJSON throws on malformed data', () => {
    expect(() => ProductionNode.fromJSON(null as any)).toThrow('Invalid persisted production node');
    expect(() => ProductionNode.fromJSON({} as any)).toThrow('Invalid persisted production node');
  });

  it('nodeData/edgeData expose react-flow-shaped data derived from imports', () => {
    const source = buildNode('acid_mixing');
    const target = buildNode('acid_dumping');
    const [inputId] = Object.keys(target.inputs);

    target.addImport(inputId, source.id, 1);

    expect(target.nodeData).toEqual([
      { id: target.id, type: 'RecipeNode', data: target, position: { x: 0, y: 0 } },
    ]);

    expect(target.edgeData).toHaveLength(1);
    expect(target.edgeData[0]).toMatchObject({
      id: `${source.id}-${target.id}`,
      source: source.id,
      target: target.id,
      sourceHandle: `${source.id}-${inputId}-output`,
      targetHandle: `${target.id}-${inputId}-input`,
    });
  });
});
