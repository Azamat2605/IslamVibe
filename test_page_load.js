const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function testPageLoad() {
	console.log("=== Тест загрузки страницы ===");

	const baseUrl = "http://localhost:5173";

	console.log("1. Загрузка главной страницы без куки...");
	try {
		const response = await fetch(baseUrl + "/", {
			method: "GET",
			headers: {
				Accept: "text/html",
			},
		});

		console.log(`   Статус: ${response.status}`);
		if (response.status === 200) {
			console.log("   ✅ Страница загружена");
			const text = await response.text();
			if (text.includes("500 Internal Error")) {
				console.log("   ❌ В ответе есть 500 ошибка!");
			} else {
				console.log("   ✅ Нет 500 ошибки в ответе");
			}
		} else {
			console.log(`   ❌ Ошибка загрузки: ${response.status}`);
		}
	} catch (error) {
		console.log(`   Ошибка: ${error.message}`);
	}

	console.log("\n2. Регистрация пользователя...");

	const testEmail = `test${Date.now()}@example.com`;
	const testPassword = "password123";

	try {
		const registerResponse = await fetch(baseUrl + "/register", {
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

		if (registerResponse.ok) {
			console.log("   ✅ Регистрация успешна");
			const setCookieHeader = registerResponse.headers.get("set-cookie");
			if (setCookieHeader) {
				const sessionCookie = setCookieHeader.split(";")[0];
				console.log(`   Кука: ${sessionCookie.substring(0, 30)}...`);

				console.log("\n3. Загрузка главной страницы с кукой...");
				const pageResponse = await fetch(baseUrl + "/", {
					method: "GET",
					headers: {
						Accept: "text/html",
						Cookie: sessionCookie,
					},
				});

				console.log(`   Статус: ${pageResponse.status}`);
				if (pageResponse.status === 200) {
					const text = await pageResponse.text();
					if (text.includes("500 Internal Error")) {
						console.log("   ❌ В ответе есть 500 ошибка!");
					} else {
						console.log("   ✅ Нет 500 ошибки в ответе");
					}
				} else {
					console.log(`   ❌ Ошибка загрузки: ${pageResponse.status}`);
				}
			}
		} else {
			console.log(`   ❌ Ошибка регистрации: ${registerResponse.status}`);
		}
	} catch (error) {
		console.log(`   Ошибка: ${error.message}`);
	}

	console.log("\n=== Тест завершен ===");
}

testPageLoad();
