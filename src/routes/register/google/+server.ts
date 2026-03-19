import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url: _url }) => {
	// Заглушка для Google OAuth регистрации
	// В реальной реализации здесь был бы редирект на Google OAuth

	return json(
		{
			success: false,
			message: "Google OAuth регистрация не настроена. Используйте email регистрацию.",
			configured: false,
		},
		{ status: 501 }
	);
};
