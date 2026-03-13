import { config } from "$lib/server/config";
import type { ChatTemplateInput } from "$lib/types/Template";
import { z } from "zod";
import endpoints, { endpointSchema, type Endpoint } from "./endpoints/endpoints";

import { logger } from "$lib/server/logger";

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

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
			return await endpoints.dify({ ...endpoint, _model: m });
		} else {
			throw new Error(
				`Unsupported endpoint type: ${(endpoint as unknown as { type: string }).type}`
			);
		}
	},
});

type InternalProcessedModel = Awaited<ReturnType<typeof addEndpoint>> & {
	isRouter: boolean;
	hasInferenceAPI: boolean;
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
		displayName: "IslamVibe AI - Исламский помощник",
		description:
			"Исламский AI ассистент на базе DeepSeek с RAG через Dify. Отвечает на вопросы об исламе, Коране, хадисах, фикхе, исламской истории и культуре. Поддерживает арабский и русский языки.",
		logoUrl: "https://img.icons8.com/color/96/000000/islam.png",
		websiteUrl: "https://islamvibe.ai",
		modelUrl: "https://dify.ai",
		preprompt: `You are IslamVibe AI, a knowledgeable and respectful Islamic assistant designed to provide accurate, well-sourced information about Islam. Your purpose is to help users with questions about Islamic teachings, Quranic tafsir, Islamic history, prayer guidance, fiqh, hadith sciences, and Islamic ethics.

Core Principles:
1. Respond with respect, accuracy, and proper references to sources (Quran, Sunnah, scholarly opinions)
2. If you don't know the answer, honestly admit it and suggest consulting a knowledgeable scholar
3. Provide Quranic verses in Arabic with transliteration and translation
4. Mention surah and verse numbers for all Quranic references
5. For hadith, cite the source (Bukhari, Muslim, etc.) and grading when possible
6. When there are differences of opinion among madhabs, explain various viewpoints objectively
7. Avoid giving fatwas without proper context; remind users to consult local imams for specific rulings
8. Be patient, kind, and compassionate in all interactions
9. Focus on educational guidance rather than personal religious rulings
10. Promote understanding, tolerance, and the beautiful teachings of Islam

Languages: Respond in the language of the user's question (English, Russian, or Arabic). Provide Arabic terms when relevant for clarity.`,
		endpoints: [
			{
				type: "dify" as const,
			},
		],
		parameters: {
			temperature: 0.7,
			max_tokens: 3000,
			top_p: 0.9,
			presence_penalty: 0.1,
			frequency_penalty: 0.1,
		},
		multimodal: false,
		supportsTools: false,
		unlisted: false,
		systemRoleSupported: true,
		promptExamples: [
			{
				title: "Quranic Tafsir: Surah Al-Fatihah",
				prompt:
					"Explain the tafsir (interpretation) of Surah Al-Fatihah with references to classical commentators like Ibn Kathir, Al-Tabari, and Al-Qurtubi. Include the Arabic text with transliteration and translation.",
			},
			{
				title: "Islamic History: Life of Prophet Muhammad",
				prompt:
					"Describe the key events in the life of Prophet Muhammad (PBUH) from birth to passing, highlighting lessons for contemporary Muslims.",
			},
			{
				title: "Prayer Guidance: Steps of Salah",
				prompt:
					"Guide me through the complete steps of performing Salah (prayer) correctly according to Sunni tradition, including prerequisites, intentions, and common mistakes to avoid.",
			},
			{
				title: "Islamic Theology: Concept of Tawhid",
				prompt:
					"Explain the concept of Tawhid (monotheism) in Islam, its types (Tawhid al-Rububiyyah, Tawhid al-Uluhiyyah, Tawhid al-Asma' wa al-Sifat), and its importance.",
			},
			{
				title: "Fiqh: Hajj Requirements",
				prompt:
					"What are the conditions, pillars (arkan), and obligatory acts (wajibat) of Hajj according to different madhabs (Hanafi, Shafi'i, Maliki, Hanbali)?",
			},
			{
				title: "Five Pillars of Islam",
				prompt:
					"Discuss the significance and practical implementation of the Five Pillars of Islam: Shahadah, Salah, Zakat, Sawm, and Hajj.",
			},
			{
				title: "Islamic Finance: Zakat vs Sadaqah",
				prompt:
					"Explain the difference between Zakat and Sadaqah in Islamic finance, including types, recipients, calculation methods, and contemporary applications.",
			},
			{
				title: "Women's Rights in Islam",
				prompt:
					"What are the rights and responsibilities of women in Islam according to Quran and Sunnah? Address common misconceptions.",
			},
			{
				title: "Islamic Ethics: Modern Dilemmas",
				prompt:
					"How should a Muslim respond to modern ethical dilemmas (bioethics, business ethics, social media) using Islamic principles from Quran and Hadith?",
			},
			{
				title: "Hadith Sciences",
				prompt:
					"Explain the science of Hadith authentication (Mustalah al-Hadith), including classification by authenticity (sahih, hasan, da'if) and important collections.",
			},
			{
				title: "Islamic Spirituality: Purification of Heart",
				prompt:
					"Discuss the concept of Tazkiyah al-Nafs (purification of the soul) in Islam and practical methods for spiritual development.",
			},
			{
				title: "Interfaith Dialogue in Islam",
				prompt:
					"What is the Islamic perspective on interfaith dialogue and relations with People of the Book (Jews and Christians) based on Quranic verses and Prophetic examples?",
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
