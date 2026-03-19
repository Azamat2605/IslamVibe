<script lang="ts">
	import { base } from "$app/paths";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { page } from "$app/state";

	let email = $state("");
	let password = $state("");
	let isLoading = $state(false);
	let errorMessage = $state("");

	// Если пользователь уже авторизован, редирект на главную
	onMount(() => {
		if ($page.data.user) {
			goto(`${base}/`);
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isLoading = true;
		errorMessage = "";

		try {
			const response = await fetch(`${base}/login/email`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				// Успешный вход - перезагрузить страницу
				window.location.reload();
			} else {
				errorMessage = data.message || "Ошибка входа. Проверьте данные и попробуйте снова.";
			}
		} catch (err) {
			errorMessage = "Не удалось подключиться к серверу. Попробуйте позже.";
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
	<div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
		<!-- Заголовок -->
		<h1 class="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
			Вход по email
		</h1>
		<p class="mb-8 text-center text-gray-600 dark:text-gray-400">
			Введите ваш email и пароль
		</p>

		<!-- Форма -->
		<form onsubmit={handleSubmit} class="flex flex-col gap-4">
			<!-- Error message -->
			{#if errorMessage}
				<div class="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
					{errorMessage}
				</div>
			{/if}

			<!-- Email input -->
			<div class="text-left">
				<label for="email" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Email
				</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="example@mail.com"
					required
					disabled={isLoading}
					class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-emerald-400"
				/>
			</div>

			<!-- Password input -->
			<div class="text-left">
				<label for="password" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Пароль
				</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					placeholder="••••••••"
					required
					disabled={isLoading}
					class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-emerald-400"
				/>
			</div>

			<!-- Submit button -->
			<button
				type="submit"
				disabled={isLoading}
				class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 font-medium text-white transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:hover:bg-emerald-600"
			>
				{#if isLoading}
					<svg class="size-5 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
					</svg>
					Вход...
				{:else}
					Войти
				{/if}
			</button>

			<!-- Back link -->
			<a
				href="{base}/login"
				class="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
			>
				<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="m15 18-6-6 6-6"/>
				</svg>
				Назад к выбору способа входа
			</a>
		</form>
	</div>
</div>
