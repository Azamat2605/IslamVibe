/// <reference types="@sveltejs/kit" />
/// <reference types="unplugin-icons/types/svelte" />

import type { User } from "$lib/types/User";

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	interface Window {
		chaport: {
			open: () => void;
			close: () => void;
			q: (...args: unknown[]) => void;
			on: (event: string, callback: (...args: unknown[]) => void) => void;
			_q: unknown[];
			_l: Record<string, ((...args: unknown[]) => void)[]>;
		};
		chaportConfig: {
			appId: string;
			launcher?: {
				show?: boolean;
			};
		};
	}

	namespace App {
		// interface Error {}
		interface Locals {
			sessionId: string;
			user?: User;
			isAdmin: boolean;
			token?: string;
			/** Organization to bill inference requests to (from settings) */
			billingOrganization?: string;
		}

		interface Error {
			message: string;
			errorId?: ReturnType<typeof crypto.randomUUID>;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
