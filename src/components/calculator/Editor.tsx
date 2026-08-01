import React from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  ControlButton,
  Position,
  NodeTypes,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowInstance,
  Connection,
  EdgeTypes,
  Edge,
  Node,
} from 'react-flow-renderer';
import dagre from 'dagre';

import { useAppState } from 'state';
import ProductionNode from 'state/recipes/ProductionNode';

import { colorFromKey, generateDarkColorHex } from 'utils/colors';

import { RecipeNodeType } from './RecipeNodeType';
import { RecipeEdgeType } from './RecipeEdgeType';
import { Box, Loader, useMantineTheme } from '@mantine/core';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import Icons from 'components/ui/Icons';

/** The plain snapshot a graph node renders — see `ProductionNode.nodeData`. */
export type RecipeNodeData = {
  id: string;
  recipe: ProductionNode['recipe'];
  machine: ProductionNode['machine'];
  category: ProductionNode['category'];
  inputs: ProductionNode['inputs'];
  outputs: ProductionNode['outputs'];
  sources: ProductionNode['sources'];
  targets: ProductionNode['targets'];
  machinesCount: number;
  pinnedMachinesCount: number | null;
  buildingsRequired: number;
};
export type RecipeNode = Node<RecipeNodeData>;

// Fallbacks for the first layout pass, before React Flow has measured anything.
// Without them dagre is handed `undefined` and returns NaN positions.
const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 320;

type Placement = { x: number; y: number };

/** Runs dagre over the whole graph and returns where each node would go. */
const computeLayout = (nodes: Node<any>[], edges: Edge<any>[]): Map<string, Placement> => {
  // A fresh graph each time: a long-lived one keeps nodes from previous
  // layouts, so deleted targets would go on influencing the arrangement.
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: 'LR',
    align: 'UR',
    nodesep: 50,
    edgesep: 50,
    ranksep: 150,
    ranker: 'network-simplex',
    acyclicer: 'greedy',
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.width || DEFAULT_NODE_WIDTH,
      height: node.height || DEFAULT_NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const placements = new Map<string, Placement>();

  nodes.forEach((node) => {
    const laid = dagreGraph.node(node.id);
    if (!laid) return;
    placements.set(node.id, {
      x: laid.x - (node.width || DEFAULT_NODE_WIDTH) / 2,
      y: laid.y - (node.height || DEFAULT_NODE_HEIGHT) / 2,
    });
  });

  return placements;
};

/** Lays every node out from scratch, discarding any manual arrangement. */
const layoutAll = <T,>(nodes: Node<T>[], edges: Edge<any>[]): Node<T>[] => {
  const placements = computeLayout(nodes, edges);
  return nodes.map((node) => ({
    ...node,
    targetPosition: Position.Right,
    sourcePosition: Position.Left,
    position: placements.get(node.id) ?? node.position,
  }));
};

const nodeTypes: NodeTypes = { RecipeNode: RecipeNodeType };
const edgeTypes: EdgeTypes = { smart: RecipeEdgeType };

type EditorProps = {
  nodesData: RecipeNode[];
  edgesData: Edge<any>[];
};

export const Editor: React.FC<EditorProps> = ({ nodesData, edgesData }) => {
  const [loading, setLoading] = React.useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesData);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesData);

  const instanceRef = React.useRef<ReactFlowInstance<RecipeNodeData> | null>(null);

  /**
   * The editor only remounts when the set of nodes changes (see the key in
   * `EditorWrapper`), so this covers the common case: the chain was re-sized
   * and every node needs fresh numbers while staying exactly where it is.
   */
  React.useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        const fresh = nodesData.find((item) => item.id === node.id);
        return fresh ? { ...node, data: fresh.data } : node;
      }),
    );
  }, [nodesData, setNodes]);

  React.useEffect(() => {
    setEdges((current) => {
      const existing = new Map(current.map((edge) => [edge.id, edge]));
      return edgesData.map((item) => {
        const previous = existing.get(item.id);
        return previous ? { ...previous, ...item } : item;
      });
    });
  }, [edgesData, setEdges]);

  /** Re-runs the automatic arrangement, discarding manual positioning. */
  const handleRelayout = React.useCallback(() => {
    setNodes((current) => layoutAll(current, edges));
    window.setTimeout(() => {
      instanceRef.current?.fitView({ padding: 0.2, includeHiddenNodes: false, duration: 200 });
    }, 0);
  }, [edges, setNodes]);

  const onConnect = async (params: Connection) => {
    // @ts-ignore
    params.style.stroke = generateDarkColorHex();
    setEdges((eds) => addEdge(params, eds));
  };

  const onInit = async (reactFlowInstance: ReactFlowInstance<RecipeNodeData>) => {
    instanceRef.current = reactFlowInstance;
    reactFlowInstance.setCenter(0, 0);
    reactFlowInstance.setNodes(
      layoutAll(reactFlowInstance.getNodes(), reactFlowInstance.getEdges()),
    );
    reactFlowInstance.fitView({ padding: 0.2, includeHiddenNodes: false, duration: 100 });
    setLoading(false);
  };

  return (
    <React.Fragment>
      <AnimatePresence>
        {loading && (
          <motion.div
            variants={{
              enter: { opacity: 0, transition: { duration: 0 } },
              target: { opacity: 1, transition: { duration: 0 } },
              exit: { opacity: 0, transition: { duration: 0.5 } },
            }}
            initial="enter"
            animate="target"
            exit="exit"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              zIndex: 9999,
            }}
          >
            <Box
              sx={(theme) => ({
                background:
                  theme.colorScheme === 'light' ? theme.colors.white : theme.colors.dark[7],
                backgroundImage: `url("/img/${theme.colorScheme === 'light' ? 'squared-metal.png' : 'squared-metal-inverted.png'}")`,
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                zIndex: 9999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              })}
            >
              <Loader size="xl" color="dark" />
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          style: { stroke: '#000', strokeWidth: 3 },
          animated: true,
          type: 'smart',
        }}
        snapToGrid
        maxZoom={1}
        minZoom={0.1}
        nodesConnectable={true}
      >
        <MiniMap />
        <Controls>
          <ControlButton onClick={handleRelayout} title="Tidy up layout">
            <Icon icon={Icons.layout} />
          </ControlButton>
        </Controls>
      </ReactFlow>
    </React.Fragment>
  );
};

export const EditorWrapper = () => {
  const theme = useMantineTheme();
  const { nodesData, edgesData } = useAppState((state) => state.recipes);

  // Colour each edge from its own id rather than at random, and only rebuild
  // the styled list when the edges or the theme actually change — otherwise
  // every re-size would hand the editor a new array and recolour the graph.
  const styledEdges = React.useMemo(
    () =>
      edgesData.map((edge: Edge<any>) => ({
        ...edge,
        style: {
          stroke: colorFromKey(edge.id, theme.colorScheme === 'light' ? 'light' : 'dark'),
          strokeWidth: 3,
        },
      })),
    [edgesData, theme.colorScheme],
  );

  // Keyed on which nodes exist, not how many nodes and edges there are. Re-sizing
  // the chain — a new target volume, a pinned building count, an extra link
  // between nodes that already exist — leaves the key alone, so the editor keeps
  // running and positions survive; only adding or removing a node remounts it.
  //
  // A remount is what makes React Flow measure a new node and therefore draw the
  // edges touching it, so it cannot simply be dropped.
  const key = nodesData
    .map((node: RecipeNode) => node.id)
    .sort()
    .join('|');

  if (!nodesData.length) return null;

  return <Editor key={key} nodesData={nodesData} edgesData={styledEdges} />;
};
