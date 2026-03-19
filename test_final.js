const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function test() {
	console.log("=== Финальный тест ===");
	console.log("1. Тестируем protected API без куки (должен вернуть 401)...");

	try {
		const response = await fetch("http://localhost:5173/api/v2/user/settings", {
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		});

		console.log(`   Статус: ${response.status} (ожидается 401)`);
		if (response.status === 401) {
			console.log("   ✅ ОК: правильно требует аутентификацию");
		} else {
			const text = await response.text();
			console.log(`   ❌ Проблема: вернул ${response.status}`);
			console.log(`   Ответ: ${text.substring(0, 100)}...`);
		}
	} catch (error) {
		console.log(`   Ошибка: ${error.message}`);
	}

	console.log("\n2. Регистрация нового пользователя...");

	const testEmail = `test${Date.now()}@example.com`;
	const testPassword = "password123";

	try {
		const registerResponse = await fetch("http://localhost:5173/register", {
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

		console.log(`   Статус регистрации: ${registerResponse.status}`);
		const registerData = await registerResponse.json();

		if (registerResponse.ok && registerData.success) {
			console.log("   ✅ Регистрация успешна");

			// Получаем куку
			const setCookieHeader = registerResponse.headers.get("set-cookie");
			if (setCookieHeader) {
				const sessionCookie = setCookieHeader.split(";")[0];
				console.log(`   Кука получена: ${sessionCookie.substring(0, 30)}...`);

				console.log("\n3. Тестируем protected API с кукой (должен вернуть 200)...");

				const settingsResponse = await fetch("http://localhost:5173/api/v2/user/settings", {
					method: "GET",
					headers: {
						Cookie: sessionCookie,
						Accept: "application/json",
					},
				});

				console.log(`   Статус: ${settingsResponse.status} (ожидается 200)`);
				if (settingsResponse.status === 200) {
					console.log("   ✅ ОК: аутентификация работает");

					// Проверяем, не установлена ли новая кука
					const newCookie = settingsResponse.headers.get("set-cookie");
					if (newCookie) {
						console.log(`   ⚠️  Внимание: установлена новая кука!`);
						console.log(`   Новая кука: ${newCookie.substring(0, 30)}...`);
					} else {
						console.log("   ✅ Новая кука не установлена (правильно)");
					}
				} else {
					const text = await settingsResponse.text();
					console.log(`   ❌ Ошибка: ${text}`);
				}
			} else {
				console.log("   ❌ Кука не установлена при регистрации");
			}
		} else {
			console.log(`   ❌ Ошибка регистрации: ${registerData.message}`);
		}
	} catch (error) {
		console.log(`   Ошибка: ${error.message}`);
	}

	console.log("\n=== Тест завершен ===");
}

test();
