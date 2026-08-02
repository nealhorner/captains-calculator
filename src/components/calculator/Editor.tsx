import React from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

import { useAppState } from 'state';
import ProductionNode from 'state/recipes/ProductionNode';

import { generateDarkColorHex, generateLightColorHex } from 'utils/colors';

import { RecipeNodeType } from './RecipeNodeType';
import { RecipeEdgeType } from './RecipeEdgeType';
import { Box, Loader, useComputedColorScheme } from '@mantine/core';
import { AnimatePresence, motion } from 'framer-motion';

export type RecipeNodeData = ProductionNode & Record<string, unknown>;
export type RecipeNode = Node<RecipeNodeData>;

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node<any>[], edges: Edge<any>[]) => {
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
      width: node.measured?.width,
      height: node.measured?.height,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.measured?.width;
    const height = node.measured?.height;

    node.targetPosition = Position.Right;
    node.sourcePosition = Position.Left;

    node.position = {
      x: nodeWithPosition.x - (!!width ? width / 2 : 0),
      y: nodeWithPosition.y - (!!height ? height / 2 : 0),
    };

    return node;
  });

  return { nodes, edges };
};

const nodeTypes: NodeTypes = { RecipeNode: RecipeNodeType };
const edgeTypes: EdgeTypes = { smart: RecipeEdgeType };

type EditorProps = {
  nodesData: RecipeNode[];
  edgesData: Edge<any>[];
};

export const Editor: React.FC<EditorProps> = ({ nodesData, edgesData }) => {
  // const { fitView, getEdges, setNodes } = useReactFlow();
  //const selectNode = useActions().recipes.selectNode
  // const reaction = useReaction()
  // const [graph, setGraph] = React.useState<Array<Node>>()

  const [loading, setLoading] = React.useState(true);
  const colorScheme = useComputedColorScheme('light');

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesData);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesData);

  // const [nodes, setNodes] = React.useState<Node<RecipeNodeData>[]>([]);
  // const [edges, setEdges] = React.useState([]);

  // React.useEffect(() => reaction(
  //     (state) => state.recipes.nodesList,
  //     (nodesList) => {
  //         console.log('ReactionRan')
  //         if (nodesList.length) {
  //             let nodes = nodesList.map(node => {
  //                 return {
  //                     id: node.id,
  //                     type: 'RecipeNode',
  //                     data: node,
  //                     position: { x: 0, y: 0 }
  //                 }
  //             })
  //             createGraphLayout(nodes, [])
  //                 .then(graph => {
  //                     setNodes(graph)
  //                 })
  //         }
  //     },
  //     {
  //         immediate: false
  //     }
  // ))

  // const handleNodesChange = (nodes: NodeChange[]) => {
  //     console.log('handleNodesChange', nodes)
  //     //fitView({ padding: 1 , includeHiddenNodes: true});
  // }

  // const onNodesChange = React.useCallback(
  //     (changes) => console.log(changes),
  //     [setNodes]
  // );

  // const onEdgesChange = React.useCallback(
  //     (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
  //     [setEdges]
  // );

  // const onConnectEnd = async () => {
  //     console.log('onConnectEnd')
  // }

  const onConnect = async (params: Connection) => {
    setEdges((eds) => addEdge({ ...params, style: { stroke: generateDarkColorHex() } }, eds));
  };

  const onInit = async (reactFlowInstance: ReactFlowInstance<RecipeNode, Edge<any>>) => {
    reactFlowInstance.setCenter(0, 0);
    let data = getLayoutedElements(reactFlowInstance.getNodes(), reactFlowInstance.getEdges());
    reactFlowInstance.setNodes(data.nodes);
    reactFlowInstance.setEdges(data.edges);
    reactFlowInstance.fitView({ padding: 0.2, includeHiddenNodes: false, duration: 100 });
    setLoading(false);
  };

  // const onNodeClick = (e: any, node: Node<RecipeNodeData>) => {
  //     selectNode(node.data.id)
  // }

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
              style={(theme) => ({
                background: colorScheme === 'light' ? theme.colors.white : theme.colors.dark[7],
                backgroundImage: `url("/img/${colorScheme === 'light' ? 'squared-metal.png' : 'squared-metal-inverted.png'}")`,
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
        //onNodeClick={onNodeClick}
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
        <Controls />
      </ReactFlow>
    </React.Fragment>
  );
};

export const EditorWrapper = () => {
  const colorScheme = useComputedColorScheme('light');
  let { nodesData, edgesData } = useAppState((state) => state.recipes);

  if (!nodesData.length) return null;

  return (
    <Editor
      key={`editor-${nodesData.length}-${edgesData.length}`}
      nodesData={nodesData}
      edgesData={edgesData.map((e) => ({
        ...e,
        style: {
          stroke: colorScheme === 'light' ? generateDarkColorHex() : generateLightColorHex(),
          strokeWidth: 3,
        },
      }))}
    />
  );
};
