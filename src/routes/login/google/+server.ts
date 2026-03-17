import { redirect, type RequestHandler } from "@sveltejs/kit";
import { base } from "$app/paths";

export const GET: RequestHandler = async ({ url }) => {
	// Перенаправляем на основной login с provider=google
	const next = url.searchParams.get("next");
	const redirectUrl = new URL(`${url.origin}${base}/login`);
	redirectUrl.searchParams.set("provider", "google");
	if (next) {
		redirectUrl.searchParams.set("next", next);
	}
	throw redirect(302, redirectUrl.toString());
};
