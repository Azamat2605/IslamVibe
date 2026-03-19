import { error } from "@sveltejs/kit";

/**
 * Throws 401 if neither a user._id nor sessionId is present in locals.
 */
export function requireAuth(locals: App.Locals): void {
	console.log("🔐 [REQUIRE_AUTH] Checking auth:", {
		hasUser: !!locals.user,
		userId: locals.user?._id?.toString(),
		hasSessionId: !!locals.sessionId,
		sessionId: locals.sessionId?.substring(0, 10) + "...",
	});

	// Для protected endpoints требуется пользователь, а не просто сессия
	if (!locals.user?._id) {
		console.log("🚨 [REQUIRE_AUTH] No user._id, throwing 401");
		error(401, "Must have a valid user");
	}

	console.log("✅ [REQUIRE_AUTH] Auth passed");
}

/**
 * Throws 401 if no user/session, 403 if not admin.
 */
export function requireAdmin(locals: App.Locals): void {
	if (!locals.user && !locals.sessionId) {
		error(401, "Unauthorized");
	}
	if (!locals.isAdmin) {
		error(403, "Admin privileges required");
	}
}
