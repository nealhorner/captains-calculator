import { describe, expect, it } from 'vitest';

import { exportGraph } from './exportGraph';
import { buildTestWorld } from '../testFixtures';

describe('exportGraph action', () => {
  it('exports the current nodesList from state', () => {
    const { smelterNode, casterNode } = buildTestWorld();

    const context = {
      state: {
        recipes: {
          nodesList: [smelterNode, casterNode],
        },
      },
    } as any;

    const result = exportGraph(context, undefined);

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.map((n) => n.id).sort()).toEqual([casterNode.id, smelterNode.id].sort());
  });

  it('exports nothing when there are no nodes', () => {
    const context = { state: { recipes: { nodesList: [] } } } as any;
    const result = exportGraph(context, undefined);
    expect(result.nodes).toEqual([]);
  });
});
