const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function testPublicAPIs() {
	console.log("=== Тестирование public API endpoints ===");

	const baseUrl = "http://localhost:5174";

	const publicEndpoints = [
		"/api/v2/models",
		"/api/v2/public-config",
		"/api/v2/feature-flags",
		"/healthcheck",
		"/register", // GET запрос должен работать
	];

	for (const endpoint of publicEndpoints) {
		try {
			console.log(`\nТестируем ${endpoint}...`);
			const response = await fetch(baseUrl + endpoint, {
				method: "GET",
				headers: {
					Accept: "application/json",
				},
			});

			console.log(`  Статус: ${response.status}`);

			if (response.status === 200) {
				if (endpoint.includes("json") || endpoint.includes("api")) {
					try {
						const data = await response.json();
						console.log(`  Успех: данные получены`);
						if (endpoint === "/api/v2/models") {
							console.log(`  Кол-во моделей: ${Array.isArray(data) ? data.length : "не массив"}`);
						}
					} catch (e) {
						const text = await response.text();
						console.log(`  Ответ (текст): ${text.substring(0, 100)}...`);
					}
				} else {
					const text = await response.text();
					console.log(`  Ответ: ${text.substring(0, 100)}...`);
				}
			} else {
				const text = await response.text();
				console.log(`  Ошибка: ${text.substring(0, 100)}...`);
			}
		} catch (error) {
			console.log(`  Исключение: ${error.message}`);
		}
	}

	console.log("\n=== Тестирование protected API (должен вернуть 401 без куки) ===");

	const protectedEndpoints = ["/api/v2/user/settings", "/api/v2/user", "/api/v2/conversations"];

	for (const endpoint of protectedEndpoints) {
		try {
			console.log(`\nТестируем ${endpoint} без куки...`);
			const response = await fetch(baseUrl + endpoint, {
				method: "GET",
				headers: {
					Accept: "application/json",
				},
			});

			console.log(`  Статус: ${response.status} (ожидается 401)`);

			if (response.status === 401) {
				console.log(`  ОК: правильно требует аутентификацию`);
			} else if (response.status === 200) {
				console.log(`  ВНИМАНИЕ: endpoint доступен без аутентификации!`);
			}
		} catch (error) {
			console.log(`  Исключение: ${error.message}`);
		}
	}

	console.log("\n=== Тест завершен ===");
}

testPublicAPIs();
