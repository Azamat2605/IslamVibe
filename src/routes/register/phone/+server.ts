import { json, type RequestHandler } from "@sveltejs/kit";
import { z } from "zod";

const phoneSchema = z.object({
	phone: z
		.string()
		.regex(
			/^\+[1-9]\d{1,14}$/,
			"Неверный формат номера телефона. Используйте международный формат, например: +79991234567"
		),
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const parsed = phoneSchema.safeParse(body);

		if (!parsed.success) {
			return json(
				{
					success: false,
					message: "Ошибка валидации",
					errors: parsed.error.errors,
				},
				{ status: 400 }
			);
		}

		const { phone } = parsed.data;

		// Заглушка для регистрации по телефону
		// В реальной реализации здесь была бы отправка SMS кода

		return json({
			success: true,
			message:
				"Код подтверждения отправлен (заглушка). В реальной реализации здесь был бы отправлен SMS код.",
			phone,
			code: "123456", // Заглушка для демонстрации
		});
	} catch (error) {
		console.error("Phone registration error:", error);
		return json(
			{
				success: false,
				message: "Внутренняя ошибка сервера",
			},
			{ status: 500 }
		);
	}
};
