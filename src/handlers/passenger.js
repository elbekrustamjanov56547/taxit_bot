const Order = require('../models/Order')
const Driver = require('../models/Driver')
const User = require('../models/User')
const states = require('../utils/states')
const keyboards = require('../keyboards/main')
const regionKeyboards = require('../keyboards/regions')

module.exports = {
	// Buyurtma boshlash
	startOrder: async ctx => {
		const user = ctx.user

		user.state = states.PASSENGER_FROM_REGION
		await user.save()

		const message =
			user.language === 'uz'
				? "📍 Qaysi viloyatdan jo'namoqchisiz?"
				: '📍 Из какого региона выезжаете?'

		await ctx.reply(message, regionKeyboards.fromRegionsKeyboard(user.language))
	},

	// Chiqish viloyatini tanlash
	selectFromRegion: async (ctx, callbackData) => {
		const user = ctx.user
		const region = callbackData.replace('from_', '')

		// Session ga saqlash (yangi Order yaratmasdan)
		if (!ctx.session) {
			ctx.session = {}
		}
		ctx.session.fromRegion = region

		user.state = states.PASSENGER_TO_REGION
		await user.save()

		const message =
			user.language === 'uz'
				? `📍 Chiqish: ${region}\n\nQaysi viloyatga borasiz?`
				: `📍 Отправление: ${region}\n\nВ какой регион едете?`

		await ctx.reply(message, regionKeyboards.toRegionsKeyboard(user.language))
	},

	// Kirish viloyatini tanlash
	selectToRegion: async (ctx, callbackData) => {
		const user = ctx.user
		const region = callbackData.replace('to_', '')

		// Session ga saqlash
		if (!ctx.session) {
			ctx.session = {}
		}
		ctx.session.toRegion = region

		user.state = states.PASSENGER_PARCEL
		await user.save()

		const message =
			user.language === 'uz'
				? `📍 Kirish: ${region}\n\n📦 Pochta yoki yuk bormi?`
				: `📍 Прибытие: ${region}\n\n📦 Есть посылка или груз?`

		await ctx.reply(message, keyboards.parcelKeyboard(user.language))
	},

	// Pochta tanlash
	selectParcel: async (ctx, callbackData) => {
		const user = ctx.user
		const hasParcel = callbackData === 'parcel_yes'

		// Session ga saqlash
		if (!ctx.session) {
			ctx.session = {}
		}
		ctx.session.hasParcel = hasParcel

		if (hasParcel) {
			user.state = states.PASSENGER_PARCEL_DESC
			await user.save()

			const message =
				user.language === 'uz'
					? "📝 Pochta/yuk haqida qisqacha ma'lumot bering:"
					: '📝 Кратко опишите посылку/груз:'

			await ctx.reply(message)
		} else {
			ctx.session.parcelDescription = ''
			await module.exports.showCommentKeyboard(ctx)
		}
	},

	// Pochta tavsifini saqlash
	saveParcelDescription: async (ctx, text) => {
		const user = ctx.user

		// Session ga saqlash
		if (!ctx.session) {
			ctx.session = {}
		}
		ctx.session.parcelDescription = text

		await module.exports.showCommentKeyboard(ctx)
	},

	// Izoh keyboard
	showCommentKeyboard: async ctx => {
		const user = ctx.user

		user.state = states.PASSENGER_COMMENT
		await user.save()

		const message =
			user.language === 'uz'
				? '✍️ Izoh qoldirmoqchimisiz? (ixtiyoriy)'
				: '✍️ Хотите оставить комментарий? (необязательно)'

		await ctx.reply(message, keyboards.commentKeyboard(user.language))
	},

	// Izoh qoldirish
	addComment: async ctx => {
		const user = ctx.user

		const message =
			user.language === 'uz' ? '📝 Izohingizni yozing:' : '📝 Напишите ваш комментарий:'

		await ctx.reply(message)
	},

	// Izoh o'tkazib yuborish
	skipComment: async ctx => {
		// Session ga bo'sh izoh saqlash
		if (!ctx.session) {
			ctx.session = {}
		}
		ctx.session.comment = ''

		await module.exports.createOrder(ctx)
	},

	// Izohni saqlash
	saveComment: async (ctx, text) => {
		// Session ga izoh saqlash
		if (!ctx.session) {
			ctx.session = {}
		}
		ctx.session.comment = text

		await module.exports.createOrder(ctx)
	},

	// Buyurtma yaratish (barcha ma'lumotlar to'planganidan keyin)
	createOrder: async ctx => {
		const user = ctx.user

		// Session ma'lumotlarini tekshirish
		if (!ctx.session) {
			ctx.session = {}
		}

		const { fromRegion, toRegion, hasParcel, parcelDescription, comment } = ctx.session

		if (!fromRegion || !toRegion) {
			const message =
				user.language === 'uz'
					? "❌ Iltimos, barcha maydonlarni to'ldiring."
					: '❌ Пожалуйста, заполните все поля.'

			await ctx.reply(message)
			return
		}

		try {
			// Yangi buyurtma yaratish
			const order = new Order({
				userId: user.telegramId,
				username: user.username,
				fromRegion: fromRegion,
				toRegion: toRegion,
				hasParcel: hasParcel || false,
				parcelDescription: parcelDescription || '',
				comment: comment || '',
				status: 'pending'
			})

			await order.save()

			// Session ga order id ni saqlash
			ctx.session.orderId = order._id

			// Tasdiqlash oynasini ko'rsatish
			await module.exports.showConfirmation(ctx, order)
		} catch (error) {
			console.error('Order creation error:', error)

			const message =
				user.language === 'uz'
					? "❌ Buyurtma yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
					: '❌ Ошибка при создании заказа. Пожалуйста, попробуйте еще раз.'

			await ctx.reply(message)
		}
	},

	// Tasdiqlash oynasini ko'rsatish
	showConfirmation: async (ctx, order) => {
		const user = ctx.user

		user.state = states.PASSENGER_CONFIRM
		await user.save()

		const confirmMessage =
			user.language === 'uz'
				? `📋 Buyurtma ma'lumotlari:\n\n` +
				  `📍 Chiqish: ${order.fromRegion}\n` +
				  `📍 Kirish: ${order.toRegion}\n` +
				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
				  `${order.comment ? `✍️ Izoh: ${order.comment}\n` : ''}` +
				  `\nBuyurtmani tasdiqlaysizmi?`
				: `📋 Данные заказа:\n\n` +
				  `📍 Отправление: ${order.fromRegion}\n` +
				  `📍 Прибытие: ${order.toRegion}\n` +
				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
				  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n` : ''}` +
				  `${order.comment ? `✍️ Комментарий: ${order.comment}\n` : ''}` +
				  `\nПодтверждаете заказ?`

		await ctx.reply(confirmMessage, keyboards.confirmKeyboard(user.language))
	},

	// Buyurtmani tasdiqlash
	confirmOrder: async ctx => {
		const user = ctx.user

		if (!ctx.session || !ctx.session.orderId) {
			const message =
				user.language === 'uz'
					? '❌ Buyurtma topilmadi. Iltimos, qaytadan boshlang.'
					: '❌ Заказ не найден. Пожалуйста, начните заново.'

			await ctx.reply(message)
			return
		}

		try {
			const order = await Order.findById(ctx.session.orderId)

			if (!order) {
				throw new Error('Order not found')
			}

			// Haydovchi qidirish
			await module.exports.searchDrivers(ctx, order)
		} catch (error) {
			console.error('Confirm order error:', error)

			const message =
				user.language === 'uz'
					? "❌ Buyurtmani tasdiqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
					: '❌ Ошибка при подтверждении заказа. Пожалуйста, попробуйте еще раз.'

			await ctx.reply(message)
		}
	},

	// Haydovchi qidirish
	// searchDrivers: async (ctx, order) => {
	// 	const user = ctx.user

	// 	// Statusni yangilash
	// 	order.status = 'searching'
	// 	await order.save()

	// 	// Haydovchi qidirish
	// 	const drivers = await Driver.find({
	// 		fromRegion: order.fromRegion,
	// 		toRegion: order.toRegion,
	// 		status: 'active',
	// 		paidUntil: { $gte: new Date() }
	// 	})

	// 	if (drivers.length > 0) {
	// 		// Haydovchilarni ko'rsatish
	// 		await module.exports.showFoundDrivers(ctx, drivers, order)
	// 	} else {
	// 		// Haydovchi topilmadi
	// 		order.status = 'pending'
	// 		await order.save()

	// 		// Kanalga yuborish
	// 		await module.exports.sendToChannel(ctx, order)

	// 		const message =
	// 			user.language === 'uz'
	// 				? `❌ Siz tanlagan yo'nalish bo'yicha hozircha mashina topilmadi.\n\nBuyurtmangiz adminlarga yuborildi, tez orada aloqaga chiqishadi.`
	// 				: `❌ По выбранному направлению машины не найдены.\n\nВаш заказ отправлен администраторам, они свяжутся с вами в ближайшее время.`

	// 		await ctx.reply(message)

	// 		// Asosiy menyuga qaytish
	// 		user.state = states.MAIN_MENU
	// 		await user.save()

	// 		const menuMessage = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'

	// 		await ctx.reply(menuMessage, keyboards.mainMenuKeyboard(user.language))
	// 	}
	// },
	// Haydovchi qidirish
	searchDrivers: async (ctx, order) => {
		const user = ctx.user

		// Statusni yangilash
		order.status = 'searching'
		await order.save()

		console.log(`🔍 Qidirilayotgan yo'nalish: ${order.fromRegion} -> ${order.toRegion}`)

		// **MUHIM: Query'ni tuzatamiz**
		// paidUntil null bo'lsa ham yoki kelajak sanasi bo'lsa ham qidirish
		const drivers = await Driver.find({
			fromRegion: order.fromRegion,
			toRegion: order.toRegion,
			status: 'active',
			$or: [
				{ paidUntil: { $gte: new Date() } }, // To'lov muddati hali tugamagan
				{ paidUntil: null }, // To'lov muddati yo'q (yangi haydovchi)
				{ paidUntil: { $exists: false } } // paidUntil maydoni yo'q
			]
		})

		console.log(`📊 Topilgan haydovchilar: ${drivers.length} ta`)

		// Har bir haydovchini log qilish
		drivers.forEach((driver, index) => {
			console.log(`  ${index + 1}. ${driver.fullName} - ${driver.fromRegion} -> ${driver.toRegion}`)
			console.log(`     Status: ${driver.status}, PaidUntil: ${driver.paidUntil}`)
		})

		if (drivers.length > 0) {
			// Haydovchilarni ko'rsatish
			await module.exports.showFoundDrivers(ctx, drivers, order)
		} else {
			// Haydovchi topilmadi
			order.status = 'pending'
			await order.save()

			// Batafsil log qilish
			console.log(`❌ Haydovchi topilmadi. Sabablar:`)

			// Alternativ query: faqat region bo'yicha qidirish
			const allDriversSameRoute = await Driver.find({
				fromRegion: order.fromRegion,
				toRegion: order.toRegion
			})
			console.log(`📊 Ushbu yo'nalishdagi barcha haydovchilar: ${allDriversSameRoute.length} ta`)
			allDriversSameRoute.forEach((driver, index) => {
				console.log(`  ${index + 1}. ${driver.fullName}`)
				console.log(`     Status: ${driver.status}, PaidUntil: ${driver.paidUntil}`)
			})

			// Kanalga yuborish
			await module.exports.sendToChannel(ctx, order)

			const message =
				user.language === 'uz'
					? `❌ Siz tanlagan yo'nalish bo'yicha hozircha mashina topilmadi.\n\n` +
					  `📍 Chiqish: ${order.fromRegion}\n` +
					  `📍 Kirish: ${order.toRegion}\n\n` +
					  `Buyurtmangiz adminlarga yuborildi, tez orada aloqaga chiqishadi.`
					: `❌ По выбранному направлению машины не найдены.\n\n` +
					  `📍 Отправление: ${order.fromRegion}\n` +
					  `📍 Прибытие: ${order.toRegion}\n\n` +
					  `Ваш заказ отправлен администраторам, они свяжутся с вами в ближайшее время.`

			await ctx.reply(message)

			// Asosiy menyuga qaytish
			user.state = states.MAIN_MENU
			await user.save()

			const menuMessage = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'
			await ctx.reply(menuMessage, keyboards.mainMenuKeyboard(user.language))
		}
	},

	// Topilgan haydovchilarni ko'rsatish
	showFoundDrivers: async (ctx, drivers, order) => {
		const user = ctx.user

		let message =
			user.language === 'uz' ? '✅ Topilgan haydovchilar:\n\n' : '✅ Найденные водители:\n\n'

		drivers.forEach((driver, index) => {
			message += `${index + 1}. ${driver.fullName}\n`
			message += `   🚗 ${driver.carModel}\n`
			message += `   📞 ${driver.phone}\n`
			message += `   ⭐ ${driver.rating}/5.0\n\n`
		})

		message +=
			user.language === 'uz'
				? "Haydovchi bilan bog'laning va jo'nash vaqtini kelishing."
				: 'Свяжитесь с водителем и договоритесь о времени отправления.'

		await ctx.reply(message)

		// Muvaffaqiyatli xabari
		const successMessage =
			user.language === 'uz'
				? `✅ Buyurtma qabul qilindi!\n\n` +
				  `📍 Chiqish: ${order.fromRegion}\n` +
				  `📍 Kirish: ${order.toRegion}\n` +
				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
				  `${order.comment ? `✍️ Izoh: ${order.comment}\n` : ''}` +
				  `\nBuyurtmangiz qabul qilindi va haydovchilar bilan bog'laning.`
				: `✅ Заказ принят!\n\n` +
				  `📍 Отправление: ${order.fromRegion}\n` +
				  `📍 Прибытие: ${order.toRegion}\n` +
				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
				  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n` : ''}` +
				  `${order.comment ? `✍️ Комментарий: ${order.comment}\n` : ''}` +
				  `\nВаш заказ принят, свяжитесь с водителями.`

		await ctx.reply(successMessage)

		// Asosiy menyuga qaytish
		user.state = states.MAIN_MENU
		await user.save()

		const menuMessage = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'

		await ctx.reply(menuMessage, keyboards.mainMenuKeyboard(user.language))

		// Haydovchilarga xabar yuborish
		for (const driver of drivers) {
			try {
				await ctx.telegram.sendMessage(
					driver.telegramId,
					`🚕 Yangi buyurtma!\n\n` +
						`Yo'lovchi: @${order.username || order.userId}\n` +
						`📍 Chiqish: ${order.fromRegion}\n` +
						`📍 Kirish: ${order.toRegion}\n` +
						`📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
						`📊 Status: Yangi`
				)
			} catch (error) {
				console.error('Driver notification error:', error)
			}
		}
	},

	// Kanalga yuborish
	sendToChannel: async (ctx, order) => {
		try {
			const channelId = process.env.ORDER_CHANNEL_ID || '@your_channel'

			const message =
				`🚕 YANGI BUYURTMA\n\n` +
				`📍 Chiqish: ${order.fromRegion}\n` +
				`📍 Kirish: ${order.toRegion}\n` +
				`📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
				`${order.comment ? `✍️ Izoh: ${order.comment}\n` : ''}` +
				`👤 Foydalanuvchi: @${order.username || order.userId}\n` +
				`🆔 ID: ${order.userId}\n` +
				`⏰ Vaqt: ${new Date(order.createdAt).toLocaleString('uz-UZ')}`

			await ctx.telegram.sendMessage(channelId, message)
		} catch (error) {
			console.error('Channel send error:', error)
		}
	},

	// Buyurtmani bekor qilish
	cancelOrder: async ctx => {
		const user = ctx.user

		if (!ctx.session || !ctx.session.orderId) {
			const message = user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.'

			await ctx.reply(message)
			return
		}

		try {
			const order = await Order.findById(ctx.session.orderId)

			if (order) {
				order.status = 'cancelled'
				await order.save()
			}

			// Session ni tozalash
			if (ctx.session) {
				delete ctx.session.orderId
				delete ctx.session.fromRegion
				delete ctx.session.toRegion
				delete ctx.session.hasParcel
				delete ctx.session.parcelDescription
				delete ctx.session.comment
			}

			const message = user.language === 'uz' ? '❌ Buyurtma bekor qilindi.' : '❌ Заказ отменен.'

			await ctx.reply(message)

			// Asosiy menyuga qaytish
			user.state = states.MAIN_MENU
			await user.save()

			const menuMessage = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'

			await ctx.reply(menuMessage, keyboards.mainMenuKeyboard(user.language))
		} catch (error) {
			console.error('Cancel order error:', error)

			const message =
				user.language === 'uz'
					? '❌ Buyurtmani bekor qilishda xatolik yuz berdi.'
					: '❌ Ошибка при отмене заказа.'

			await ctx.reply(message)
		}
	},

	// Mening buyurtmalarim
	showMyOrders: async ctx => {
		const user = ctx.user

		const orders = await Order.find({ userId: user.telegramId }).sort({ createdAt: -1 }).limit(10)

		if (orders.length === 0) {
			const message =
				user.language === 'uz'
					? '📭 Sizda hali buyurtmalar mavjud emas.'
					: '📭 У вас пока нет заказов.'

			await ctx.reply(message)
			return
		}

		let message = user.language === 'uz' ? '📋 Mening buyurtmalarim:\n\n' : '📋 Мои заказы:\n\n'

		orders.forEach((order, index) => {
			const statusText = {
				pending: '⏳ Kutilmoqda',
				searching: '🔍 Qidirilmoqda',
				found: '✅ Topildi',
				cancelled: '❌ Bekor qilingan'
			}

			const status =
				user.language === 'uz' ? statusText[order.status] || order.status : order.status

			message += `${index + 1}. ${order.fromRegion} → ${order.toRegion}\n`
			message += `   📅 ${new Date(order.createdAt).toLocaleDateString('uz-UZ')}\n`
			message += `   📊 ${status}\n\n`
		})

		await ctx.reply(message)
	}
}
