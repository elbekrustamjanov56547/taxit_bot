const User = require('../models/User')
const Driver = require('../models/Driver')
const states = require('../utils/states')
const keyboards = require('../keyboards/main')

module.exports = {
	startHandler: async ctx => {
		try {
			const user = ctx.user

			// Agar language bo'sh bo'lsa yoki undefined bo'lsa
			if (!user.language || user.language.trim() === '') {
				// Yangi foydalanuvchi - til tanlash
				const message =
					'👋 Assalomu alaykum! Добро пожаловать!\n\n' +
					'Iltimos, tilni tanlang: Пожалуйста, выберите язык:'

				await ctx.reply(message, keyboards.languageKeyboard())
				user.state = states.START
				await user.save()
				return
			}

			// Agar user rolini allaqachon tanlagan bo'lsa
			if (user.role && user.role !== 'none') {
				let userRole = user.role

				const message = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'

				// Rolga qarab menyu ko'rsatish
				await ctx.reply(message, keyboards.mainMenuKeyboard(user.language, user.isAdmin, userRole))
				user.state = states.MAIN_MENU
				await user.save()
			} else {
				// Rol tanlash bosqichi (faqat bir marta)
				await showRoleSelection(ctx)
			}
		} catch (error) {
			console.error('Start error:', error)
		}
	},

	// Til tanlashni qayta ishlash
	handleLanguageSelection: async (ctx, callbackData) => {
		const user = ctx.user
		const lang = callbackData.replace('lang_', '') // 'uz' yoki 'ru'

		// User tilini yangilash
		user.language = lang
		await user.save()

		// Rol tanlash bosqichiga o'tish
		await showRoleSelection(ctx)
	},

	// Rol tanlashni qayta ishlash
	// handleRoleSelection: async (ctx, callbackData) => {
	// 	const user = ctx.user
	// 	const role = callbackData.replace('role_', '') // 'user' yoki 'driver'

	// 	// User rolini saqlash
	// 	user.role = role
	// 	await user.save()

	// 	// Rolga qarab menyu ko'rsatish
	// 	const message = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'
	// 	await ctx.reply(message, keyboards.mainMenuKeyboard(user.language, user.isAdmin, role))
	// 	user.state = states.MAIN_MENU
	// 	await user.save()
	// }

	// handlers/start.js faylida handleRoleSelection funksiyasi:
 handleRoleSelection: async (ctx, callbackData) => {
	try {
		const user = ctx.user
		const role = callbackData.replace('role_', '')
		
		console.log(`Role selection: ${role} for user: ${user.telegramId}`)
		
		// User ro'lini yangilash
		user.role = role
		await user.save()
		
		if (role === 'driver') {
			// Agar haydovchi rolini tanlasa, darhol ro'yxatdan o'tishni boshlaymiz
			const message = user.language === 'uz'
				? "🚘 Haydovchi sifatida ro'yxatdan o'tishni boshlaymiz..."
				: '🚘 Начинаем регистрацию как водитель...'
			
			await ctx.reply(message)
			
			// Driver modulini import qilamiz
			const driverHandler = require('./driver')
			
			// Darhol ro'yxatdan o'tishni boshlaymiz
			await driverHandler.startRegistration(ctx)
		} else if (role === 'user') {
			// Agar yo'lovchi rolini tanlasa, asosiy menyuni ko'rsatamiz
			const message = user.language === 'uz'
				? '🚖 Tabriklaymiz! Siz yo\'lovchi sifatida ro\'yxatdan o\'tdingiz.\n\nNima qilishni xohlaysiz?'
				: '🚖 Поздравляем! Вы зарегистрировались как пассажир.\n\nЧто вы хотите сделать?'
			
			await ctx.reply(message, keyboards.mainMenuKeyboard(user.language, false, 'user'))
			user.state = states.MAIN_MENU
			await user.save()
		}
	} catch (error) {
		console.error('Role selection error:', error)
	}
}
}

// Rol tanlashni ko'rsatish (faqat bir marta)
async function showRoleSelection(ctx) {
	const user = ctx.user

	const message =
		user.language === 'uz'
			? '🎯 Iltimos, rol tanlang:\n\n' +
			  "🚖 **Taksi kerak** - agar siz yo'lovchi bo'lsangiz\n" +
			  "🚘 **Taksi xizmati** - agar siz haydovchi bo'lsangiz\n\n" +
			  "*Eslatma:* Faqat bitta rol tanlashingiz mumkin. Keyinchalik o'zgartirib bo'lmaydi."
			: '🎯 Пожалуйста, выберите роль:\n\n' +
			  '🚖 **Нужно такси** - если вы пассажир\n' +
			  '🚘 **Такси сервис** - если вы водитель\n\n' +
			  '*Примечание:* Можно выбрать только одну роль. Позже изменить нельзя.'

	const keyboard = {
		inline_keyboard: [
			[
				{
					text: user.language === 'uz' ? '🚖 Taksi kerak' : '🚖 Нужно такси',
					callback_data: 'role_user'
				}
			],
			[
				{
					text: user.language === 'uz' ? '🚘 Taksi xizmati' : '🚘 Такси сервис',
					callback_data: 'role_driver'
				}
			]
		]
	}

	await ctx.reply(message, { reply_markup: keyboard })
}
