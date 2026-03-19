<script lang="ts" module>
	export const titles: { [key: string]: string } = {
		today: "Сегодня",
		week: "На этой неделе",
		month: "В этом месяце",
		older: "Ранее",
	} as const;
</script>

<script lang="ts">
	import { base } from "$app/paths";

	import Logo from "$lib/components/icons/Logo.svelte";
	import IconSun from "$lib/components/icons/IconSun.svelte";
	import IconMoon from "$lib/components/icons/IconMoon.svelte";
	import IconInfo from "$lib/components/icons/IconInfo.svelte";
	import IconTelegram from "$lib/components/icons/IconTelegram.svelte";
	import IconHelp from "$lib/components/icons/IconHelp.svelte";
	import { switchTheme, subscribeToTheme } from "$lib/switchTheme";
	import { isAborted } from "$lib/stores/isAborted";
	import { onDestroy } from "svelte";
	import { translations, t, type Translations } from "$lib/i18n";

	import NavConversationItem from "./NavConversationItem.svelte";
	import type { LayoutData } from "../../routes/$types";
	import type { ConvSidebar } from "$lib/types/ConvSidebar";
	import type { Model } from "$lib/types/Model";
	import { page } from "$app/state";
	import InfiniteScroll from "./InfiniteScroll.svelte";
	import { CONV_NUM_PER_PAGE } from "$lib/constants/pagination";
	import { browser } from "$app/environment";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import { useAPIClient, handleResponse } from "$lib/APIClient";
	import { requireAuthUser } from "$lib/utils/auth";
	import { isPro } from "$lib/stores/isPro";
	import IconPro from "$lib/components/icons/IconPro.svelte";
	import { loginModalOpen } from "$lib/stores/loginModal";
	import { goto } from "$app/navigation";

	const publicConfig = usePublicConfig();
	const client = useAPIClient();

	interface Props {
		conversations: ConvSidebar[];
		user: LayoutData["user"];
		p?: number;
		ondeleteConversation?: (id: string) => void;
		oneditConversationTitle?: (payload: { id: string; title: string }) => void;
	}

	let {
		conversations = $bindable(),
		user,
		p = $bindable(0),
		ondeleteConversation,
		oneditConversationTitle,
	}: Props = $props();

	// Логирование изменений пользователя для отладки
	$effect(() => {
		console.log('NavMenu user changed:', user);
	});

	let hasMore = $state(true);

	function handleNewChatClick(e: MouseEvent) {
		isAborted.set(true);

		if (requireAuthUser()) {
			e.preventDefault();
		}
	}

	function handleNavItemClick(e: MouseEvent) {
		if (requireAuthUser()) {
			e.preventDefault();
		}
	}

	const dateRanges = [
		new Date().setDate(new Date().getDate() - 1),
		new Date().setDate(new Date().getDate() - 7),
		new Date().setMonth(new Date().getMonth() - 1),
	];

	let groupedConversations = $derived({
		today: conversations.filter(({ updatedAt }) => updatedAt.getTime() > dateRanges[0]),
		week: conversations.filter(
			({ updatedAt }) => updatedAt.getTime() > dateRanges[1] && updatedAt.getTime() < dateRanges[0]
		),
		month: conversations.filter(
			({ updatedAt }) => updatedAt.getTime() > dateRanges[2] && updatedAt.getTime() < dateRanges[1]
		),
		older: conversations.filter(({ updatedAt }) => updatedAt.getTime() < dateRanges[2]),
	});

	const nModels: number = page.data.models.filter((el: Model) => !el.unlisted).length;

	async function handleVisible() {
		p++;
		const newConvs = await client.conversations
			.get({
				query: {
					p,
				},
			})
			.then(handleResponse)
			.then((r) => r.conversations)
			.catch((): ConvSidebar[] => []);

		if (newConvs.length === 0) {
			hasMore = false;
		}

		conversations = [...conversations, ...newConvs];
	}

	$effect(() => {
		if (conversations.length <= CONV_NUM_PER_PAGE) {
			// reset p to 0 if there's only one page of content
			// that would be caused by a data loading invalidation
			p = 0;
		}
	});

	let isDark = $state(false);
	let unsubscribeTheme: (() => void) | undefined;

	if (browser) {
		unsubscribeTheme = subscribeToTheme(({ isDark: nextIsDark }) => {
			isDark = nextIsDark;
		});
	}

	onDestroy(() => {
		unsubscribeTheme?.();
	});

	function openLoginModal() {
		loginModalOpen.set(true);
	}

	function closeLoginModal() {
		loginModalOpen.set(false);
	}

	async function handleLogout() {
		try {
			await fetch('/logout', { 
				method: 'POST',
				credentials: 'include' // важно для кук
			});
			// После успеха — перезагрузить страницу для обновления состояния
			window.location.reload();
		} catch (e) {
			console.error('Logout failed:', e);
		}
	}
</script>

<div
	class="sticky top-0 flex flex-none touch-none items-center justify-between px-1.5 py-3.5 max-sm:pt-0"
