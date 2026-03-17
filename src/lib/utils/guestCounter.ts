/**
 * Утилита для отслеживания количества сообщений гостя
 * Данные хранятся в localStorage и сохраняются между сессиями
 */

// Ключ для localStorage
const GUEST_MESSAGE_COUNT_KEY = "guest_message_count";

// Максимальное количество сообщений для гостя
export const MAX_GUEST_MESSAGES = 3;

/**
 * Получить текущее количество отправленных сообщений гостя
 * @returns Количество отправленных сообщений
 */
export function getGuestMessageCount(): number {
	if (typeof window === "undefined") return 0;
	const count = localStorage.getItem(GUEST_MESSAGE_COUNT_KEY);
	return count ? parseInt(count, 10) : 0;
}

/**
 * Увеличить счетчик сообщений гостя на 1
 * @returns Новое значение счетчика
 */
export function incrementGuestMessageCount(): number {
	const current = getGuestMessageCount();
	const newCount = current + 1;
	if (typeof window !== "undefined") {
		localStorage.setItem(GUEST_MESSAGE_COUNT_KEY, newCount.toString());
	}
	return newCount;
}

/**
 * Получить оставшееся количество запросов для гостя
 * @returns Количество оставшихся запросов
 */
export function getRemainingGuestMessages(): number {
	return Math.max(0, MAX_GUEST_MESSAGES - getGuestMessageCount());
}

/**
 * Проверить, может ли гость отправлять сообщения
 * @returns true если гость может отправить сообщение
 */
export function canGuestSendMessage(): boolean {
	return getGuestMessageCount() < MAX_GUEST_MESSAGES;
}

/**
 * Сбросить счетчик сообщений гостя
 * Используется для тестирования или при авторизации
 */
export function resetGuestMessageCount(): void {
	if (typeof window !== "undefined") {
		localStorage.removeItem(GUEST_MESSAGE_COUNT_KEY);
	}
}
