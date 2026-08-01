import { BezierEdge, EdgeProps, useNodes } from '@xyflow/react';
import {
  getSmartEdge,
  pathfindingAStarDiagonal,
  svgDrawSmoothLinePath,
} from '@tisoap/react-flow-smart-edge';

export const RecipeEdgeType = (props: EdgeProps) => {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerStart,
    markerEnd,
  } = props;
  const nodes = useNodes();

  const getSmartEdgeResponse = getSmartEdge({
    sourcePosition,
    targetPosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    nodes,
    options: {
      nodePadding: 40,
      drawEdge: svgDrawSmoothLinePath,
      generatePath: pathfindingAStarDiagonal,
    },
  });

  if (!getSmartEdgeResponse || getSmartEdgeResponse instanceof Error) {
    // Pathfinding failed (e.g. no clear route between overlapping nodes) —
    // fall back to a plain bezier edge instead of silently dropping the edge.
    return <BezierEdge {...props} />;
  }

  const { svgPathString } = getSmartEdgeResponse;

  return (
    <>
      <path
        style={style}
        className="react-flow__edge-path"
        d={svgPathString}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
    </>
  );
};
