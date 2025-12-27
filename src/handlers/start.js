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
	handleRoleSelection: async (ctx, callbackData) => {
		const user = ctx.user
		const role = callbackData.replace('role_', '') // 'user' yoki 'driver'

		// User rolini saqlash
		user.role = role
		await user.save()

		// Rolga qarab menyu ko'rsatish
		const message = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'
		await ctx.reply(message, keyboards.mainMenuKeyboard(user.language, user.isAdmin, role))
		user.state = states.MAIN_MENU
		await user.save()
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
