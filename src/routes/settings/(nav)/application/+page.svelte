<script lang="ts">
	import CarbonTrashCan from "~icons/carbon/trash-can";
	import CarbonArrowUpRight from "~icons/carbon/arrow-up-right";
	import CarbonLogoGithub from "~icons/carbon/logo-github";

	import { useSettingsStore } from "$lib/stores/settings";
	import Switch from "$lib/components/Switch.svelte";

	import { goto } from "$app/navigation";
	import { error } from "$lib/stores/errors";
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import { useAPIClient, handleResponse } from "$lib/APIClient";
	import { onMount } from "svelte";
	import { browser } from "$app/environment";
	import { getThemePreference, setTheme, type ThemePreference } from "$lib/switchTheme";

	const publicConfig = usePublicConfig();
	let settings = useSettingsStore();

	// Functional bindings for store fields (Svelte 5): avoid mutating $settings directly
	function getShareWithAuthors() {
		return $settings.shareConversationsWithModelAuthors;
	}
	function setShareWithAuthors(v: boolean) {
		settings.update((s) => ({ ...s, shareConversationsWithModelAuthors: v }));
	}

	const client = useAPIClient();

	let OPENAI_BASE_URL = $state<string | null>(null);

	// Billing organization state
	type BillingOrg = { sub: string; name: string; preferred_username: string };
	let billingOrgs = $state<BillingOrg[]>([]);
	let billingOrgsLoading = $state(false);
	let billingOrgsError = $state<string | null>(null);

	function getBillingOrganization() {
		return $settings.billingOrganization ?? "";
	}
	function setBillingOrganization(v: string) {
		settings.update((s) => ({ ...s, billingOrganization: v }));
	}

	onMount(async () => {
		// Fetch debug config
		try {
			const cfg = await client.debug.config.get().then(handleResponse);
			OPENAI_BASE_URL = (cfg as { OPENAI_BASE_URL?: string }).OPENAI_BASE_URL || null;
		} catch (e) {
			// ignore if debug endpoint is unavailable
		}

		// Fetch billing organizations (only for HuggingChat + logged in users)
		if (publicConfig.isHuggingChat && page.data.user) {
			billingOrgsLoading = true;
			try {
				const data = (await client.user["billing-orgs"].get().then(handleResponse)) as {
					userCanPay: boolean;
					organizations: BillingOrg[];
					currentBillingOrg?: string;
				};
				billingOrgs = data.organizations ?? [];
				// Update settings if current billing org was cleared by server
				if (data.currentBillingOrg !== getBillingOrganization()) {
					setBillingOrganization(data.currentBillingOrg ?? "");
				}
			} catch {
				billingOrgsError = "Не удалось загрузить варианты оплаты";
			} finally {
				billingOrgsLoading = false;
			}
		}
	});

	let themePref = $state<ThemePreference>(browser ? getThemePreference() : "system");

	// Admin: model refresh UI state
	let refreshing = $state(false);
	let refreshMessage = $state<string | null>(null);
</script>

