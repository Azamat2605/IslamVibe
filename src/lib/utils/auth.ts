import { page } from "$app/state";
import { loginModalOpen } from "$lib/stores/loginModal";

/**
 * Redirects to the login page if the user is not authenticated
 * and the login feature is enabled.
 * If on client side, opens the login modal instead of redirecting.
 */
export function requireAuthUser(): boolean {
	// Check if user exists in page data
	if (!page.data.user) {
		// Open login modal instead of redirecting
		loginModalOpen.set(true);
		return true;
	}
	return false;
}
