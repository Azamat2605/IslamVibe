import { json, type RequestHandler } from "@sveltejs/kit";
import { collections } from "$lib/server/database";
import { ObjectId } from "mongodb";
import { sha256 } from "$lib/utils/sha256";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { refreshSessionCookie } from "$lib/server/auth";

const registerSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	username: z.string().optional(),
});

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const parsed = registerSchema.safeParse(body);

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

		const { email, password, username } = parsed.data;

		// Check if user already exists
		const existingUser = await collections.users.findOne({ email });
		if (existingUser) {
			return json(
				{
					success: false,
					message: "User with this email already exists",
				},
				{ status: 409 }
			);
		}

		// Hash password
		const saltRounds = 10;
		const passwordHash = await bcrypt.hash(password, saltRounds);

		// Create user ID from email hash
		const userId = new ObjectId((await sha256(email)).slice(0, 24));

		// Create user document
		const user = {
			_id: userId,
			email,
			passwordHash,
			username: username || email.split("@")[0],
			name: username || email.split("@")[0],
			avatarUrl: "",
			hfUserId: email, // Using email as hfUserId for compatibility
			isAdmin: false,
			isEarlyAccess: false,
			emailVerified: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		console.log("📝 [REGISTER] Creating user:", email);
		await collections.users.insertOne(user);
		console.log("📝 [REGISTER] User created:", userId.toString());

		// Create session
		const secretSessionId = crypto.randomUUID();
		const sessionId = await sha256(secretSessionId);
		console.log(
			"📝 [REGISTER] Session created - secretSessionId:",
			secretSessionId.substring(0, 10) + "..."
		);
		console.log(
			"📝 [REGISTER] Session created - sessionId (hashed):",
			sessionId.substring(0, 10) + "..."
		);

		await collections.sessions.insertOne({
			_id: new ObjectId(),
			sessionId,
			userId: user._id,
			createdAt: new Date(),
			updatedAt: new Date(),
			expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
		});
		console.log("📝 [REGISTER] Session saved to DB");

		// Set session cookie
		refreshSessionCookie(cookies, secretSessionId);
		console.log("📝 [REGISTER] Cookie set with secretSessionId");

		return json({
			success: true,
			message: "Registration successful",
			user: {
				id: user._id.toString(),
				email: user.email,
				username: user.username,
			},
		});
	} catch (error) {
		console.error("Registration error:", error);
		return json(
			{
				success: false,
				message: "Internal server error",
			},
			{ status: 500 }
		);
	}
};
