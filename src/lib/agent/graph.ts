import { StateGraph, START, END } from "@langchain/langgraph";
import { ScoutStateSchema } from "./state";
import { resolveEntityNode } from "./nodes/resolveEntity";
import { financialsNode } from "./nodes/financials";
import { newsNode } from "./nodes/news";
import { competitiveNode } from "./nodes/competitive";
import { riskNode } from "./nodes/risk";
import { bullCaseNode } from "./nodes/bullCase";
import { bearCaseNode } from "./nodes/bearCase";
import { scoringNode } from "./nodes/scoring";
import { memoWriterNode } from "./nodes/memoWriter";

/**
 * Node names are suffixed with "Step"/"Research" etc. because LangGraph
 * forbids a node name that collides with a state channel name (e.g. the
 * "financials" state field vs. a "financials" node) — see ScoutStateSchema.
 */
export function buildScoutGraph() {
  return new StateGraph(ScoutStateSchema)
    .addNode("resolveEntityStep", resolveEntityNode)
    .addNode("financialsResearch", financialsNode)
    .addNode("newsResearch", newsNode)
    .addNode("competitiveResearch", competitiveNode)
    .addNode("riskResearch", riskNode)
    .addNode("bullCaseStep", bullCaseNode)
    .addNode("bearCaseStep", bearCaseNode)
    .addNode("scoringStep", scoringNode)
    .addNode("memoWriterStep", memoWriterNode)
    .addEdge(START, "resolveEntityStep")
    .addEdge("resolveEntityStep", "financialsResearch")
    .addEdge("resolveEntityStep", "newsResearch")
    .addEdge("resolveEntityStep", "competitiveResearch")
    .addEdge("resolveEntityStep", "riskResearch")
    .addEdge("financialsResearch", "bullCaseStep")
    .addEdge("newsResearch", "bullCaseStep")
    .addEdge("competitiveResearch", "bullCaseStep")
    .addEdge("riskResearch", "bullCaseStep")
    .addEdge("bullCaseStep", "bearCaseStep")
    .addEdge("bearCaseStep", "scoringStep")
    .addEdge("scoringStep", "memoWriterStep")
    .addEdge("memoWriterStep", END)
    .compile();
}
