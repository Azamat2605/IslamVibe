import { z } from "zod";

// Схема для входа
export const loginSchema = z.object({
	email: z.string().email("Неверный формат email").min(1, "Email обязателен"),
	password: z
		.string()
		.min(6, "Пароль должен содержать минимум 6 символов")
		.min(1, "Пароль обязателен"),
});

// Схема для регистрации
export const registerSchema = z
	.object({
		email: z.string().email("Неверный формат email").min(1, "Email обязателен"),
		password: z
			.string()
			.min(6, "Пароль должен содержать минимум 6 символов")
			.min(1, "Пароль обязателен"),
		confirmPassword: z.string().min(1, "Подтверждение пароля обязательно"),
		username: z.string().optional(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Пароли не совпадают",
		path: ["confirmPassword"],
	});

// Типы для TypeScript
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
