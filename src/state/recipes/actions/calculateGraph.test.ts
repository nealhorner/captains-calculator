import { describe, it, expect } from 'vitest';

import { calculateGraph } from './calculateGraph';

type CalculateGraphContext = Parameters<typeof calculateGraph>[0];

const buildContext = (nodesData: any[], edgesData: any[]) => {
  const state = {
    recipes: {
      nodesData,
      edgesData,
      graphData: undefined as any,
    },
  };

  const context = { state, actions: {} } as unknown as CalculateGraphContext;
  return { context, state };
};

describe('calculateGraph', () => {
  it('assigns positions to nodes and stores the result on state', async () => {
    const nodes = [
      { id: 'a', width: 100, height: 50 },
      { id: 'b', width: 100, height: 50 },
    ];
    const edges = [{ id: 'a-b', source: 'a', target: 'b' }];

    const { context, state } = buildContext(nodes, edges);

    await calculateGraph(context);

    expect(state.recipes.graphData).toHaveLength(2);
    state.recipes.graphData.forEach((node: any) => {
      expect(node.position).toBeDefined();
      expect(typeof node.position.x).toBe('number');
      expect(typeof node.position.y).toBe('number');
    });
  });

  it('handles an empty graph without error', async () => {
    const { context, state } = buildContext([], []);

    await calculateGraph(context);

    expect(state.recipes.graphData).toEqual([]);
  });
});
