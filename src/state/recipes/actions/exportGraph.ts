import { Action } from "state/_types";
import { buildExportedGraph, ExportedGraph } from "../importExport";

export const exportGraph: Action<void, ExportedGraph> = ({ state }) => {
    return buildExportedGraph(state.recipes.nodesList)
}
