export const loadGraphState = (): any[] | null => {
    const graph = localStorage.getItem('production-graph')
    return graph ? JSON.parse(graph) : null
}
