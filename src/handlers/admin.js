// controllers/admin.js
const User = require('../models/User')
const Driver = require('../models/Driver')
const Order = require('../models/Order')
const { Markup } = require('telegraf')

const ADMIN_IDS = process.env.ADMIN_IDS
	? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()))
	: []

module.exports = {
	// Admin panelini ko'rsatish
	showAdminMenu: async ctx => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply(user.language === 'uz' ? '❌ Siz admin emassiz!' : '❌ Вы не администратор!')
			return
		}

		const message =
			user.language === 'uz'
				? "👨‍💼 Admin paneli\n\nQuyidagi bo'limlardan birini tanlang:"
				: '👨‍💼 Админ панель\n\nВыберите один из разделов:'

		const keyboard = Markup.inlineKeyboard([
			[
				Markup.button.callback('👥 Foydalanuvchilar', 'admin_users'),
				Markup.button.callback('🚘 Haydovchilar', 'admin_drivers')
			],
			[
				Markup.button.callback('📋 Buyurtmalar', 'admin_orders'),
				Markup.button.callback('📊 Statistika', 'admin_stats')
			],
			[
				Markup.button.callback(
					user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
					'main_menu'
				)
			]
		])

		await ctx.reply(message, keyboard)
	},

	// Haydovchilar ro'yxatini ko'rsatish
	showDrivers: async (ctx, page = 0) => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply(user.language === 'uz' ? '❌ Siz admin emassiz!' : '❌ Вы не администратор!')
			return
		}

		const limit = 10
		const skip = page * limit

		const drivers = await Driver.find().sort({ createdAt: -1 }).skip(skip).limit(limit)

		const totalDrivers = await Driver.countDocuments()
		const activeDrivers = await Driver.countDocuments({ status: 'active' })
		const inactiveDrivers = totalDrivers - activeDrivers

		if (drivers.length === 0) {
			await ctx.reply(user.language === 'uz' ? '📭 Haydovchilar mavjud emas' : '📭 Водителей нет')
			return
		}

		// Sarlavha
		let message =
			user.language === 'uz'
				? `🚘 Haydovchilar (${totalDrivers} ta)\n`
				: `🚘 Водители (${totalDrivers} чел)\n`

		message +=
			user.language === 'uz'
				? `✅ Faol: ${activeDrivers} | ❌ Nofaol: ${inactiveDrivers}\n\n`
				: `✅ Активны: ${activeDrivers} | ❌ Неактивны: ${inactiveDrivers}\n\n`

		// ✅ TO'G'RILANGAN: Haydovchi ma'lumotlarini ko'rsatish
		// drivers.forEach((driver, index) => {
		// 	const globalIndex = skip + index + 1
		// 	message += `${globalIndex}. ${driver.fullName}\n`
		// 	message += `   📍 ${driver.fromRegion} → ${driver.toRegion}\n`
		// 	message += `   🚗 ${driver.carModel} | 📱 ${driver.phone}\n`
		// 	message += `   ${driver.status === 'active' ? '✅ Faol' : '❌ Nofaol'}\n`
		// 	message += `   💰 Balans: ${driver.balance || 0} so'm\n`
		// 	message += `   ⭐ Reyting: ${driver.rating || 0}/5.0\n`
		// 	message += `   📦 Buyurtmalar: ${driver.totalOrders || 0}\n`
		// 	message += `   💳 To'lov: ${
		// 		driver.paidUntil ? new Date(driver.paidUntil).toLocaleDateString('uz-UZ') : "Yo'q"
		// 	}\n`
		// 	message += `   ─────────────────────\n`
		// })

		// Pagination tugmalari
		const keyboardButtons = []

		// Har bir haydovchi uchun alohida tugma
		drivers.forEach((driver, index) => {
			keyboardButtons.push([
				Markup.button.callback(
					`${skip + index + 1}. ${driver.fullName} || ${driver.carModel}`,
					`admin_driver_${driver.telegramId}`
				)
			])
		})

		// Pagination va filter tugmalari
		const paginationRow = []

		if (page > 0) {
			paginationRow.push(Markup.button.callback('⬅️ Oldingi', `admin_drivers_page_${page - 1}`))
		}

		if (skip + limit < totalDrivers) {
			paginationRow.push(Markup.button.callback('Keyingi ➡️', `admin_drivers_page_${page + 1}`))
		}

		if (paginationRow.length > 0) {
			keyboardButtons.push(paginationRow)
		}

		// Filter tugmalari
		keyboardButtons.push([
			Markup.button.callback(
				user.language === 'uz' ? '✅ Faollar' : '✅ Активные',
				'admin_drivers_active'
			),
			Markup.button.callback(
				user.language === 'uz' ? '❌ Nofaollar' : '❌ Неактивные',
				'admin_drivers_inactive'
			)
		])

		// Orqaga tugmasi
		keyboardButtons.push([
			Markup.button.callback(user.language === 'uz' ? '⬅️ Orqaga' : '⬅️ Назад', 'admin_menu')
		])

		const keyboard = Markup.inlineKeyboard(keyboardButtons)

		await ctx.reply(message, keyboard)
	},

	// ✅ TO'G'RILANGAN: Alohida haydovchi ma'lumotlari
	showDriverDetails: async (ctx, driverId) => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply(user.language === 'uz' ? '❌ Siz admin emassiz!' : '❌ Вы не администратор!')
			return
		}

		// ✅ TO'G'RI: driverId parametrdan olinadi (callbackData emas)
		const driver = await Driver.findOne({ telegramId: driverId })

		if (!driver) {
			await ctx.reply(user.language === 'uz' ? '❌ Haydovchi topilmadi' : '❌ Водитель не найден')
			return
		}

		const driverOrders = await Order.countDocuments({ driverId: driver.telegramId })

		const message =
			user.language === 'uz'
				? `🚘 Haydovchi ma'lumotlari\n\n` +
				  `👤 Ism: ${driver.fullName}\n` +
				  `📱 Telefon: ${driver.phone}\n` +
				  `📍 Yo'nalish: ${driver.fromRegion} → ${driver.toRegion}\n` +
				  `🚗 Mashina: ${driver.carModel}\n` +
				  `📅 Jo'natish vaqti: ${driver.departureTime}\n` +
				  `💳 Balans: ${driver.balance || 0} so'm\n` +
				  `📦 Buyurtmalar: ${driverOrders} ta\n` +
				  `🔔 Holat: ${driver.status === 'active' ? '✅ Faol' : '❌ Nofaol'}\n` +
				  `💰 To'lov muddati: ${
						driver.paidUntil ? new Date(driver.paidUntil).toLocaleDateString('uz-UZ') : "Yo'q"
				  }\n` +
				  `📅 Ro'yxatdan o'tgan: ${new Date(driver.createdAt).toLocaleDateString('uz-UZ')}`
				: `🚘 Информация о водителе\n\n` +
				  `👤 Имя: ${driver.fullName}\n` +
				  `📱 Телефон: ${driver.phone}\n` +
				  `📍 Направление: ${driver.fromRegion} → ${driver.toRegion}\n` +
				  `🚗 Машина: ${driver.carModel}\n` +
				  `📅 Время отправления: ${driver.departureTime}\n` +
				  `💳 Баланс: ${driver.balance || 0} сум\n` +
				  `📦 Заказы: ${driverOrders} шт\n` +
				  `🔔 Статус: ${driver.status === 'active' ? '✅ Активен' : '❌ Неактивен'}\n` +
				  `💰 Срок оплаты: ${
						driver.paidUntil ? new Date(driver.paidUntil).toLocaleDateString('ru-RU') : 'Нет'
				  }\n` +
				  `📅 Зарегистрирован: ${new Date(driver.createdAt).toLocaleDateString('ru-RU')}`

		const keyboard = Markup.inlineKeyboard([
			[
				Markup.button.callback(
					driver.status === 'active' ? '❌ Nofaol qilish' : '✅ Faol qilish',
					`admin_toggle_${driver.telegramId}`
				)
			],
			[
				Markup.button.callback("💰 To'lov qo'shish", `admin_payment_${driver.telegramId}`),
				Markup.button.callback('✉️ Xabar yuborish', `admin_message_${driver.telegramId}`)
			],
			[
				Markup.button.callback(user.language === 'uz' ? '⬅️ Orqaga' : '⬅️ Назад', 'admin_drivers'),
				Markup.button.callback(user.language === 'uz' ? '🏠 Menyu' : '🏠 Меню', 'admin_menu')
			]
		])

		await ctx.reply(message, keyboard)
	},

	// Haydovchi holatini o'zgartirish (faqat active/inactive)
	toggleDriverStatus: async (ctx, driverId) => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply(user.language === 'uz' ? '❌ Siz admin emassiz!' : '❌ Вы не администратор!')
			return
		}

		const driver = await Driver.findOne({ telegramId: driverId })

		if (!driver) {
			await ctx.reply(user.language === 'uz' ? '❌ Haydovchi topilmadi' : '❌ Водитель не найден')
			return
		}

		// Faqat statusni o'zgartirish
		driver.status = driver.status === 'active' ? 'inactive' : 'active'
		await driver.save()

		const statusText =
			user.language === 'uz'
				? driver.status === 'active'
					? 'Faol'
					: 'Nofaol'
				: driver.status === 'active'
				? 'Активен'
				: 'Неактивен'

		const message =
			user.language === 'uz'
				? `✅ Haydovchi holati o'zgartirildi!\n\n` +
				  `👤 ${driver.fullName}\n` +
				  `🔄 Yangi holat: ${statusText}`
				: `✅ Статус водителя изменен!\n\n` +
				  `👤 ${driver.fullName}\n` +
				  `🔄 Новый статус: ${statusText}`

		await ctx.reply(message)

		// Haydovchiga xabar yuborish
		try {
			await ctx.telegram.sendMessage(
				driver.telegramId,
				user.language === 'uz'
					? `🔔 Admin tomonidan sizning profilingiz ${statusText.toLowerCase()} holatiga o'zgartirildi.`
					: `🔔 Администратором ваш профиль был переведен в статус "${statusText.toLowerCase()}".`
			)
		} catch (error) {
			console.error('Haydovchiga xabar yuborishda xatolik:', error)
		}

		// Qayta haydovchi ma'lumotlarini ko'rsatish
		await module.exports.showDriverDetails(ctx, driverId)
	},

	// Faol haydovchilar
	showActiveDrivers: async ctx => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply(user.language === 'uz' ? '❌ Siz admin emassiz!' : '❌ Вы не администратор!')
			return
		}

		const drivers = await Driver.find({ status: 'active' }).sort({ createdAt: -1 }).limit(10)

		if (drivers.length === 0) {
			await ctx.reply(
				user.language === 'uz' ? "✅ Faol haydovchilar yo'q" : '✅ Нет активных водителей'
			)
			return
		}

		let message =
			user.language === 'uz'
				? `✅ Faol haydovchilar (${drivers.length} ta)\n\n`
				: `✅ Активные водители (${drivers.length} чел)\n\n`

		// Har bir haydovchi uchun alohida tugma yaratish
		const keyboardButtons = []

		drivers.forEach((driver, index) => {
			// Xabar matni
			message += `${index + 1}. ${driver.fullName}\n`
			message += `   📍 ${driver.fromRegion} → ${driver.toRegion}\n`
			message += `   🚗 ${driver.carModel}\n`
			message += `   📱 ${driver.phone}\n`
			message += `   ─────────────────────\n`

			// Har bir haydovchi uchun alohida tugma
			keyboardButtons.push([
				Markup.button.callback(
					`${index + 1}. ${driver.fullName}`,
					`admin_driver_${driver.telegramId}`
				)
			])
		})

		// Orqaga tugmasi
		keyboardButtons.push([
			Markup.button.callback(user.language === 'uz' ? '⬅️ Orqaga' : '⬅️ Назад', 'admin_drivers')
		])

		const keyboard = Markup.inlineKeyboard(keyboardButtons)

		await ctx.reply(message, keyboard)
	},

	// Nofaol haydovchilar
	showInactiveDrivers: async ctx => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply(user.language === 'uz' ? '❌ Siz admin emassiz!' : '❌ Вы не администратор!')
			return
		}

		const drivers = await Driver.find({ status: 'inactive' }).sort({ createdAt: -1 }).limit(10)

		if (drivers.length === 0) {
			await ctx.reply(
				user.language === 'uz' ? "❌ Nofaol haydovchilar yo'q" : '❌ Нет неактивных водителей'
			)
			return
		}

		let message =
			user.language === 'uz'
				? `❌ Nofaol haydovchilar (${drivers.length} ta)\n\n`
				: `❌ Неактивные водители (${drivers.length} чел)\n\n`

		// Har bir haydovchi uchun alohida tugma yaratish
		const keyboardButtons = []

		drivers.forEach((driver, index) => {
			// Xabar matni
			message += `${index + 1}. ${driver.fullName}\n`
			message += `   📍 ${driver.fromRegion} → ${driver.toRegion}\n`
			message += `   🚗 ${driver.carModel}\n`
			message += `   📱 ${driver.phone}\n`
			message += `   ─────────────────────\n`

			// Har bir haydovchi uchun alohida tugma
			keyboardButtons.push([
				Markup.button.callback(
					`${index + 1}. ${driver.fullName}`,
					`admin_driver_${driver.telegramId}`
				)
			])
		})

		// Orqaga tugmasi
		keyboardButtons.push([
			Markup.button.callback(user.language === 'uz' ? '⬅️ Orqaga' : '⬅️ Назад', 'admin_drivers')
		])

		const keyboard = Markup.inlineKeyboard(keyboardButtons)

		await ctx.reply(message, keyboard)
	},

	// To'lov qo'shish bosqichi
	addPaymentStep: async (ctx, driverId) => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			return
		}

		// Sessiyaga ma'lumotlarni saqlash
		if (!ctx.session) {
			ctx.session = {}
		}
		ctx.session.adminAction = 'add_payment'
		ctx.session.adminDriverId = driverId

		const message =
			user.language === 'uz'
				? `💰 Haydovchiga to'lov qo'shish\n\n` +
				  `To'lov miqdorini kiriting (so'm):\n` +
				  `Masalan: 100000`
				: `💰 Добавить платеж водителю\n\n` + `Введите сумму платежа (сум):\n` + `Например: 100000`

		await ctx.reply(message)
	},

	// Xabar yuborish bosqichi
	sendMessageStep: async (ctx, driverId) => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			return
		}

		// Sessiyaga ma'lumotlarni saqlash
		if (!ctx.session) {
			ctx.session = {}
		}
		ctx.session.adminAction = 'send_message'
		ctx.session.adminDriverId = driverId

		const message =
			user.language === 'uz'
				? `✉️ Haydovchiga xabar yuborish\n\n` + `Xabar matnini kiriting:`
				: `✉️ Отправить сообщение водителю\n\n` + `Введите текст сообщения:`

		await ctx.reply(message)
	},

	// To'lovni qo'shish
	processPayment: async (ctx, amount) => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			return
		}

		const driverId = ctx.session?.adminDriverId
		if (!driverId) {
			await ctx.reply(
				user.language === 'uz' ? '❌ Xatolik: Haydovchi topilmadi' : '❌ Ошибка: Водитель не найден'
			)
			return
		}

		const driver = await Driver.findOne({ telegramId: driverId })
		if (!driver) {
			await ctx.reply(user.language === 'uz' ? '❌ Haydovchi topilmadi' : '❌ Водитель не найден')
			return
		}

		// To'lovni qo'shish
		driver.balance = (driver.balance || 0) + parseInt(amount)
		await driver.save()

		const message =
			user.language === 'uz'
				? `✅ To'lov qo'shildi!\n\n` +
				  `👤 Haydovchi: ${driver.fullName}\n` +
				  `💰 Miqdor: ${parseInt(amount).toLocaleString()} so'm\n` +
				  `💳 Yangi balans: ${driver.balance.toLocaleString()} so'm`
				: `✅ Платеж добавлен!\n\n` +
				  `👤 Водитель: ${driver.fullName}\n` +
				  `💰 Сумма: ${parseInt(amount).toLocaleString()} сум\n` +
				  `💳 Новый баланс: ${driver.balance.toLocaleString()} сум`

		await ctx.reply(message)

		// Sessiyani tozalash
		if (ctx.session) {
			delete ctx.session.adminAction
			delete ctx.session.adminDriverId
		}
	},

	// Xabarni yuborish
	processMessage: async (ctx, messageText) => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			return
		}

		const driverId = ctx.session?.adminDriverId
		if (!driverId) {
			await ctx.reply(
				user.language === 'uz' ? '❌ Xatolik: Haydovchi topilmadi' : '❌ Ошибка: Водитель не найден'
			)
			return
		}

		try {
			// Haydovchiga xabar yuborish
			await ctx.telegram.sendMessage(driverId, `📨 Admin xabari:\n\n${messageText}`)

			const successMessage =
				user.language === 'uz'
					? `✅ Xabar haydovchiga yuborildi!`
					: `✅ Сообщение отправлено водителю!`

			await ctx.reply(successMessage)
		} catch (error) {
			const errorMessage =
				user.language === 'uz'
					? `❌ Xabar yuborishda xatolik: ${error.message}`
					: `❌ Ошибка отправки сообщения: ${error.message}`

			await ctx.reply(errorMessage)
		}

		// Sessiyani tozalash
		if (ctx.session) {
			delete ctx.session.adminAction
			delete ctx.session.adminDriverId
		}
	}
}
