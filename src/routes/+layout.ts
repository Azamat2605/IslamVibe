import { UrlDependency } from "$lib/types/UrlDependency";
import type { ConvSidebar } from "$lib/types/ConvSidebar";
import { useAPIClient, handleResponse, type ApiResponse } from "$lib/APIClient";
import { getConfigManager } from "$lib/utils/PublicConfig.svelte";
import type { GETModelsResponse, FeatureFlags } from "$lib/server/api/types";
import superjson from "superjson";

interface ConversationListItem {
	_id: { toString(): string };
	title: string;
	updatedAt: Date | string;
	model?: string;
}

interface UserInfo {
	id: string;
	username?: string;
	avatarUrl?: string;
	email?: string;
	isAdmin: boolean;
	isEarlyAccess: boolean;
}

interface SettingsResponse {
	welcomeModalSeen: boolean;
	welcomeModalSeenAt: Date | null;
	shareConversationsWithModelAuthors: boolean;
	activeModel: string;
	streamingMode: "raw" | "smooth";
	directPaste: boolean;
	customPrompts: Record<string, string>;
	multimodalOverrides: Record<string, boolean>;
	toolsOverrides: Record<string, boolean>;
	hidePromptExamples: Record<string, boolean>;
	providerOverrides: Record<string, string>;
	billingOrganization?: string;
}

export const load = async ({ depends, fetch, url }) => {
	depends(UrlDependency.ConversationList);
	depends("app:user");

	const client = useAPIClient({ fetch, origin: url.origin });

	// Helper to safely fetch with fallback on auth errors
	async function safeFetch<T>(promise: Promise<ApiResponse<T>>, fallback: T): Promise<T> {
		try {
			const response = await promise;

			// Если статус 401 (Unauthorized), возвращаем fallback
			if (response.status === 401) {
				console.log("safeFetch: Got 401, returning fallback");
				return fallback;
			}

			// Если есть ошибка в response, проверяем её содержание
			if (response.error) {
				const errorStr = JSON.stringify(response.error);
				if (
					errorStr.includes('"Must have a valid session or user"') ||
					errorStr.includes('"Must have a valid user"') ||
					errorStr.includes("Unauthorized")
				) {
					console.log("safeFetch: Authentication error, returning fallback");
					return fallback;
				}
				// Для других ошибок бросаем исключение
				throw new Error(errorStr);
			}

			// Если данные null, возвращаем fallback
			if (response.data === null) {
				return fallback;
			}

			// Парсим данные через superjson
			return superjson.parse(
				typeof response.data === "string" ? response.data : JSON.stringify(response.data)
			);
		} catch (error) {
			// Если ошибка аутентификации, возвращаем fallback
			if (
				error instanceof Error &&
				(error.message.includes('"Must have a valid session or user"') ||
					error.message.includes('"Must have a valid user"') ||
					error.message.includes("Unauthorized") ||
					error.message.includes("401"))
			) {
				console.log("safeFetch: Caught authentication error, returning fallback");
				return fallback;
			}
			// Для других ошибок перебрасываем
			throw error;
		}
	}

	const [settings, models, user, publicConfig, featureFlags, conversationsData] =
		(await Promise.all([
			(async () => {
				console.log("Fetching user settings...");
				const result = await safeFetch(client.user.settings.get(), {
					welcomeModalSeen: false,
					welcomeModalSeenAt: null,
					shareConversationsWithModelAuthors: false,
					activeModel: "",
					streamingMode: "raw" as const,
					directPaste: false,
					customPrompts: {},
					multimodalOverrides: {},
					toolsOverrides: {},
					hidePromptExamples: {},
					providerOverrides: {},
					billingOrganization: undefined,
				});
				console.log("User settings fetched:", result);
				return result;
			})(),
			client.models.get().then(handleResponse),
			safeFetch(client.user.get(), null),
			client["public-config"].get().then(handleResponse),
			client["feature-flags"].get().then(handleResponse),
			safeFetch(client.conversations.get({ query: { p: 0 } }), {
				conversations: [],
				hasMore: false,
			}),
		])) as [
			SettingsResponse,
			GETModelsResponse,
			UserInfo | null,
			Record<string, unknown>,
			FeatureFlags,
			{ conversations: ConversationListItem[]; hasMore: boolean },
		];

	const defaultModel = models[0];

	const { conversations: rawConversations } = conversationsData;
	const conversations = rawConversations.map((conv: ConversationListItem) => {
		const trimmedTitle = conv.title.trim();

		conv.title = trimmedTitle;

		return {
			id: conv._id.toString(),
			title: conv.title,
			model: conv.model ?? defaultModel?.id,
			updatedAt: new Date(conv.updatedAt),
		} satisfies ConvSidebar;
	});

	return {
		conversations,
		models,
		oldModels: [],
		user,
		settings: {
			...settings,
			welcomeModalSeenAt: settings.welcomeModalSeenAt
				? new Date(settings.welcomeModalSeenAt)
				: null,
		},
		publicConfig: getConfigManager(publicConfig as Record<`PUBLIC_${string}`, string>),
		...featureFlags,
	};
};
