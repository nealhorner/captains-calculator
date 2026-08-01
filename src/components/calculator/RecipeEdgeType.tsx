import { EdgeProps, useNodes, getBezierPath } from 'react-flow-renderer';
import { getSmartEdge, pathfindingAStarDiagonal, svgDrawSmoothLinePath } from '@tisoap/react-flow-smart-edge'

/**
 * Routes an edge around the nodes when it can, and falls back to a plain curve
 * when it cannot.
 *
 * The fallback matters: `getSmartEdge` gives up and returns null whenever its
 * pathfinding fails — which happens readily with large nodes or a crowded graph
 * — and without a fallback the connection simply vanishes from the canvas.
 */
export const RecipeEdgeType = ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerStart,
    markerEnd,
}: EdgeProps<any>) => {

    const nodes = useNodes()

    const smartEdge = getSmartEdge({
        sourcePosition,
        targetPosition,
        sourceX,
        sourceY,
        targetX,
        targetY,
        nodes,
        options: {
            nodePadding: 20,
            drawEdge: svgDrawSmoothLinePath,
            generatePath: pathfindingAStarDiagonal
        }
    })

    const path = smartEdge?.svgPathString ?? getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition
    })

    return (
        <path
            style={style}
            className='react-flow__edge-path'
            d={path}
            markerEnd={markerEnd}
            markerStart={markerStart}
        />
    );

}
