import { config } from "$lib/server/config";
import type { ChatTemplateInput } from "$lib/types/Template";
import { z } from "zod";
import endpoints, { endpointSchema, type Endpoint } from "./endpoints/endpoints";

import JSON5 from "json5";
import { logger } from "$lib/server/logger";
import { makeRouterEndpoint } from "$lib/server/router/endpoint";

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

const sanitizeJSONEnv = (val: string, fallback: string) => {
	const raw = (val ?? "").trim();
	const unquoted = raw.startsWith("`") && raw.endsWith("`") ? raw.slice(1, -1) : raw;
	return unquoted || fallback;
};

const modelConfig = z.object({
	/** Used as an identifier in DB */
	id: z.string().optional(),
	/** Used to link to the model page, and for inference */
	name: z.string().default(""),
	displayName: z.string().min(1).optional(),
	description: z.string().min(1).optional(),
	logoUrl: z.string().url().optional(),
	websiteUrl: z.string().url().optional(),
	modelUrl: z.string().url().optional(),
	tokenizer: z.never().optional(),
	datasetName: z.string().min(1).optional(),
	datasetUrl: z.string().url().optional(),
	preprompt: z.string().default(""),
	prepromptUrl: z.string().url().optional(),
	chatPromptTemplate: z.never().optional(),
	promptExamples: z
		.array(
			z.object({
				title: z.string().min(1),
				prompt: z.string().min(1),
			})
		)
		.optional(),
	endpoints: z.array(endpointSchema).optional(),
	providers: z.array(z.object({ supports_tools: z.boolean().optional() }).passthrough()).optional(),
	parameters: z
		.object({
			temperature: z.number().min(0).max(2).optional(),
			truncate: z.number().int().positive().optional(),
			max_tokens: z.number().int().positive().optional(),
			stop: z.array(z.string()).optional(),
			top_p: z.number().positive().optional(),
			top_k: z.number().positive().optional(),
			frequency_penalty: z.number().min(-2).max(2).optional(),
			presence_penalty: z.number().min(-2).max(2).optional(),
		})
		.passthrough()
		.optional(),
	multimodal: z.boolean().default(false),
	multimodalAcceptedMimetypes: z.array(z.string()).optional(),
	// Aggregated tool-calling capability across providers (HF router)
	supportsTools: z.boolean().default(false),
	unlisted: z.boolean().default(false),
	embeddingModel: z.never().optional(),
	/** Used to enable/disable system prompt usage */
	systemRoleSupported: z.boolean().default(true),
});

type ModelConfig = z.infer<typeof modelConfig>;

const overrideEntrySchema = modelConfig
	.partial()
	.extend({
		id: z.string().optional(),
		name: z.string().optional(),
	})
	.refine((value) => Boolean((value.id ?? value.name)?.trim()), {
		message: "Model override entry must provide an id or name",
	});

type ModelOverride = z.infer<typeof overrideEntrySchema>;

const openaiBaseUrl = config.OPENAI_BASE_URL
	? config.OPENAI_BASE_URL.replace(/\/$/, "")
	: undefined;
const isHFRouter = openaiBaseUrl === "https://router.huggingface.co/v1";

const listSchema = z
	.object({
		data: z.array(
			z.object({
				id: z.string(),
				description: z.string().optional(),
				providers: z
					.array(z.object({ supports_tools: z.boolean().optional() }).passthrough())
					.optional(),
				architecture: z
					.object({
						input_modalities: z.array(z.string()).optional(),
					})
					.passthrough()
					.optional(),
			})
		),
	})
	.passthrough();

function getChatPromptRender(_m: ModelConfig): (inputs: ChatTemplateInput) => string {
	// Minimal template to support legacy "completions" flow if ever used.
	// We avoid any tokenizer/Jinja usage in this build.
	return ({ messages, preprompt }) => {
		const parts: string[] = [];
		if (preprompt) parts.push(`[SYSTEM]\n${preprompt}`);
		for (const msg of messages) {
			const role = msg.from === "assistant" ? "ASSISTANT" : msg.from.toUpperCase();
			parts.push(`[${role}]\n${msg.content}`);
		}
		parts.push(`[ASSISTANT]`);
		return parts.join("\n\n");
	};
}