<div class="flex w-full flex-col gap-4">
	<h2 class="text-center text-lg font-semibold text-gray-800 dark:text-gray-200 md:text-left">
		Настройки приложения
	</h2>

	{#if OPENAI_BASE_URL !== null}
		<div
			class="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] text-gray-700 dark:border-gray-700 dark:bg-gray-700/80 dark:text-gray-300"
		>
			<span class="font-medium">Базовый URL API:</span>
			<code class="ml-1 break-all font-mono text-[12px] text-gray-800 dark:text-gray-100"
				>{OPENAI_BASE_URL}</code
			>
		</div>
	{/if}
	{#if !!publicConfig.PUBLIC_COMMIT_SHA}
		<div
			class="flex flex-col items-start justify-between text-xl font-semibold text-gray-800 dark:text-gray-200"
		>
			<a
				href={`https://github.com/huggingface/chat-ui/commit/${publicConfig.PUBLIC_COMMIT_SHA}`}
				target="_blank"
				rel="noreferrer"
				class="text-sm font-light text-gray-500 dark:text-gray-400"
			>
				Последнее развертывание <span class="gap-2 font-mono"
					>{publicConfig.PUBLIC_COMMIT_SHA.slice(0, 7)}</span
				>
			</a>
		</div>
	{/if}
	{#if page.data.isAdmin}
		<div class="flex items-center gap-2">
			<p
				class="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
			>
				Режим администратора
			</p>
			<button
				class="btn rounded-md text-xs"
				class:underline={!refreshing}
				type="button"
				onclick={async () => {
					try {
						refreshing = true;
						refreshMessage = null;
						const res = await client.models.refresh.post().then(handleResponse);
						const delta = `+${res.added.length} −${res.removed.length} ~${res.changed.length}`;
						refreshMessage = `Refreshed in ${res.durationMs} ms • ${delta} • total ${res.total}`;
						await goto(page.url.pathname, { invalidateAll: true });
					} catch (e) {
						console.error(e);
						$error = "Не удалось обновить модели";
					} finally {
						refreshing = false;
					}
				}}
				disabled={refreshing}
			>
				{refreshing ? "Обновление…" : "Обновить модели"}
			</button>
			{#if refreshMessage}
				<span class="text-xs text-gray-600 dark:text-gray-400">{refreshMessage}</span>
			{/if}
		</div>
	{/if}
	<div class="flex h-full flex-col gap-4 max-sm:pt-0">
		<div
			class="rounded-xl border border-gray-200 bg-white px-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="divide-y divide-gray-200 dark:divide-gray-700">
				{#if publicConfig.PUBLIC_APP_DATA_SHARING === "1"}
					<div class="flex items-start justify-between py-3">
						<div>
							<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
								Делиться с авторами моделей
							</div>
							<p class="text-[12px] text-gray-500 dark:text-gray-400">
								Обмен вашими данными помогает улучшать открытые модели со временем.
							</p>
						</div>
						<Switch
							name="shareConversationsWithModelAuthors"
							bind:checked={getShareWithAuthors, setShareWithAuthors}
						/>
					</div>
				{/if}


				<!-- Theme selector -->
				<div class="flex items-start justify-between py-3">
					<div>
						<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Тема</div>
						<p class="text-[12px] text-gray-500 dark:text-gray-400">
							Выберите светлую, тёмную или следуйте системной.
						</p>
					</div>
					<select
						class="rounded-md border border-gray-300 bg-white px-1 py-1 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
						value={themePref}
						onchange={(e) => {
							const v = e.currentTarget.value as ThemePreference;
							setTheme(v);
							themePref = v;
						}}
					>
						<option value="system">Системная</option>
						<option value="light">Светлая</option>
						<option value="dark">Тёмная</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Billing section (HuggingChat only) -->
		{#if publicConfig.isHuggingChat && page.data.user}
			<div
				class="rounded-xl border border-gray-200 bg-white px-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="divide-y divide-gray-200 dark:divide-gray-700">
					<!-- Bill usage to -->
					<div class="flex items-start justify-between py-3">
						<div>
							<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">Оплата</div>
							<p class="text-[12px] text-gray-500 dark:text-gray-400">
								Выберите личную или организационную оплату (для подходящих организаций).
							</p>
						</div>
						<div class="flex items-center">
							{#if billingOrgsLoading}
								<span class="text-xs text-gray-500 dark:text-gray-400">Загрузка...</span>
							{:else if billingOrgsError}
								<span class="text-xs text-red-500">{billingOrgsError}</span>
							{:else}
								<select
									class="rounded-md border border-gray-300 bg-white px-1 py-1 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
									value={getBillingOrganization()}
									onchange={(e) => setBillingOrganization(e.currentTarget.value)}
								>
									<option value="">Личная</option>
									{#each billingOrgs as org}
										<option value={org.preferred_username}>{org.name}</option>
									{/each}
								</select>
							{/if}
						</div>
					</div>
					<!-- Providers Usage -->
					<div class="flex items-start justify-between py-3">
						<div>
							<div class="text-[13px] font-medium text-gray-800 dark:text-gray-200">
								Использование провайдеров
							</div>
							<p class="text-[12px] text-gray-500 dark:text-gray-400">
								Посмотрите, какие провайдеры вы используете, и выберите предпочтительные.
							</p>
						</div>
						<a
							href={getBillingOrganization()
								? `https://huggingface.co/organizations/${getBillingOrganization()}/settings/inference-providers/overview`
								: "https://huggingface.co/settings/inference-providers/overview"}
							target="_blank"
							class="whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						>
							Просмотр использования
						</a>
					</div>
				</div>
			</div>
		{/if}

		<div class="mt-6 flex flex-col gap-2 self-start text-[13px]">
			{#if publicConfig.isHuggingChat}
				<a
					href="https://github.com/huggingface/chat-ui"
					target="_blank"
					class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400"
					><CarbonLogoGithub class="mr-1.5 shrink-0 text-sm " /> Репозиторий Github</a
				>
				<a
					href="https://huggingface.co/spaces/huggingchat/chat-ui/discussions/764"
					target="_blank"
					rel="noreferrer"
					class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400"
					><CarbonArrowUpRight class="mr-1.5 shrink-0 text-sm " /> Поделитесь отзывом о HuggingChat</a
				>
				<a
					href="{base}/privacy"
					class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700 dark:decoration-gray-700 dark:hover:decoration-gray-400"
					><CarbonArrowUpRight class="mr-1.5 shrink-0 text-sm " /> О приложении и конфиденциальность</a
				>
			{/if}
			<button
				onclick={async (e) => {
					e.preventDefault();

					confirm("Вы уверены, что хотите удалить все диалоги?") &&
						client.conversations
							.delete()
							.then(async () => {
								await goto(`${base}/`, { invalidateAll: true });
							})
							.catch((err) => {
								console.error(err);
								$error = err.message;
							});
				}}
				type="submit"
				class="flex items-center underline decoration-red-200 underline-offset-2 hover:decoration-red-500 dark:decoration-red-900 dark:hover:decoration-red-700"
				><CarbonTrashCan class="mr-2 inline text-sm text-red-500" />Удалить все диалоги</button
			>
		</div>
	</div>
</div>
