const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function testComprehensive() {
	console.log("=== Комплексный тест пользовательского сценария ===");

	const baseUrl = "http://localhost:5173";

	// 1. Регистрация
	console.log("\n1. Регистрация нового пользователя...");
	const testEmail = `test${Date.now()}@example.com`;
	const testPassword = "password123";

	let sessionCookie = null;

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

		if (!registerResponse.ok) {
			console.log(`   ❌ Ошибка регистрации: ${registerResponse.status}`);
			const text = await registerResponse.text();
			console.log(`   Ответ: ${text.substring(0, 100)}...`);
			return;
		}

		console.log("   ✅ Регистрация успешна");

		// Получаем куку
		const setCookieHeader = registerResponse.headers.get("set-cookie");
		if (setCookieHeader) {
			sessionCookie = setCookieHeader.split(";")[0];
			console.log(`   Кука получена: ${sessionCookie.substring(0, 30)}...`);
		} else {
			console.log("   ❌ Кука не установлена при регистрации");
			return;
		}

		// 2. Загрузка главной страницы с кукой
		console.log("\n2. Загрузка главной страницы с кукой...");
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
				console.log(
					"   Фрагмент ответа:",
					text.substring(text.indexOf("500"), text.indexOf("500") + 200)
				);
			} else {
				console.log("   ✅ Нет 500 ошибки в ответе");
			}

			// Проверяем, что пользователь загружен (должен быть в данных)
			if (text.includes("testuser") || text.includes(testEmail)) {
				console.log("   ✅ Пользователь отображается на странице");
			} else {
				console.log("   ⚠️  Пользователь не найден в HTML (может быть нормально для SPA)");
			}
		} else {
			console.log(`   ❌ Ошибка загрузки: ${pageResponse.status}`);
		}

		// 3. Запросы к API с кукой
		console.log("\n3. Тестирование API endpoints с кукой...");

		const endpoints = [
			"/api/v2/user",
			"/api/v2/user/settings",
			"/api/v2/conversations?p=0",
			"/api/v2/models",
		];

		for (const endpoint of endpoints) {
			try {
				const apiResponse = await fetch(baseUrl + endpoint, {
					method: "GET",
					headers: {
						Accept: "application/json",
						Cookie: sessionCookie,
					},
				});

				console.log(`   ${endpoint}: ${apiResponse.status}`);
				if (apiResponse.status === 200) {
					console.log("     ✅ Успех");
				} else if (apiResponse.status === 401) {
					console.log("     ❌ 401 - нет аутентификации!");
				} else {
					console.log(`     ⚠️  Неожиданный статус: ${apiResponse.status}`);
				}
			} catch (error) {
				console.log(`   ${endpoint}: Ошибка - ${error.message}`);
			}
		}

		// 4. Запросы к API БЕЗ куки (должны вернуть 401 для protected endpoints)
		console.log("\n4. Тестирование API endpoints БЕЗ куки...");

		const protectedEndpoints = [
			"/api/v2/user",
			"/api/v2/user/settings",
			"/api/v2/conversations?p=0",
		];

		for (const endpoint of protectedEndpoints) {
			try {
				const apiResponse = await fetch(baseUrl + endpoint, {
					method: "GET",
					headers: {
						Accept: "application/json",
					},
				});

				console.log(`   ${endpoint}: ${apiResponse.status}`);
				if (apiResponse.status === 401) {
					console.log("     ✅ Правильно требует аутентификацию");
				} else if (apiResponse.status === 200) {
					console.log("     ❌ 200 - доступно без аутентификации!");
				} else {
					console.log(`     ⚠️  Статус: ${apiResponse.status}`);
				}
			} catch (error) {
				console.log(`   ${endpoint}: Ошибка - ${error.message}`);
			}
		}

		// 5. Public API endpoints должны работать без куки
		console.log("\n5. Тестирование public API endpoints БЕЗ куки...");

		const publicEndpoints = ["/api/v2/models", "/api/v2/public-config", "/api/v2/feature-flags"];

		for (const endpoint of publicEndpoints) {
			try {
				const apiResponse = await fetch(baseUrl + endpoint, {
					method: "GET",
					headers: {
						Accept: "application/json",
					},
				});

				console.log(`   ${endpoint}: ${apiResponse.status}`);
				if (apiResponse.status === 200) {
					console.log("     ✅ Доступно без аутентификации (правильно)");
				} else {
					console.log(`     ⚠️  Статус: ${apiResponse.status}`);
				}
			} catch (error) {
				console.log(`   ${endpoint}: Ошибка - ${error.message}`);
			}
		}
	} catch (error) {
		console.log(`   Ошибка в тесте: ${error.message}`);
		console.log(error.stack);
	}

	console.log("\n=== Тест завершен ===");
}

testComprehensive();
