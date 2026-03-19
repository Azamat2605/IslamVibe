const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function testSessionFlow() {
	console.log("=== Тестирование flow сессии после регистрации ===");

	const testEmail = `test${Date.now()}@example.com`;
	const testPassword = "password123";

	console.log("[1] Регистрация пользователя:", testEmail);

	let sessionCookie = null;
	let secretSessionId = null;

	try {
		// 1. Регистрация
		const registerResponse = await fetch("http://localhost:5174/register", {
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

		console.log("[2] Регистрация - статус:", registerResponse.status);
		const registerData = await registerResponse.json();
		console.log("[3] Регистрация - данные:", registerData.success ? "Успех" : "Ошибка");

		// Получаем куку из ответа
		const setCookieHeader = registerResponse.headers.get("set-cookie");
		console.log("[4] Кука установлена:", setCookieHeader ? "Да" : "Нет");

		if (setCookieHeader) {
			sessionCookie = setCookieHeader.split(";")[0];
			console.log("[5] Session cookie:", sessionCookie.substring(0, 50) + "...");

			// Извлекаем secretSessionId из куки
			secretSessionId = sessionCookie.split("=")[1];
			console.log("[6] SecretSessionId из куки:", secretSessionId.substring(0, 20) + "...");
		}

		if (!registerResponse.ok || !registerData.success) {
			console.error("Регистрация не удалась");
			return;
		}

		console.log("[7] Ожидание 100ms...");
		await new Promise((resolve) => setTimeout(resolve, 100));

		// 2. Запрос настроек (как делает UI после регистрации)
		console.log("[8] Запрос GET /api/v2/user/settings с кукой");
		const settingsResponse = await fetch("http://localhost:5174/api/v2/user/settings", {
			method: "GET",
			headers: {
				Cookie: sessionCookie,
			},
		});

		console.log("[9] Настройки - статус:", settingsResponse.status);

		if (settingsResponse.status === 200) {
			const settingsData = await settingsResponse.json();
			console.log("[10] Настройки получены успешно");
			console.log("[11] Active model:", settingsData.json.activeModel);

			// Проверяем, установлена ли новая кука
			const newSetCookie = settingsResponse.headers.get("set-cookie");
			if (newSetCookie) {
				console.log("[12] ВНИМАНИЕ: Новая кука установлена при запросе настроек!");
				console.log("[13] Новая кука:", newSetCookie.substring(0, 50) + "...");

				const newSecretSessionId = newSetCookie.split("=")[1].split(";")[0];
				console.log("[14] Новый SecretSessionId:", newSecretSessionId.substring(0, 20) + "...");

				if (newSecretSessionId !== secretSessionId) {
					console.log("[15] ОШИБКА: Создана НОВАЯ сессия! Это проблема!");
					console.log("    Старая:", secretSessionId.substring(0, 20) + "...");
					console.log("    Новая:", newSecretSessionId.substring(0, 20) + "...");
				} else {
					console.log("[15] ОК: Та же сессия используется");
				}
			} else {
				console.log("[12] ОК: Новая кука не установлена (как и должно быть)");
			}
		} else {
			const errorText = await settingsResponse.text();
			console.log("[10] Ошибка получения настроек:", errorText);
		}

		// 3. Проверяем MongoDB: сколько сессий для пользователя
		console.log("[16] Проверка MongoDB (через API)...");

		// Попробуем получить информацию о пользователе
		const userResponse = await fetch("http://localhost:5174/api/v2/user", {
			method: "GET",
			headers: {
				Cookie: sessionCookie,
			},
		});

		console.log("[17] User API - статус:", userResponse.status);
		if (userResponse.status === 200) {
			const userData = await userResponse.json();
			console.log("[18] User data:", userData);
		}
	} catch (error) {
		console.error("Ошибка в тесте:", error);
	}

	console.log("=== Тест завершен ===");
}

testSessionFlow();
