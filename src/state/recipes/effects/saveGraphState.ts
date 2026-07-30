import ProductionNode from "../ProductionNode";

export const saveGraphState = (nodes: { [key: string]: ProductionNode }): void => {
    localStorage.setItem('production-graph', JSON.stringify(Object.values(nodes)))
}