const processModel = async (m: ModelConfig) => ({
	...m,
	chatPromptRender: await getChatPromptRender(m),
	id: m.id || m.name,
	displayName: m.displayName || m.name,
	preprompt: m.prepromptUrl ? await fetch(m.prepromptUrl).then((r) => r.text()) : m.preprompt,
	parameters: { ...m.parameters, stop_sequences: m.parameters?.stop },
	unlisted: m.unlisted ?? false,
});

const addEndpoint = (m: Awaited<ReturnType<typeof processModel>>) => ({
	...m,
	getEndpoint: async (): Promise<Endpoint> => {
		if (!m.endpoints || m.endpoints.length === 0) {
			throw new Error("No endpoints configured.");
		}
		const endpoint = m.endpoints[0] as z.infer<typeof endpointSchema>;
		if (endpoint.type === "openai") {
			return await endpoints.openai({ ...endpoint, model: m });
		} else if (endpoint.type === "dify") {
			return await endpoints.dify({ ...endpoint, model: m });
		} else {
			throw new Error(`Unsupported endpoint type: ${(endpoint as any).type}`);
		}
	},
});

type InternalProcessedModel = Awaited<ReturnType<typeof addEndpoint>> & {
	isRouter: boolean;
	hasInferenceAPI: boolean;
};

const inferenceApiIds: string[] = [];

const getModelOverrides = (): ModelOverride[] => {
	const overridesEnv = (Reflect.get(config, "MODELS") as string | undefined) ?? "";

	if (!overridesEnv.trim()) {
		return [];
	}

	try {
		return z.array(overrideEntrySchema).parse(JSON5.parse(sanitizeJSONEnv(overridesEnv, "[]")));
	} catch (error) {
		logger.error(error, "[models] Failed to parse MODELS overrides");
		return [];
	}
};

export type ModelsRefreshSummary = {
	refreshedAt: Date;
	durationMs: number;
	added: string[];
	removed: string[];
	changed: string[];
	total: number;
};

export type ProcessedModel = InternalProcessedModel;

export let models: ProcessedModel[] = [];
export let defaultModel!: ProcessedModel;
export let taskModel!: ProcessedModel;
export let validModelIdSchema: z.ZodType<string> = z.string();
export let lastModelRefresh = new Date(0);
export let lastModelRefreshDurationMs = 0;
export let lastModelRefreshSummary: ModelsRefreshSummary = {
	refreshedAt: new Date(0),
	durationMs: 0,
	added: [],
	removed: [],
	changed: [],
	total: 0,
};

let inflightRefresh: Promise<ModelsRefreshSummary> | null = null;

const createValidModelIdSchema = (modelList: ProcessedModel[]): z.ZodType<string> => {
	if (modelList.length === 0) {
		throw new Error("No models available to build validation schema");
	}
	const ids = new Set(modelList.map((m) => m.id));
	return z.string().refine((value) => ids.has(value), "Invalid model id");
};

const resolveTaskModel = (modelList: ProcessedModel[]) => {
	if (modelList.length === 0) {
		throw new Error("No models available to select task model");
	}

	if (config.TASK_MODEL) {
		const preferred = modelList.find(
			(m) => m.name === config.TASK_MODEL || m.id === config.TASK_MODEL
		);
		if (preferred) {
			return preferred;
		}
	}

	return modelList[0];
};

const signatureForModel = (model: ProcessedModel) =>
	JSON.stringify({
		description: model.description,
		displayName: model.displayName,
		providers: model.providers,
		parameters: model.parameters,
		preprompt: model.preprompt,
		prepromptUrl: model.prepromptUrl,
		endpoints:
			model.endpoints?.map((endpoint) => {
				if (endpoint.type === "openai") {
					const { type, baseURL } = endpoint;
					return { type, baseURL };
				}
				return { type: endpoint.type };
			}) ?? null,
		multimodal: model.multimodal,
		multimodalAcceptedMimetypes: model.multimodalAcceptedMimetypes,
		supportsTools: (model as unknown as { supportsTools?: boolean }).supportsTools ?? false,
		isRouter: model.isRouter,
		hasInferenceAPI: model.hasInferenceAPI,
	});

