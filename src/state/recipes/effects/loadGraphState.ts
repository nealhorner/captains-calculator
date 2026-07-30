import { SerializedProductionNode } from "../ProductionNode";
import logger from "utils/logger";

export const loadGraphState = (): SerializedProductionNode[] | null => {
    const graph = localStorage.getItem('production-graph')
    if (!graph) return null
    try {
        const parsed = JSON.parse(graph)
        return Array.isArray(parsed) ? parsed : null
    } catch (error) {
        logger('Failed to parse persisted production graph, ignoring', error, 'warn')
        return null
    }
}
