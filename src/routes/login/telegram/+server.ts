import { redirect, type RequestHandler } from "@sveltejs/kit";
import { base } from "$app/paths";

export const GET: RequestHandler = async ({ url }) => {
	// Перенаправляем на основной login с provider=telegram
	const next = url.searchParams.get("next");
	const redirectUrl = new URL(`${url.origin}${base}/login`);
	redirectUrl.searchParams.set("provider", "telegram");
	if (next) {
		redirectUrl.searchParams.set("next", next);
	}
	throw redirect(302, redirectUrl.toString());
};