const applyModelState = (newModels: ProcessedModel[], startedAt: number): ModelsRefreshSummary => {
	if (newModels.length === 0) {
		throw new Error("Failed to load any models from upstream");
	}

	const previousIds = new Set(models.map((m) => m.id));
	const previousSignatures = new Map(models.map((m) => [m.id, signatureForModel(m)]));
	const refreshedAt = new Date();
	const durationMs = Date.now() - startedAt;

	models = newModels;
	defaultModel = models[0];
	taskModel = resolveTaskModel(models);
	validModelIdSchema = createValidModelIdSchema(models);
	lastModelRefresh = refreshedAt;
	lastModelRefreshDurationMs = durationMs;

	const added = newModels.map((m) => m.id).filter((id) => !previousIds.has(id));
	const removed = Array.from(previousIds).filter(
		(id) => !newModels.some((model) => model.id === id)
	);
	const changed = newModels
		.filter((model) => {
			const previousSignature = previousSignatures.get(model.id);
			return previousSignature !== undefined && previousSignature !== signatureForModel(model);
		})
		.map((model) => model.id);

	const summary: ModelsRefreshSummary = {
		refreshedAt,
		durationMs,
		added,
		removed,
		changed,
		total: models.length,
	};

	lastModelRefreshSummary = summary;

	logger.info(
		{
			total: summary.total,
			added: summary.added,
			removed: summary.removed,
			changed: summary.changed,
			durationMs: summary.durationMs,
		},
		"[models] Model cache refreshed"
	);

	return summary;
};

const buildModels = async (): Promise<ProcessedModel[]> => {
	// Static model for IslamVibe AI using Dify endpoint
	const modelRaw = {
		id: "islamvibe-ai",
		name: "IslamVibe AI",
		displayName: "IslamVibe AI",
		description: "Исламский AI ассистент на базе DeepSeek с RAG через Dify. Отвечает на вопросы об исламе, Коране, хадисах и исламской культуре.",
		logoUrl: "https://img.icons8.com/color/96/000000/islam.png",
		websiteUrl: "https://islamvibe.ai",
		modelUrl: "https://dify.ai",
		preprompt: "Ты - полезный исламский AI ассистент. Отвечай на вопросы уважительно, точно и с ссылками на источники, когда это возможно. Если не знаешь ответа, честно признайся.",
		endpoints: [
			{
				type: "dify" as const,
			},
		],
		parameters: {
			temperature: 0.7,
			max_tokens: 2000,
			top_p: 0.9,
		},
		multimodal: false,
		supportsTools: false,
		unlisted: false,
		systemRoleSupported: true,
		promptExamples: [
			{
				title: "Объясни суру Аль-Фатиха",
				prompt: "Объясни смысл и значение суры Аль-Фатиха из Корана.",
			},
			{
				title: "Расскажи о пяти столпах ислама",
				prompt: "Какие пять столпов ислама и что каждый из них означает?",
			},
			{
				title: "Разница между сунной и хадисом",
				prompt: "В чем разница между сунной и хадисом в исламе?",
			},
		],
	} as ModelConfig;

	const builtModel = await processModel(modelRaw)
		.then(addEndpoint)
		.then(async (m) => ({
			...m,
			hasInferenceAPI: false,
			isRouter: false as boolean,
		}));

	return [builtModel as ProcessedModel];
};

const rebuildModels = async (): Promise<ModelsRefreshSummary> => {
	const startedAt = Date.now();
	const newModels = await buildModels();
	return applyModelState(newModels, startedAt);
};

await rebuildModels();

export const refreshModels = async (): Promise<ModelsRefreshSummary> => {
	if (inflightRefresh) {
		return inflightRefresh;
	}

	inflightRefresh = rebuildModels().finally(() => {
		inflightRefresh = null;
	});

	return inflightRefresh;
};

export const validateModel = (_models: BackendModel[]) => {
	// Zod enum function requires 2 parameters
	return z.enum([_models[0].id, ..._models.slice(1).map((m) => m.id)]);
};

// if `TASK_MODEL` is string & name of a model in `MODELS`, then we use `MODELS[TASK_MODEL]`, else we try to parse `TASK_MODEL` as a model config itself

export type BackendModel = Optional<
	typeof defaultModel,
	"preprompt" | "parameters" | "multimodal" | "unlisted" | "hasInferenceAPI"
>;
