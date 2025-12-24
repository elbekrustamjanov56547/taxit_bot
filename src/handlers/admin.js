const User = require('../models/User')
const Driver = require('../models/Driver')
const Order = require('../models/Order')
const { Markup } = require('telegraf')

const ADMIN_IDS = process.env.ADMIN_IDS
	? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()))
	: []

// Helper functions
const formatUserInfo = (user, lang = 'uz') => {
	return lang === 'uz'
		? `👤 ${user.firstName} ${user.lastName || ''}\n` +
				`📱 @${user.username || "yo'q"}\n` +
				`🆔 ${user.telegramId}\n` +
				`🌐 ${user.language === 'uz' ? "O'zbek" : 'Rus'}\n` +
				`🎭 ${user.role === 'driver' ? 'Haydovchi' : "Yo'lovchi"}\n` +
				`📅 ${new Date(user.createdAt).toLocaleDateString('uz-UZ')}\n` +
				`🔔 Faollik: ${new Date(user.lastActivity).toLocaleDateString('uz-UZ')}`
		: `👤 ${user.firstName} ${user.lastName || ''}\n` +
				`📱 @${user.username || 'нет'}\n` +
				`🆔 ${user.telegramId}\n` +
				`🌐 ${user.language === 'uz' ? 'Узбекский' : 'Русский'}\n` +
				`🎭 ${user.role === 'driver' ? 'Водитель' : 'Пассажир'}\n` +
				`📅 ${new Date(user.createdAt).toLocaleDateString('ru-RU')}\n` +
				`🔔 Активность: ${new Date(user.lastActivity).toLocaleDateString('ru-RU')}`
}

const formatDriverInfo = (driver, lang = 'uz') => {
	const serviceNames = {
		road: lang === 'uz' ? "Yo'l-yo'lakay" : 'Попутка',
		route: lang === 'uz' ? "Yo'nalish" : 'Направление',
		parcel: lang === 'uz' ? 'Pochta' : 'Посылка'
	}

	const services = driver.serviceType.map(type => serviceNames[type]).join(', ') || "Yo'q"

	return lang === 'uz'
		? `👤 ${driver.fullName}\n` +
				`📱 ${driver.phone}\n` +
				`📍 ${driver.fromRegion} → ${driver.toRegion}\n` +
				`🚗 ${driver.carModel}\n` +
				`🎯 ${services}\n` +
				`⏰ ${driver.departureTime}\n` +
				`💰 Balans: ${driver.balance} so'm\n` +
				`⭐ Reyting: ${driver.rating}/5.0\n` +
				`📦 Buyurtmalar: ${driver.totalOrders}\n` +
				`🔔 Status: ${driver.status === 'active' ? '✅ Faol' : '❌ Nofaol'}\n` +
				`💳 To'lov: ${
					driver.paidUntil ? new Date(driver.paidUntil).toLocaleDateString('uz-UZ') : "Yo'q"
				}\n` +
				`📅 Ro'yxatdan: ${new Date(driver.createdAt).toLocaleDateString('uz-UZ')}`
		: `👤 ${driver.fullName}\n` +
				`📱 ${driver.phone}\n` +
				`📍 ${driver.fromRegion} → ${driver.toRegion}\n` +
				`🚗 ${driver.carModel}\n` +
				`🎯 ${services}\n` +
				`⏰ ${driver.departureTime}\n` +
				`💰 Баланс: ${driver.balance} сум\n` +
				`⭐ Рейтинг: ${driver.rating}/5.0\n` +
				`📦 Заказы: ${driver.totalOrders}\n` +
				`🔔 Статус: ${driver.status === 'active' ? '✅ Активен' : '❌ Неактивен'}\n` +
				`💳 Оплата: ${
					driver.paidUntil ? new Date(driver.paidUntil).toLocaleDateString('ru-RU') : 'Нет'
				}\n` +
				`📅 Регистрация: ${new Date(driver.createdAt).toLocaleDateString('ru-RU')}`
}

