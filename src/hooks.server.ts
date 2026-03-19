import { building } from "$app/environment";
import { base } from "$app/paths";
import type { Handle, HandleServerError, ServerInit, HandleFetch } from "@sveltejs/kit";
import { initServer } from "$lib/server/hooks/init";
import { handleRequest } from "$lib/server/hooks/handle";
import { handleServerError } from "$lib/server/hooks/error";
import { handleFetchRequest } from "$lib/server/hooks/fetch";

export const init: ServerInit = async () => {
	if (building) return;
	return initServer();
};

const PUBLIC_PATHS = [
	`${base}/`,
	`${base}/login`,
	`${base}/login/callback`,
	`${base}/healthcheck`,
	`${base}/r/`,
	`${base}/conversation/`,
	`${base}/models/`,
	`${base}/register`,
	`${base}/logout`,
	`${base}/privacy`,
	`${base}/metrics`,
	`${base}/__debug/`,
	`${base}/.well-known/`,
	// API v2 public endpoints (explicitly listed)
	`${base}/api/v2/auth/register`,
	`${base}/api/v2/auth/login`,
	`${base}/api/v2/auth/logout`,
	`${base}/api/v2/public-config`,
	`${base}/api/v2/feature-flags`,
	`${base}/api/v2/models`,
];

const isPublicPath = (pathname: string) => {
	return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
};

export const handle: Handle = async (input) => {
	if (building) {
		// During static build, still replace %gaId% placeholder with empty string
		// to prevent the GA script from loading with an invalid ID
		return input.resolve(input.event, {
			transformPageChunk: ({ html }) => html.replace("%gaId%", ""),
		});
	}

	// Skip authentication for public paths
	if (isPublicPath(input.event.url.pathname)) {
		return input.resolve(input.event);
	}

	return handleRequest(input);
};

export const handleError: HandleServerError = async (input) => {
	if (building) throw input.error;
	return handleServerError(input);
};

export const handleFetch: HandleFetch = async (input) => {
	if (building) return input.fetch(input.request);
	return handleFetchRequest(input);
};
