const User = require('../models/User')
const Driver = require('../models/Driver')
const Order = require('../models/Order')
const states = require('../utils/states')
const { Markup } = require('telegraf')

const ADMIN_IDS = process.env.ADMIN_IDS
	? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()))
	: []

module.exports = {
	// Admin menyusini ko'rsatish
	showAdminMenu: async ctx => {
		const user = ctx.user

		// Adminligini tekshirish
		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
			return
		}

		const message = '👨‍💼 Admin menyusi\n\nQuyidagi variantlardan birini tanlang:'

		const keyboard = Markup.inlineKeyboard([
			[
				Markup.button.callback('👥 Foydalanuvchilar', 'admin_users'),
				Markup.button.callback('🚘 Haydovchilar', 'admin_drivers')
			],
			[
				Markup.button.callback('📋 Buyurtmalar', 'admin_orders'),
				Markup.button.callback('📊 Statistika', 'admin_stats')
			]
		])

		await ctx.reply(message, keyboard)
	},

	// Haydovchilarni boshqarish
	manageDrivers: async ctx => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
			return
		}

		const drivers = await Driver.find().sort({ createdAt: -1 }).limit(20)

		if (drivers.length === 0) {
			await ctx.reply('📭 Haydovchilar mavjud emas')
			return
		}

		let message = '🚘 Haydovchilar roʻyxati:\n\n'

		drivers.forEach((driver, index) => {
			message += `${index + 1}. ${driver.fullName}\n`
			message += `   📍 ${driver.fromRegion} → ${driver.toRegion}\n`
			message += `   🚗 ${driver.carModel}\n`
			message += `   📞 ${driver.phone}\n`
			message += `   💳 Toʻlov: ${
				driver.paidUntil ? new Date(driver.paidUntil).toLocaleDateString('uz-UZ') : 'Yoʻq'
			}\n`
			message += `   🔔 Status: ${driver.status === 'active' ? 'Faol ✅' : 'Nofaol ❌'}\n\n`
		})

		await ctx.reply(message)
	}
}
