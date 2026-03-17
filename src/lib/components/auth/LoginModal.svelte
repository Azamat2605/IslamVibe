<script lang="ts">
	import Modal from "$lib/components/Modal.svelte";
	import { base } from "$app/paths";
	import Logo from "$lib/components/icons/Logo.svelte";
	import { slide, fade } from "svelte/transition";
	import { cubicOut } from "svelte/easing";

	interface Props {
		onclose?: () => void;
	}

	let { onclose }: Props = $props();

	// Режимы отображения: providers | email | phone
	type ViewMode = "providers" | "email" | "phone";
	let currentView: ViewMode = $state("providers");

	// Данные форм
	let email = $state("");
	let password = $state("");
	let phone = $state("");

	// Состояния загрузки и ошибок
	let isLoading = $state(false);
	let errorMessage = $state("");

	function goBack() {
		currentView = "providers";
		email = "";
		password = "";
		phone = "";
		errorMessage = "";
	}

	async function handleEmailSubmit(e: Event) {
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
				// Успешный вход - закрыть модальное окно и перезагрузить
				onclose?.();
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

	async function handlePhoneSubmit(e: Event) {
		e.preventDefault();
		isLoading = true;
		errorMessage = "";

		try {
			const response = await fetch(`${base}/login/phone`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone }),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				// TODO: Показать форму для ввода кода подтверждения
				errorMessage = "Код отправлен! (функция в разработке)";
			} else {
				errorMessage = data.message || "Ошибка отправки кода. Попробуйте снова.";
			}
		} catch (err) {
			errorMessage = "Не удалось подключиться к серверу. Попробуйте позже.";
		} finally {
			isLoading = false;
		}
	}
</script>

<Modal width="max-w-md" closeButton={true} {onclose}>
	<div class="p-6 text-center">
		<!-- Логотип -->
		<div class="mb-4 flex justify-center">
			<Logo classNames="size-16 dark:invert" />
		</div>

		<!-- Заголовок -->
		<h2 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
			Присоединяйтесь к IslamVibe
		</h2>

		<!-- Описание -->
		<p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
			{#if currentView === "providers"}
				Выберите удобный способ входа для продолжения
			{:else if currentView === "email"}
				Введите ваш email и пароль
			{:else}
				Введите номер телефона
			{/if}
		</p>

		<!-- Контент в зависимости от режима -->
		{#if currentView === "providers"}
			<div
				class="flex flex-col gap-3"
				in:fade={{ duration: 200, easing: cubicOut }}
			>
				<!-- Google -->
				<a
					href="{base}/login/google"
					class="flex items-center justify-center gap-3 rounded-xl bg-emerald-600 px-4 py-3.5 font-medium text-white transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-[0.98]"
				>
					<svg class="size-5" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							fill="#ffffff"
						/>
						<path
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							fill="#ffffff"
						/>
						<path
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							fill="#ffffff"
						/>
						<path
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							fill="#ffffff"
						/>
					</svg>
					Войти через Google
				</a>

				<!-- Telegram -->
				<a
					href="{base}/login/telegram"
					class="flex items-center justify-center gap-3 rounded-xl bg-[#0088cc] px-4 py-3.5 font-medium text-white transition-all hover:bg-[#0077b5] hover:shadow-lg active:scale-[0.98]"
				>
					<svg class="size-5" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"
						/>
					</svg>
					Войти через Telegram
				</a>

				<!-- Email / Password -->
				<button
					onclick={() => (currentView = "email")}
					class="flex items-center justify-center gap-3 rounded-xl border-2 border-gray-300 bg-transparent px-4 py-3.5 font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 active:scale-[0.98] dark:border-gray-600 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-700/50"
				>
					<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="2" y="4" width="20" height="16" rx="2"/>
						<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
					</svg>
					Email / Пароль
				</button>

				<!-- Phone Number -->
				<button
					onclick={() => (currentView = "phone")}
					class="flex items-center justify-center gap-3 rounded-xl border-2 border-gray-300 bg-transparent px-4 py-3.5 font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 active:scale-[0.98] dark:border-gray-600 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-700/50"
				>
					<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
					</svg>
					По номеру телефона
				</button>
			</div>
		{:else if currentView === "email"}
			<form
				onsubmit={handleEmailSubmit}
				class="flex flex-col gap-4"
				in:slide={{ duration: 250, easing: cubicOut }}
			>
				<!-- Error message -->
				{#if errorMessage}
					<div class="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400" transition:slide={{ duration: 200 }}>
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

				<!-- Back button -->
				<button
					type="button"
					onclick={goBack}
					class="flex items-center justify-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="m15 18-6-6 6-6"/>
					</svg>
					Назад к выбору способа входа
				</button>
			</form>
		{:else if currentView === "phone"}
			<form
				onsubmit={handlePhoneSubmit}
				class="flex flex-col gap-4"
				in:slide={{ duration: 250, easing: cubicOut }}
			>
				<!-- Error message -->
				{#if errorMessage}
					<div class="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400" transition:slide={{ duration: 200 }}>
						{errorMessage}
					</div>
				{/if}

				<!-- Phone input -->
				<div class="text-left">
					<label for="phone" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Номер телефона
					</label>
					<input
						id="phone"
						type="tel"
						bind:value={phone}
						placeholder="+7 (999) 123-45-67"
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
						Отправка...
					{:else}
						Получить код
					{/if}
				</button>

				<!-- Back button -->
				<button
					type="button"
					onclick={goBack}
					class="flex items-center justify-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="m15 18-6-6 6-6"/>
					</svg>
					Назад к выбору способа входа
				</button>
			</form>
		{/if}

		<!-- Дополнительный текст -->
		<p class="mt-5 text-xs text-gray-500 dark:text-gray-500">
			{#if currentView === "providers"}
				Вход безопасен и не требует сложной регистрации
			{:else}
				Нажимая "Войти", вы соглашаетесь с условиями использования
			{/if}
		</p>
	</div>
</Modal>
