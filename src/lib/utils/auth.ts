// import { goto } from "$app/navigation";  // временно закомментировано для фиксации ESLint
// import { base } from "$app/paths";       // временно закомментировано для фиксации ESLint
// import { page } from "$app/state";       // временно закомментировано для фиксации ESLint

/**
 * Redirects to the login page if the user is not authenticated
 * and the login feature is enabled.
 *
 * IslamVibe: Authentication temporarily disabled - always returns false
 * to allow all navigation without requiring login.
 */
export function requireAuthUser(): boolean {
	// IslamVibe: Temporarily disabled authentication check
	// Original logic:
	// if (page.data.loginEnabled && !page.data.user) {
	// 	const next = page.url.pathname + page.url.search;
	// 	const url = `${base}/login?next=${encodeURIComponent(next)}`;
	// 	goto(url, { invalidateAll: true });
	// 	return true;
	// }
	return false;
}