module.exports = {
	// Admin panelini ko'rsatish
	showAdminMenu: async ctx => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
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
				Markup.button.callback('📢 Xabar yuborish', 'admin_broadcast'),
				Markup.button.callback('⚙️ Sozlamalar', 'admin_settings')
			],
			[Markup.button.callback('🏠 Asosiy menyu', 'main_menu')]
		])

		await ctx.reply(message, keyboard)
	},

	// Foydalanuvchilar ro'yxati
	showUsers: async ctx => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
			return
		}

		const users = await User.find().sort({ createdAt: -1 }).limit(20)
		const totalUsers = await User.countDocuments()

		let message =
			user.language === 'uz'
				? `👥 Foydalanuvchilar (Jami: ${totalUsers})\n\n`
				: `👥 Пользователи (Всего: ${totalUsers})\n\n`

		users.forEach((u, index) => {
			message += `${index + 1}. ${u.firstName} ${u.lastName || ''}\n`
			message += `   📱 @${u.username || "yo'q"} | 🆔 ${u.telegramId}\n`
			message += `   🎭 ${u.role === 'driver' ? 'Haydovchi' : "Yo'lovchi"} | 🌐 ${u.language}\n`
			message += `   📅 ${new Date(u.createdAt).toLocaleDateString('uz-UZ')}\n\n`
		})

		const keyboard = Markup.inlineKeyboard([
			[
				Markup.button.callback('⬅️ Orqaga', 'admin_menu'),
				Markup.button.callback("Foydalanuvchini ko'rish ➡️", 'admin_user_view_0')
			]
		])

		await ctx.reply(message, keyboard)
	},

	// Foydalanuvchini ko'rish (paginated)
	viewUser: async (ctx, callbackData) => {
		const user = ctx.user
		const page = parseInt(callbackData.split('_')[3]) || 0

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
			return
		}

		const users = await User.find()
			.sort({ createdAt: -1 })
			.skip(page * 5)
			.limit(5)

		if (users.length === 0) {
			await ctx.reply(
				user.language === 'uz' ? '❌ Foydalanuvchilar mavjud emas' : '❌ Пользователей нет'
			)
			return
		}

		const currentUser = users[0]
		const message = formatUserInfo(currentUser, user.language)

		const keyboard = {
			inline_keyboard: [
				[
					Markup.button.callback(
						user.language === 'uz' ? '❌ Bloklash' : '❌ Заблокировать',
						`admin_user_ban_${currentUser.telegramId}`
					),
					Markup.button.callback(
						user.language === 'uz' ? "👁‍🗨 Ko'rish" : '👁‍🗨 Просмотр',
						`admin_user_details_${currentUser.telegramId}`
					)
				],
				[
					Markup.button.callback(
						user.language === 'uz' ? '✏️ Tahrirlash' : '✏️ Редактировать',
						`admin_user_edit_${currentUser.telegramId}`
					),
					Markup.button.callback(
						user.language === 'uz' ? '📝 Xabar' : '📝 Сообщение',
						`admin_user_msg_${currentUser.telegramId}`
					)
				],
				[
					Markup.button.callback(
						'⬅️',
						page > 0 ? `admin_user_view_${page - 1}` : 'admin_user_view_0'
					),
					Markup.button.callback(`${page + 1}`, `admin_user_view_${page}`),
					Markup.button.callback('➡️', `admin_user_view_${page + 1}`)
				],
				[
					Markup.button.callback(
						user.language === 'uz' ? "📋 Ro'yxat" : '📋 Список',
						'admin_users'
					),
					Markup.button.callback(user.language === 'uz' ? '🏠 Menyu' : '🏠 Меню', 'admin_menu')
				]
			]
		}

		await ctx.reply(message, keyboard)
	},

	// Haydovchilar ro'yxati
	showDrivers: async ctx => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
			return
		}

		const drivers = await Driver.find().sort({ createdAt: -1 }).limit(20)
		const totalDrivers = await Driver.countDocuments()
		const activeDrivers = await Driver.countDocuments({ status: 'active' })

		let message = user.language === 'uz' ? `🚘 Haydovchilar\n\n` : `🚘 Водители\n\n`

		message +=
			user.language === 'uz'
				? `📊 Umumiy: ${totalDrivers}\n✅ Faol: ${activeDrivers}\n❌ Nofaol: ${
						totalDrivers - activeDrivers
				  }\n\n`
				: `📊 Всего: ${totalDrivers}\n✅ Активны: ${activeDrivers}\n❌ Неактивны: ${
						totalDrivers - activeDrivers
				  }\n\n`

		drivers.forEach((driver, index) => {
			message += `${index + 1}. ${driver.fullName}\n`
			message += `   📍 ${driver.fromRegion} → ${driver.toRegion}\n`
			message += `   🚗 ${driver.carModel} | 📱 ${driver.phone}\n`
			message += `   💰 ${driver.balance} so'm | 🔔 ${driver.status === 'active' ? '✅' : '❌'}\n\n`
		})

		const keyboard = Markup.inlineKeyboard([
			[
				Markup.button.callback('⬅️ Orqaga', 'admin_menu'),
				Markup.button.callback("Haydovchini ko'rish ➡️", 'admin_driver_view_0')
			],
			[
				Markup.button.callback('✅ Faollar', 'admin_drivers_active'),
				Markup.button.callback('❌ Nofaollar', 'admin_drivers_inactive')
			],
			[
				Markup.button.callback('💰 Balans', 'admin_drivers_balance'),
				Markup.button.callback('📊 Reyting', 'admin_drivers_rating')
			]
		])

		await ctx.reply(message, keyboard)
	},

	// Haydovchini ko'rish (paginated)
	viewDriver: async (ctx, callbackData) => {
		const user = ctx.user
		const page = parseInt(callbackData.split('_')[3]) || 0

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
			return
		}

		const drivers = await Driver.find()
			.sort({ createdAt: -1 })
			.skip(page * 5)
			.limit(5)

		if (drivers.length === 0) {
			await ctx.reply(user.language === 'uz' ? '❌ Haydovchilar mavjud emas' : '❌ Водителей нет')
			return
		}

		const driver = drivers[0]
		const message = formatDriverInfo(driver, user.language)

		const keyboard = {
			inline_keyboard: [
				[
					Markup.button.callback(
						driver.status === 'active' ? '❌ Nofaol qilish' : '✅ Faol qilish',
						`admin_driver_toggle_${driver.telegramId}`
					),
					Markup.button.callback("💰 To'lov", `admin_driver_payment_${driver.telegramId}`)
				],
				[
					Markup.button.callback(
						user.language === 'uz' ? '✏️ Tahrirlash' : '✏️ Редактировать',
						`admin_driver_edit_${driver.telegramId}`
					),
					Markup.button.callback(
						user.language === 'uz' ? '📊 Buyurtmalar' : '📊 Заказы',
						`admin_driver_orders_${driver.telegramId}`
					)
				],
				[
					Markup.button.callback(
						user.language === 'uz' ? '👁‍🗨 Profil' : '👁‍🗨 Профиль',
						`admin_driver_profile_${driver.telegramId}`
					),
					Markup.button.callback(
						user.language === 'uz' ? "🗑 O'chirish" : '🗑 Удалить',
						`admin_driver_delete_${driver.telegramId}`
					)
				],
				[
					Markup.button.callback(
						'⬅️',
						page > 0 ? `admin_driver_view_${page - 1}` : 'admin_driver_view_0'
					),
					Markup.button.callback(`${page + 1}`, `admin_driver_view_${page}`),
					Markup.button.callback('➡️', `admin_driver_view_${page + 1}`)
				],
				[
					Markup.button.callback(
						user.language === 'uz' ? "📋 Ro'yxat" : '📋 Список',
						'admin_drivers'
					),
					Markup.button.callback(user.language === 'uz' ? '🏠 Menyu' : '🏠 Меню', 'admin_menu')
				]
			]
		}

		await ctx.reply(message, keyboard)
	},

	// Haydovchi statusini o'zgartirish
	toggleDriverStatus: async (ctx, callbackData) => {
		const user = ctx.user
		const driverId = callbackData.split('_')[3]

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
			return
		}

		const driver = await Driver.findOne({ telegramId: driverId })

		if (!driver) {
			await ctx.reply(user.language === 'uz' ? '❌ Haydovchi topilmadi' : '❌ Водитель не найден')
			return
		}

		driver.status = driver.status === 'active' ? 'inactive' : 'active'
		await driver.save()

		const message =
			user.language === 'uz'
				? `✅ Haydovchi statusi o'zgartirildi!\n\n${driver.fullName}\nYangі holat: ${
						driver.status === 'active' ? 'Faol ✅' : 'Nofaol ❌'
				  }`
				: `✅ Статус водителя изменен!\n\n${driver.fullName}\nНовый статус: ${
						driver.status === 'active' ? 'Активен ✅' : 'Неактивен ❌'
				  }`

		await ctx.reply(message)

		// Haydovchiga xabar yuborish
		try {
			await ctx.telegram.sendMessage(
				driverId,
				user.language === 'uz'
					? `🔔 Admin tomonidan sizning profilingiz ${
							driver.status === 'active' ? 'faollashtirildi' : 'nofaollashtirildi'
					  }.\n\nSiz endi ${
							driver.status === 'active'
								? 'buyurtmalar olishni boshlaysiz'
								: 'buyurtmalar ololmaysiz'
					  }.`
					: `🔔 Администратором ваш профиль был ${
							driver.status === 'active' ? 'активирован' : 'деактивирован'
					  }.\n\nТеперь вы ${
							driver.status === 'active' ? 'начинаете получать заказы' : 'не получаете заказы'
					  }.`
			)
		} catch (error) {
			console.error('Driver notification error:', error)
		}

		// Qayta ko'rsatish
		await module.exports.viewDriver(ctx, `admin_driver_view_0`)
	},

	// Haydovchiga to'lov qilish
	addDriverPayment: async (ctx, callbackData) => {
		const user = ctx.user
		const driverId = callbackData.split('_')[3]

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
			return
		}

		// Sessionda driverId ni saqlash
		if (!ctx.session) {
			ctx.session = {}
		}
		ctx.session.adminDriverId = driverId
		ctx.session.adminAction = 'add_payment'

		const message =
			user.language === 'uz'
				? `💰 Haydovchiga to'lov qo'shish\n\nTo'lov miqdorini kiriting (so'm):`
				: `💰 Добавить платеж водителю\n\nВведите сумму платежа (сум):`

		await ctx.reply(message)
	},

	// Buyurtmalar ro'yxati
	showOrders: async ctx => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
			return
		}

		const orders = await Order.find().sort({ createdAt: -1 }).limit(20)
		const totalOrders = await Order.countDocuments()

		let message =
			user.language === 'uz'
				? `📋 Buyurtmalar (Jami: ${totalOrders})\n\n`
				: `📋 Заказы (Всего: ${totalOrders})\n\n`

		orders.forEach((order, index) => {
			const statusText = {
				pending: '⏳',
				searching: '🔍',
				found: '✅',
				cancelled: '❌'
			}

			message += `${index + 1}. ${statusText[order.status] || '📝'} ${order.fromRegion} → ${
				order.toRegion
			}\n`
			message += `   👤 ${order.username || order.userId}\n`
			message += `   📦 ${order.hasParcel ? 'Ha' : "Yo'q"} | 📅 ${new Date(
				order.createdAt
			).toLocaleDateString('uz-UZ')}\n\n`
		})

		const keyboard = Markup.inlineKeyboard([
			[
				Markup.button.callback('⬅️ Orqaga', 'admin_menu'),
				Markup.button.callback("Buyurtmani ko'rish ➡️", 'admin_order_view_0')
			],
			[
				Markup.button.callback('⏳ Kutilmoqda', 'admin_orders_pending'),
				Markup.button.callback('✅ Topilgan', 'admin_orders_found')
			],
			[
				Markup.button.callback('🔍 Qidirilmoqda', 'admin_orders_searching'),
				Markup.button.callback('❌ Bekor', 'admin_orders_cancelled')
			]
		])

		await ctx.reply(message, keyboard)
	},

	// Statistika
	showStats: async ctx => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
			return
		}

		// Ma'lumotlarni olish
		const totalUsers = await User.countDocuments()
		const totalDrivers = await Driver.countDocuments()
		const activeDrivers = await Driver.countDocuments({ status: 'active' })
		const totalOrders = await Order.countDocuments()
		const todayOrders = await Order.countDocuments({
			createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
		})
		const totalRevenue =
			(await Driver.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]))[0]
				?.total || 0

		const message =
			user.language === 'uz'
				? `📊 Bot statistikasi\n\n` +
				  `👥 Foydalanuvchilar: ${totalUsers} ta\n` +
				  `🚘 Haydovchilar: ${totalDrivers} ta\n` +
				  `✅ Faol haydovchilar: ${activeDrivers} ta\n` +
				  `📋 Buyurtmalar: ${totalOrders} ta\n` +
				  `📅 Bugungi buyurtmalar: ${todayOrders} ta\n` +
				  `💰 Umumiy daromad: ${totalRevenue.toLocaleString()} so'm\n\n` +
				  `📈 Aktivlik:\n` +
				  `- Yo'lovchilar: ${Math.round(((totalUsers - totalDrivers) / totalUsers) * 100)}%\n` +
				  `- Haydovchilar: ${Math.round((totalDrivers / totalUsers) * 100)}%\n` +
				  `- Konversiya: ${Math.round((totalOrders / totalUsers) * 100)}%`
				: `📊 Статистика бота\n\n` +
				  `👥 Пользователи: ${totalUsers} чел\n` +
				  `🚘 Водители: ${totalDrivers} чел\n` +
				  `✅ Активные водители: ${activeDrivers} чел\n` +
				  `📋 Заказы: ${totalOrders} шт\n` +
				  `📅 Заказы сегодня: ${todayOrders} шт\n` +
				  `💰 Общий доход: ${totalRevenue.toLocaleString()} сум\n\n` +
				  `📈 Активность:\n` +
				  `- Пассажиры: ${Math.round(((totalUsers - totalDrivers) / totalUsers) * 100)}%\n` +
				  `- Водители: ${Math.round((totalDrivers / totalUsers) * 100)}%\n` +
				  `- Конверсия: ${Math.round((totalOrders / totalUsers) * 100)}%`

		const keyboard = Markup.inlineKeyboard([
			[
				Markup.button.callback('🔄 Yangilash', 'admin_stats'),
				Markup.button.callback('📊 Batafsil', 'admin_stats_detailed')
			],
			[
				Markup.button.callback('📤 Eksport', 'admin_stats_export'),
				Markup.button.callback('📅 Kunlik', 'admin_stats_daily')
			],
			[Markup.button.callback('⬅️ Orqaga', 'admin_menu')]
		])

		await ctx.reply(message, keyboard)
	},

	// Xabar yuborish (broadcast)
	showBroadcastMenu: async ctx => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
			return
		}

		const message =
			user.language === 'uz'
				? `📢 Xabar yuborish\n\nKimlarga xabar yubormoqchisiz?`
				: `📢 Рассылка сообщений\n\nКому хотите отправить сообщение?`

		const keyboard = Markup.inlineKeyboard([
			[
				Markup.button.callback('👥 Hammaga', 'admin_broadcast_all'),
				Markup.button.callback('🚘 Haydovchilarga', 'admin_broadcast_drivers')
			],
			[
				Markup.button.callback("👤 Yo'lovchilarga", 'admin_broadcast_passengers'),
				Markup.button.callback('✅ Faollarga', 'admin_broadcast_active')
			],
			[Markup.button.callback('⬅️ Orqaga', 'admin_menu')]
		])

		await ctx.reply(message, keyboard)
	},

	// Admin sozlamalari
	showAdminSettings: async ctx => {
		const user = ctx.user

		if (!ADMIN_IDS.includes(user.telegramId)) {
			await ctx.reply('❌ Siz admin emassiz!')
			return
		}

		const message = user.language === 'uz' ? `⚙️ Admin sozlamalari\n\n` : `⚙️ Админ настройки\n\n`

		const keyboard = Markup.inlineKeyboard([
			[
				Markup.button.callback("🔧 To'lov sozlamalari", 'admin_settings_payment'),
				Markup.button.callback('📊 Bot sozlamalari', 'admin_settings_bot')
			],
			[
				Markup.button.callback('📱 Kanal sozlamalari', 'admin_settings_channel'),
				Markup.button.callback('🔐 Ruxsatlar', 'admin_settings_permissions')
			],
			[Markup.button.callback('⬅️ Orqaga', 'admin_menu')]
		])

		await ctx.reply(message, keyboard)
	}
}
