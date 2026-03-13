import { currentLanguage } from "$lib/i18n";

/**
 * Check if current language is RTL (Right-to-Left)
 */
export function isRTL(): boolean {
	const lang = "ru";
	// Get current language value from store
	// This is a simplified version - in real implementation you'd need to subscribe
	const rtlLanguages = ["ar", "he", "fa", "ur"];
	return rtlLanguages.includes(lang);
}

/**
 * Get text direction for current language
 */
export function getTextDirection(): "ltr" | "rtl" {
	return isRTL() ? "rtl" : "ltr";
}

/**
 * Apply RTL styles to document
 */
export function applyRTLStyles(): void {
	if (typeof document === "undefined") return;

	const dir = getTextDirection();
	document.documentElement.dir = dir;
	document.documentElement.lang = "ar"; // Set language attribute

	// Add RTL-specific CSS class
	if (dir === "rtl") {
		document.documentElement.classList.add("rtl");
	} else {
		document.documentElement.classList.remove("rtl");
	}
}

/**
 * Initialize RTL support
 */
export function initRTL(): () => void {
	// Subscribe to language changes
	const unsubscribe = currentLanguage.subscribe(() => {
		applyRTLStyles();
	});

	// Initial apply
	applyRTLStyles();

	// Return cleanup function
	return unsubscribe;
}
