import { json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {
	const { phone } = await request.json();

	// TODO: Implement phone authentication
	// This is a placeholder - actual implementation would require:
	// 1. Phone number validation
	// 2. SMS/WhatsApp verification code sending
	// 3. Code verification endpoint
	// 4. Session creation after verification

	console.log("Phone login attempt:", phone);

	return json(
		{
			success: false,
			message: "Phone authentication is not yet implemented",
		},
		{ status: 501 }
	);
};
