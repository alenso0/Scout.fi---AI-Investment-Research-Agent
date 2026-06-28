import { z } from "zod";
import { withLangGraph } from "@langchain/langgraph/zod";

export const CitationSchema = z.object({
  label: z.string(),
  url: z.string(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const ResearchSectionSchema = z.object({
  summary: z.string(),
  citations: z.array(CitationSchema),
});
export type ResearchSection = z.infer<typeof ResearchSectionSchema>;

export const ResolvedEntitySchema = z.object({
  name: z.string(),
  ticker: z.string().nullable(),
  domain: z.string().nullable(),
  exchange: z.string().nullable(),
  description: z.string(),
});
export type ResolvedEntity = z.infer<typeof ResolvedEntitySchema>;

export const RubricDimensionSchema = z.object({
  dimension: z.enum([
    "financialHealth",
    "marketPosition",
    "momentum",
    "growthTrajectory",
    "riskFactors",
  ]),
  score: z.number().min(1).max(5),
  rationale: z.string(),
});
export type RubricDimension = z.infer<typeof RubricDimensionSchema>;

export const VerdictSchema = z.enum(["invest", "watch", "pass"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const MemoSchema = z.object({
  oneLineThesis: z.string(),
  verdict: VerdictSchema,
  compositeScore: z.number(),
  rubric: z.array(RubricDimensionSchema),
  bullCase: z.string(),
  bearCase: z.string(),
  sections: z.object({
    financials: ResearchSectionSchema,
    news: ResearchSectionSchema,
    competitive: ResearchSectionSchema,
    risk: ResearchSectionSchema,
  }),
});
export type Memo = z.infer<typeof MemoSchema>;

const concatStringArrays = (a: string[], b: string[]): string[] => a.concat(b);

export const ScoutStateSchema = z.object({
  companyName: z.string(),

  resolvedEntity: withLangGraph(ResolvedEntitySchema.nullable(), {
    default: (): ResolvedEntity | null => null,
  }),

  financials: withLangGraph(ResearchSectionSchema.nullable(), {
    default: (): ResearchSection | null => null,
  }),
  news: withLangGraph(ResearchSectionSchema.nullable(), {
    default: (): ResearchSection | null => null,
  }),
  competitive: withLangGraph(ResearchSectionSchema.nullable(), {
    default: (): ResearchSection | null => null,
  }),
  risk: withLangGraph(ResearchSectionSchema.nullable(), {
    default: (): ResearchSection | null => null,
  }),

  bullCase: withLangGraph(z.string().nullable(), {
    default: (): string | null => null,
  }),
  bearCase: withLangGraph(z.string().nullable(), {
    default: (): string | null => null,
  }),

  rubric: withLangGraph(z.array(RubricDimensionSchema), {
    default: (): RubricDimension[] => [],
  }),
  verdict: withLangGraph(VerdictSchema.nullable(), {
    default: (): Verdict | null => null,
  }),
  compositeScore: withLangGraph(z.number().nullable(), {
    default: (): number | null => null,
  }),
  oneLineThesis: withLangGraph(z.string().nullable(), {
    default: (): string | null => null,
  }),

  memo: withLangGraph(MemoSchema.nullable(), {
    default: (): Memo | null => null,
  }),

  /** Accumulates across parallel research nodes instead of overwriting. */
  errors: withLangGraph(z.array(z.string()), {
    default: (): string[] => [],
    reducer: { schema: z.array(z.string()), fn: concatStringArrays },
  }),
});

export type ScoutState = z.infer<typeof ScoutStateSchema>;
