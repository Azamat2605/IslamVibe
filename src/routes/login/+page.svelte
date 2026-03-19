<script lang="ts">
	import { base } from "$app/paths";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { loginModalOpen } from "$lib/stores/loginModal";

	// Если пользователь уже авторизован, редирект на главную или на next
	onMount(() => {
		if ($page.data.user) {
			const next = $page.url.searchParams.get("next");
			const redirectUrl = next ? decodeURIComponent(next) : `${base}/`;
			goto(redirectUrl, { invalidateAll: true });
			return;
		}
		// Открыть модалку входа
		loginModalOpen.set(true);
	});
</script>

<!-- Страница не показывает собственный контент, только фон -->
<div class="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
	<div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
		<!-- Логотип -->
		<div class="mb-6 flex justify-center">
			<svg
				class="size-16 text-emerald-600 dark:text-emerald-400"
				fill="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
				/>
			</svg>
		</div>

		<!-- Заголовок -->
		<h1 class="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
			Вход в IslamVibe
		</h1>
		<p class="mb-8 text-center text-gray-600 dark:text-gray-400">
			Открывается модальное окно входа...
		</p>

		<!-- Индикатор загрузки -->
		<div class="flex justify-center">
			<div class="size-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
		</div>

		<!-- Дополнительный текст -->
		<p class="mt-8 text-center text-xs text-gray-500 dark:text-gray-500">
			Если модальное окно не открылось, нажмите на кнопку "Вход / Регистрация" в сайдбаре
		</p>
	</div>
</div>
