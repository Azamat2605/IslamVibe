import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url: _url }) => {
	// Заглушка для Telegram OAuth регистрации
	// В реальной реализации здесь был бы редирект на Telegram OAuth

	return json(
		{
			success: false,
			message: "Telegram OAuth регистрация не настроена. Используйте email регистрацию.",
			configured: false,
		},
		{ status: 501 }
	);
};
