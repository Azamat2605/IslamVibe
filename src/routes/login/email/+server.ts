import { json, type RequestHandler } from "@sveltejs/kit";
import { collections } from "$lib/server/database";
import { sha256 } from "$lib/utils/sha256";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { refreshSessionCookie } from "$lib/server/auth";
import { ObjectId } from "mongodb";

const loginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const parsed = loginSchema.safeParse(body);

		if (!parsed.success) {
			return json(
				{
					success: false,
					message: "Validation failed",
					errors: parsed.error.errors,
				},
				{ status: 400 }
			);
		}

		const { email, password } = parsed.data;

		// Find user by email
		const user = await collections.users.findOne({ email });
		if (!user) {
			return json(
				{
					success: false,
					message: "Invalid email or password",
				},
				{ status: 401 }
			);
		}

		// Check if user has password hash (email/password user)
		if (!user.passwordHash) {
			return json(
				{
					success: false,
					message: "This email is registered with another authentication method",
				},
				{ status: 401 }
			);
		}

		// Verify password
		const passwordValid = await bcrypt.compare(password, user.passwordHash);
		if (!passwordValid) {
			return json(
				{
					success: false,
					message: "Invalid email or password",
				},
				{ status: 401 }
			);
		}

		// Create new session
		const secretSessionId = crypto.randomUUID();
		const sessionId = await sha256(secretSessionId);

		// Remove existing sessions for this user (optional, could keep multiple)
		// await collections.sessions.deleteMany({ userId: user._id });

		await collections.sessions.insertOne({
			_id: new ObjectId(),
			sessionId,
			userId: user._id,
			createdAt: new Date(),
			updatedAt: new Date(),
			expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
		});

		// Set session cookie
		refreshSessionCookie(cookies, secretSessionId);

		return json({
			success: true,
			message: "Login successful",
			user: {
				id: user._id.toString(),
				email: user.email,
				username: user.username,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		return json(
			{
				success: false,
				message: "Internal server error",
			},
			{ status: 500 }
		);
	}
};
