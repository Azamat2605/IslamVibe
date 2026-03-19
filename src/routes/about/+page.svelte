<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>О проекте | IslamVibe</title>
</svelte:head>

<div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
  <!-- Хедер -->
  <header class="p-6 border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-4xl mx-auto flex items-center gap-4">
      <!-- Логотип -->
      <img src="/chatui/logo.svg" alt="IslamVibe" class="w-10 h-10 dark:invert" />
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">IslamVibe</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Все правдивое об исламе</p>
      </div>
    </div>
  </header>

  <!-- Центр страницы -->
  <main class="flex-1 flex items-center justify-center p-6">
    <div class="text-center max-w-md">
      <!-- Иконка -->
      <div class="text-6xl mb-4">🚧</div>
      
      <!-- Заголовок -->
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Страница в разработке
      </h2>
      
      <!-- Подзаголовок -->
      <p class="text-gray-500 dark:text-gray-400 mb-6">
        Мы работаем над этим разделом. Скоро здесь появится полезная информация об исламе.
      </p>
      
      <!-- Кнопка назад -->
      <button
        on:click={() => goto(base || '/')}
        class="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
      >
        Вернуться к чату
      </button>
    </div>
  </main>
</div>
