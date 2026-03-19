<script lang="ts">
	import Modal from "$lib/components/Modal.svelte";
	import IconOmni from "$lib/components/icons/IconOmni.svelte";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";

	const publicConfig = usePublicConfig();

	interface Props {
		close: () => void;
	}

	let { close }: Props = $props();
</script>

<Modal closeOnBackdrop={false} onclose={close} width="!max-w-[420px] !m-4">
	<div
		class="flex w-full flex-col gap-8 bg-white bg-gradient-to-b to-transparent px-6 pb-7 dark:bg-black dark:from-white/10 dark:to-white/5"
	>
		<div
			class="relative -mx-6 grid h-48 select-none place-items-center bg-gradient-to-t from-black/5 dark:from-white/10"
		>
			<img
				class="size-full bg-black object-cover"
				src="{publicConfig.assetPath}/omni-welcome.gif"
				alt="IslamVibe AI animation"
			/>
		</div>

		<div class="text-gray-700 dark:text-gray-200">
			<p class="text-[15px] leading-relaxed">
				Добро пожаловать в {publicConfig.PUBLIC_APP_NAME} — ваш исламский ИИ-помощник, основанный на открытых моделях.
			</p>
			<p class="mt-3 text-[15px] leading-relaxed">
				<IconOmni classNames="-translate-y-px" /> <strong>Omni</strong> автоматически выбирает лучшую модель для оптимальных ответов в зависимости от вашего запроса.
			</p>
			<p class="mt-3 text-[15px] leading-relaxed">
				Вы также можете выбрать любую доступную модель для прямого общения.
			</p>
		</div>

		<button
			type="button"
			class="w-full cursor-pointer rounded-xl bg-emerald-600 px-5 py-2.5 text-base font-medium text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
			onclick={close}
		>
			Начать общение
		</button>
	</div>
</Modal>
