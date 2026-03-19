const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function testRegistration() {
	console.log("[1] Starting registration test...");

	const testEmail = `test${Date.now()}@example.com`;
	const testPassword = "password123";

	console.log("[2] Sending POST /register");

	try {
		const response = await fetch("http://localhost:5174/register", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email: testEmail,
				password: testPassword,
				username: "testuser",
			}),
		});

		console.log("[3] Response status:", response.status);
		const data = await response.json();
		console.log("[4] Response data:", data);

		// Get cookies from response
		const cookies = response.headers.get("set-cookie");
		console.log("[5] Set-Cookie header:", cookies);

		if (response.ok && data.success) {
			console.log("[6] Registration successful");

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Try to access /api/v2/user/settings with the cookie
			console.log("[7] Trying to GET /api/v2/user/settings");

			const settingsResponse = await fetch("http://localhost:5174/api/v2/user/settings", {
				method: "GET",
				headers: {
					Cookie: cookies ? cookies.split(";")[0] : "",
				},
			});

			console.log("[8] Settings response status:", settingsResponse.status);

			if (settingsResponse.status === 401) {
				console.log("[9] Got 401 - user not authenticated");
				const errorText = await settingsResponse.text();
				console.log("[10] Error response:", errorText);
			} else {
				console.log("[9] Settings response OK");
				const settingsData = await settingsResponse.json();
				console.log("[10] Settings data:", settingsData);
			}
		} else {
			console.log("[6] Registration failed:", data.message);
		}
	} catch (error) {
		console.error("Error:", error);
	}
}

testRegistration();