>
	<a
		class="flex select-none items-center rounded-xl text-lg font-semibold"
		href="{publicConfig.PUBLIC_ORIGIN}{base}/"
	>
		<Logo classNames="dark:invert mr-[2px]" />
		{publicConfig.PUBLIC_APP_NAME}
	</a>
	<a
		href={`${base}/`}
		onclick={handleNewChatClick}
		class="flex rounded-lg border bg-white px-2 py-0.5 text-center shadow-sm hover:shadow-none dark:border-gray-600 dark:bg-gray-700 sm:text-smd"
		title="Ctrl/Cmd + Shift + O"
	>
		Новый чат
	</a>
</div>

<div
	class="scrollbar-custom flex touch-pan-y flex-col gap-1 overflow-y-auto rounded-r-xl border border-l-0 border-gray-100 from-gray-50 px-3 pb-3 pt-2 text-[.9rem] dark:border-transparent dark:from-gray-800/30 max-sm:bg-gradient-to-t md:bg-gradient-to-l"
>
	<div class="flex flex-col gap-0.5">
		{#each Object.entries(groupedConversations) as [group, convs]}
			{#if convs.length}
				<h4 class="mb-1.5 mt-4 pl-0.5 text-sm text-gray-400 first:mt-0 dark:text-gray-500">
					{titles[group]}
				</h4>
				{#each convs as conv}
					<NavConversationItem {conv} {oneditConversationTitle} {ondeleteConversation} />
				{/each}
			{/if}
		{/each}
	</div>
	{#if hasMore}
		<InfiniteScroll onvisible={handleVisible} />
	{/if}
</div>
<div
	class="flex touch-none flex-col gap-1 rounded-r-xl border border-l-0 border-gray-100 p-3 text-sm dark:border-transparent md:mt-3 md:bg-gradient-to-l md:from-gray-50 md:dark:from-gray-800/30"
>

	<!-- IslamVibe: Additional navigation links -->
	{#if !user}
	<button
		type="button"
		onclick={openLoginModal}
		class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
	>
			<svg
				class="text-base"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
				<polyline points="10 17 15 12 10 7" />
				<line x1="15" y1="12" x2="3" y2="12" />
			</svg>
			Вход / Регистрация
		</button>
	{:else}
		<div
			class="group flex h-9 items-center gap-1.5 rounded-lg pl-2.5 pr-2 hover:bg-gray-100 first:hover:bg-transparent dark:hover:bg-gray-700 first:dark:hover:bg-transparent"
		>
			<div
				class="size-3.5 rounded-full border bg-gradient-to-br from-emerald-500 to-teal-600 dark:border-white/40 flex items-center justify-center text-[8px] text-white font-bold"
			>
				{(user?.username || user?.email || "U").charAt(0).toUpperCase()}
			</div>
			<span
				class="flex flex-none shrink items-center gap-1.5 truncate pr-2 text-gray-500 dark:text-gray-400"
				>{user?.username || user?.email}</span
			>

			{#if $isPro === false}
				<a
					href="#"
					class="ml-auto flex h-[20px] items-center gap-1 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400"
				>
					<IconPro />
					IslamVibe Pro
				</a>
			{:else if $isPro === true}
				<span
					class="ml-auto flex h-[20px] items-center gap-1 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400"
				>
					<IconPro />
					IslamVibe Pro
				</span>
			{/if}
		</div>
		
		<!-- Кнопка выхода -->
		<button
			type="button"
			onclick={handleLogout}
			class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		>
			<svg
				class="text-base"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
				<polyline points="16 17 21 12 16 7" />
				<line x1="21" y1="12" x2="9" y2="12" />
			</svg>
			Выход
		</button>
	{/if}

	<a
		href="{base}/about"
		class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
	>
		<IconInfo classNames="text-base" />
		{t("nav.aboutProject", $translations as Translations)}
	</a>
	<a
		href="https://t.me/islam_vibee"
		target="_blank"
		rel="noopener noreferrer"
		class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
	>
		<IconTelegram classNames="text-base" />
		{t("nav.telegram", $translations as Translations)}
	</a>
	<button
		type="button"
		class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 cursor-pointer"
		onclick={() => {
			if (window.chaport) {
				window.chaport.open();
			}
		}}
	>
		<IconHelp classNames="text-base" />
		{t("nav.help", $translations as Translations)}
	</button>

	<!-- Separator between info links and system settings -->
	<div class="my-2 border-t border-gray-200 dark:border-gray-700"></div>

	<a
		href="{base}/models"
		class="flex h-9 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		onclick={handleNavItemClick}
	>
		Модели
		<span
			class="ml-auto rounded-md bg-gray-500/5 px-1.5 py-0.5 text-xs text-gray-400 dark:bg-gray-500/20 dark:text-gray-400"
			>{nModels}</span
		>
	</a>


	<span class="flex gap-1">
		<a
			href="{base}/settings/application"
			class="flex h-9 flex-none flex-grow items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
			onclick={handleNavItemClick}
		>
		Настройки
		</a>
		<button
			onclick={() => {
				switchTheme();
			}}
		aria-label="Переключить тему"
			class="flex size-9 min-w-[1.5em] flex-none items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		>
			{#if browser}
				{#if isDark}
					<IconSun />
				{:else}
					<IconMoon />
				{/if}
			{/if}
		</button>
	</span>

</div>
