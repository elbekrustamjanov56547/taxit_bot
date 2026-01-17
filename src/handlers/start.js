const User = require('../models/User')
const Driver = require('../models/Driver')
const states = require('../utils/states')
const keyboards = require('../keyboards/main')

module.exports = {
	startHandler: async ctx => {
		try {
			const user = ctx.user

			console.log('🚀 /start command, user role:', user.role)
			console.log('📊 User state:', user.state)

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
				console.log(`👤 Current role: ${user.role}`)

				// ROLGA QARAB TO'G'RI MENYU KO'RSATISH
				if (user.role === 'driver') {
					// DRIVER rolida - asosiy menyu (driver versiyasi)
					console.log('🚗 Showing main menu for DRIVER role')

					const message = user.language === 'uz' ? `🏠 Asosiy menyu\n\n` : `🏠 Главное меню\n\n`

					const keyboard = {
						inline_keyboard: [
							[
								{
									text: user.language === 'uz' ? '🚘 Haydovchi menyusi' : '🚘 Меню водителя',
									callback_data: 'driver_info'
								}
							],
							[
								{
									text: user.language === 'uz' ? "🔄 Xizmatni o'zgartirish" : '🔄 Изменить услугу',
									callback_data: 'switch_to_user'
								}
							]
						]
					}

					await ctx.reply(message, { reply_markup: keyboard })
					user.state = states.MAIN_MENU
					await user.save()
				} else if (user.role === 'user') {
					// USER rolida - asosiy menyu (user versiyasi)
					console.log('🚖 Showing main menu for USER role')

					const message =
						user.language === 'uz'
							? `🏠 Asosiy menyu\n\n` +
							  `Siz yo'lovchi sifatida ro'yxatdan o'tgansiz. Quyidagilardan birini tanlang:`
							: `🏠 Главное меню\n\n` +
							  `Вы зарегистрированы как пассажир. Выберите одно из следующих:`

					const keyboard = {
						inline_keyboard: [
							[
								{
									text: user.language === 'uz' ? '🚖 Taksiga buyurtma berish' : '🚖 Заказать такси',
									callback_data: 'need_taxi'
								}
							],
							[
								{
									text: user.language === 'uz' ? '📋 Mening buyurtmalarim' : '📋 Мои заказы',
									callback_data: 'my_orders'
								}
							],
							[
								{
									text: user.language === 'uz' ? "🔄 Xizmatni o'zgartirish" : '🔄 Изменить услугу',
									callback_data: 'switch_to_driver'
								}
							]
						]
					}

					await ctx.reply(message, { reply_markup: keyboard })
					user.state = states.MAIN_MENU
					await user.save()
				}
			} else {
				// ROL TANLASH BOSQICHI (yangilar uchun)
				console.log('🎯 Showing role selection for new user')
				await showRoleSelection(ctx)
			}
		} catch (error) {
			console.error('Start error:', error)
			console.error('Error stack:', error.stack)
		}
	},

	// Til tanlashni qayta ishlash
	handleLanguageSelection: async (ctx, callbackData) => {
		const user = ctx.user
		const lang = callbackData.replace('lang_', '')

		user.language = lang
		await user.save()

		// Rol tanlash bosqichiga o'tish
		await showRoleSelection(ctx)
	},

	// Rol tanlashni qayta ishlash
	handleRoleSelection: async (ctx, callbackData) => {
		try {
			const user = ctx.user
			const role = callbackData.replace('role_', '')

			console.log(`🎯 Role selection: ${role} for user: ${user.telegramId}`)

			// User ro'lini yangilash
			user.role = role
			await user.save()

			if (role === 'driver') {
				// Agar haydovchi rolini tanlasa, darhol ro'yxatdan o'tishni boshlaymiz
				const message =
					user.language === 'uz'
						? "🚘 Haydovchi sifatida ro'yxatdan o'tishni boshlaymiz..."
						: '🚘 Начинаем регистрацию как водитель...'

				await ctx.reply(message)

				// Driver modulini import qilamiz
				const driverHandler = require('./driver')

				// Darhol ro'yxatdan o'tishni boshlaymiz
				await driverHandler.startRegistration(ctx)
			} else if (role === 'user') {
				// Agar yo'lovchi rolini tanlasa, asosiy menyuni ko'rsatamiz
				const message =
					user.language === 'uz'
						? `🏠 Asosiy menyu\n\n` +
						  `Siz yo'lovchi sifatida ro'yxatdan o'tgansiz. Quyidagilardan birini tanlang:`
						: `🏠 Главное меню\n\n` +
						  `Вы зарегистрированы как пассажир. Выберите одно из следующих:`

				const keyboard = {
					inline_keyboard: [
						[
							{
								text: user.language === 'uz' ? '🚖 Taksiga buyurtma berish' : '🚖 Заказать такси',
								callback_data: 'need_taxi'
							}
						],
						[
							{
								text: user.language === 'uz' ? '📋 Mening buyurtmalarim' : '📋 Мои заказы',
								callback_data: 'my_orders'
							}
						],
						[
							{
								text: user.language === 'uz' ? "🔄 Xizmatni o'zgartirish" : '🔄 Изменить услугу',
								callback_data: 'switch_to_driver'
							}
						]
					]
				}

				await ctx.reply(message, { reply_markup: keyboard })
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
