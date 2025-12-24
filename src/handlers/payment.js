const Driver = require('../models/Driver')
const User = require('../models/User')
const { Markup } = require('telegraf')

module.exports = {
	// To'lov menyusi
	showPaymentMenu: async ctx => {
		const user = ctx.user

		const driver = await Driver.findOne({ telegramId: user.telegramId })

		if (!driver) {
			await ctx.reply('❌ Siz haydovchi emassiz!')
			return
		}

		const message =
			user.language === 'uz'
				? `💳 To'lov menyusi\n\n` +
				  `💰 Oylik to'lov: 100,000 so'm\n` +
				  `⏰ Davomiylik: 30 kun\n` +
				  `🔔 Sizning status: ${driver.status === 'active' ? 'Faol' : 'Nofaol'}\n` +
				  `📅 Oxirgi to'lov: ${
						driver.paidUntil ? new Date(driver.paidUntil).toLocaleDateString('uz-UZ') : "Yo'q"
				  }\n\n` +
				  `To'lov qilish uchun tugmani bosing:`
				: `💳 Меню оплаты\n\n` +
				  `💰 Ежемесячный платеж: 100,000 сум\n` +
				  `⏰ Длительность: 30 дней\n` +
				  `🔔 Ваш статус: ${driver.status === 'active' ? 'Активен' : 'Неактивен'}\n` +
				  `📅 Последняя оплата: ${
						driver.paidUntil ? new Date(driver.paidUntil).toLocaleDateString('ru-RU') : 'Нет'
				  }\n\n` +
				  `Нажмите кнопку для оплаты:`

		const keyboard = Markup.inlineKeyboard([
			[
				Markup.button.callback(
					user.language === 'uz' ? "💳 100,000 so'm to'lash" : '💳 Оплатить 100,000 сум',
					'driver_payment'
				)
			],
			[
				Markup.button.callback(
					user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
					'main_menu'
				)
			]
		])

		await ctx.reply(message, keyboard)
	}
}
