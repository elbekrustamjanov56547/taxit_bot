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

		if (user.role === 'driver') {
			await ctx.reply(
				user.language === 'uz'
					? '❌ Siz haydovchisiz. Siz taxi buyurtma qila olmaysiz.'
					: '❌ Вы водитель. Вы не можете заказать такси.'
			)
			return
		}

		// User rolini 'user' qilib o'rnatamiz (agar allaqachon bo'lmasa)
		if (user.role !== 'user') {
			user.role = 'user'
			await user.save()
		}
	},

	// Chiqish viloyatini tanlash
	selectFromRegion: async (ctx, callbackData) => {
		const user = ctx.user
		const region = callbackData.replace('from_', '')

		// Session ga to'g'ri saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.fromRegion = region

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
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.toRegion = region

		// Yo'lovchilar sonini tanlashga o'tish
		user.state = states.PASSENGER_PASSENGER_COUNT
		await user.save()

		const message =
			user.language === 'uz'
				? `📍 Kirish: ${region}\n\n👥 Necha kishi ketasiz?`
				: `📍 Прибытие: ${region}\n\n👥 Сколько человек едет?`

		await ctx.reply(message, keyboards.passengerCountKeyboard(user.language))
	},

	// Yo'lovchilar sonini tanlash
	selectPassengerCount: async (ctx, callbackData) => {
		const user = ctx.user
		const passengerCount = parseInt(callbackData.replace('passengers_', ''))

		// Session ga saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.passengerCount = passengerCount

		user.state = states.PASSENGER_PARCEL
		await user.save()

		const message =
			user.language === 'uz'
				? `👥 Yo'lovchilar soni: ${passengerCount} kishi\n\n📦 Pochta yoki yuk bormi?`
				: `👥 Количество пассажиров: ${passengerCount} человек\n\n📦 Есть посылка или груз?`

		await ctx.reply(message, keyboards.parcelKeyboard(user.language))
	},

	// Pochta tanlash
	selectParcel: async (ctx, callbackData) => {
		const user = ctx.user
		const hasParcel = callbackData === 'parcel_yes'

		// Session ga saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.hasParcel = hasParcel

		if (hasParcel) {
			user.state = states.PASSENGER_PARCEL_DESC
			await user.save()

			const message =
				user.language === 'uz'
					? "📝 Pochta/yuk haqida qisqacha ma'lumot bering:"
					: '📝 Кратко опишите посылку/груз:'

			await ctx.reply(message)
		} else {
			// Pochta yo'q deb tanlaganda
			ctx.session.orderData.parcelDescription = ''
			await module.exports.createOrder(ctx) // To'g'ridan-to'g'ri buyurtma yaratish
		}
	},

	// Pochta tavsifini saqlash
	saveParcelDescription: async (ctx, text) => {
		const user = ctx.user

		// Session ga saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.parcelDescription = text

		await module.exports.createOrder(ctx)
	},

	// Buyurtma yaratish
	// createOrder: async ctx => {
	// 	const user = ctx.user

	// 	// Session ma'lumotlarini tekshirish
	// 	ctx.session = ctx.session || {}
	// 	ctx.session.orderData = ctx.session.orderData || {}

	// 	const orderData = ctx.session.orderData
	// 	const { fromRegion, toRegion, passengerCount } = orderData

	// 	if (!fromRegion || !toRegion || !passengerCount) {
	// 		const message =
	// 			user.language === 'uz'
	// 				? "❌ Iltimos, barcha maydonlarni to'ldiring."
	// 				: '❌ Пожалуйста, заполните все поля.'

	// 		await ctx.reply(message)
	// 		return
	// 	}

	// 	try {
	// 		// Yangi buyurtma yaratish
	// 		const order = new Order({
	// 			userId: user.telegramId,
	// 			username: user.username,
	// 			fromRegion: fromRegion,
	// 			toRegion: toRegion,
	// 			passengerCount: passengerCount,
	// 			hasParcel: orderData.hasParcel || false,
	// 			parcelDescription: orderData.parcelDescription || '',
	// 			comment: '',
	// 			status: 'pending',
	// 			createdAt: new Date()
	// 		})

	// 		await order.save()

	// 		// Session ga order id ni saqlash
	// 		ctx.session.orderId = order._id

	// 		// Tasdiqlash oynasini ko'rsatish
	// 		await module.exports.showConfirmation(ctx, order)
	// 	} catch (error) {
	// 		console.error('Order creation error:', error)

	// 		const message =
	// 			user.language === 'uz'
	// 				? "❌ Buyurtma yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
	// 				: '❌ Ошибка при создании заказа. Пожалуйста, попробуйте еще раз.'

	// 		await ctx.reply(message)
	// 	}
	// },

	// Buyurtma yaratish
	createOrder: async ctx => {
		const user = ctx.user

		// Session ma'lumotlarini tekshirish
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}

		const orderData = ctx.session.orderData
		const { fromRegion, toRegion, passengerCount } = orderData

		if (!fromRegion || !toRegion || !passengerCount) {
			const message =
				user.language === 'uz'
					? "❌ Iltimos, barcha maydonlarni to'ldiring."
					: '❌ Пожалуйста, заполните все поля.'

			await ctx.reply(message)
			return
		}

		try {
			// Yangi buyurtma yaratish - statusni 'searching' qilib o'rnating
			const order = new Order({
				userId: user.telegramId,
				username: user.username,
				fromRegion: fromRegion,
				toRegion: toRegion,
				passengerCount: passengerCount,
				hasParcel: orderData.hasParcel || false,
				parcelDescription: orderData.parcelDescription || '',
				comment: '',
				status: 'searching', // BU YERNI O'ZGARTIRDIK: 'pending' o'rniga 'searching'
				createdAt: new Date()
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
				  `👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
				  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n` : ''}` +
				  `\nBuyurtmani tasdiqlaysizmi?`
				: `📋 Данные заказа:\n\n` +
				  `📍 Отправление: ${order.fromRegion}\n` +
				  `📍 Прибытие: ${order.toRegion}\n` +
				  `👥 Количество пассажиров: ${order.passengerCount} человек\n` +
				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
				  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n` : ''}` +
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

			// Haydovchi qidirish (yo'lovchilar soni hisobga olinadi)
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

	// Haydovchi qidirish (yo'lovchilar soni hisobga olinadi)
	// searchDrivers: async (ctx, order) => {
	// 	const user = ctx.user

	// 	// Statusni yangilash
	// 	order.status = 'searching'
	// 	await order.save()

	// 	console.log(`🔍 Qidirilayotgan yo'nalish: ${order.fromRegion} -> ${order.toRegion}`)
	// 	console.log(`👥 Yo'lovchilar soni: ${order.passengerCount}`)

	// 	// Haydovchilarni qidirish (yo'lovchilar soni hisobga olinadi)
	// 	const drivers = await Driver.find({
	// 		fromRegion: order.fromRegion,
	// 		toRegion: order.toRegion,
	// 		status: 'active',
	// 		maxPassengers: { $gte: order.passengerCount }, // Maksimal yo'lovchilar soni yetadigan haydovchilar
	// 		$or: [
	// 			{ paidUntil: { $gte: new Date() } },
	// 			{ paidUntil: null },
	// 			{ paidUntil: { $exists: false } }
	// 		]
	// 	})

	// 	console.log(`📊 Topilgan haydovchilar: ${drivers.length} ta`)

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
	// 				? `❌ Siz tanlagan yo'nalish bo'yicha (${order.passengerCount} kishi uchun) hozircha mashina topilmadi.\n\n` +
	// 				  `📍 Chiqish: ${order.fromRegion}\n` +
	// 				  `📍 Kirish: ${order.toRegion}\n` +
	// 				  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n\n` +
	// 				  `Buyurtmangiz adminlarga yuborildi, tez orada aloqaga chiqishadi.`
	// 				: `❌ По выбранному направлению (для ${order.passengerCount} человек) машины не найдены.\n\n` +
	// 				  `📍 Отправление: ${order.fromRegion}\n` +
	// 				  `📍 Прибытие: ${order.toRegion}\n` +
	// 				  `👥 Пассажиры: ${order.passengerCount} человек\n\n` +
	// 				  `Ваш заказ отправлен администраторам, они свяжутся с вами в ближайшее время.`

	// 		await ctx.reply(message)

	// 		// Asosiy menyuga qaytish
	// 		user.state = states.MAIN_MENU
	// 		await user.save()

	// 		const menuMessage = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'
	// 		await ctx.reply(menuMessage, keyboards.mainMenuKeyboard(user.language))
	// 	}
	// },

	// Haydovchi qidirish (yo'lovchilar soni hisobga olinadi)
	searchDrivers: async (ctx, order) => {
		const user = ctx.user

		// Statusni 'searching' ga o'rnatish (agar allaqachon shunday bo'lmasa)
		if (order.status !== 'searching') {
			order.status = 'searching'
			await order.save()
		}

		console.log(`🔍 Qidirilayotgan yo'nalish: ${order.fromRegion} -> ${order.toRegion}`)
		console.log(`👥 Yo'lovchilar soni: ${order.passengerCount}`)

		// Haydovchilarni qidirish (yo'lovchilar soni hisobga olinadi)
		const drivers = await Driver.find({
			fromRegion: order.fromRegion,
			toRegion: order.toRegion,
			status: 'active',
			maxPassengers: { $gte: order.passengerCount },
			$or: [
				{ paidUntil: { $gte: new Date() } },
				{ paidUntil: null },
				{ paidUntil: { $exists: false } }
			]
		})

		console.log(`📊 Topilgan haydovchilar: ${drivers.length} ta`)

		if (drivers.length > 0) {
			// Haydovchilarni ko'rsatish
			await module.exports.showFoundDrivers(ctx, drivers, order)
		} else {
			// Haydovchi topilmadi
			order.status = 'cancelled' // YOKI 'pending' o'rniga boshqa status
			await order.save()

			// Kanalga yuborish
			await module.exports.sendToChannel(ctx, order)

			const message =
				user.language === 'uz'
					? `❌ Siz tanlagan yo'nalish bo'yicha (${order.passengerCount} kishi uchun) hozircha mashina topilmadi.\n\n` +
					  `📍 Chiqish: ${order.fromRegion}\n` +
					  `📍 Kirish: ${order.toRegion}\n` +
					  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n\n` +
					  `Buyurtmangiz adminlarga yuborildi, tez orada aloqaga chiqishadi.`
					: `❌ По выбранному направлению (для ${order.passengerCount} человек) машины не найдены.\n\n` +
					  `📍 Отправление: ${order.fromRegion}\n` +
					  `📍 Прибытие: ${order.toRegion}\n` +
					  `👥 Пассажиры: ${order.passengerCount} человек\n\n` +
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
	// showFoundDrivers: async (ctx, drivers, order) => {
	// 	const user = ctx.user

	// 	let message =
	// 		user.language === 'uz' ? '✅ Topilgan haydovchilar:\n\n' : '✅ Найденные водители:\n\n'

	// 	drivers.forEach((driver, index) => {
	// 		message += `${index + 1}. ${driver.fullName}\n`
	// 		message += `   🚗 ${driver.carModel}\n`
	// 		message += `   👥 Sig'im: ${driver.maxPassengers} kishi\n`
	// 		message += `   📞 ${driver.phone}\n`
	// 		message += `   ⭐ ${driver.rating}/5.0\n\n`
	// 	})

	// 	message +=
	// 		user.language === 'uz'
	// 			? "Haydovchi bilan bog'laning va jo'nash vaqtini kelishing."
	// 			: 'Свяжитесь с водителем и договоритесь о времени отправления.'

	// 	await ctx.reply(message)

	// 	// Muvaffaqiyatli xabari
	// 	const successMessage =
	// 		user.language === 'uz'
	// 			? `✅ Buyurtma qabul qilindi!\n\n` +
	// 			  `📍 Chiqish: ${order.fromRegion}\n` +
	// 			  `📍 Kirish: ${order.toRegion}\n` +
	// 			  `👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
	// 			  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
	// 			  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n` : ''}` +
	// 			  `\nBuyurtmangiz qabul qilindi va haydovchilar bilan bog'laning.`
	// 			: `✅ Заказ принят!\n\n` +
	// 			  `📍 Отправление: ${order.fromRegion}\n` +
	// 			  `📍 Прибытие: ${order.toRegion}\n` +
	// 			  `👥 Количество пассажиров: ${order.passengerCount} человек\n` +
	// 			  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
	// 			  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n` : ''}` +
	// 			  `\nВаш заказ принят, свяжитесь с водителями.`

	// 	await ctx.reply(successMessage)

	// 	// Asosiy menyuga qaytish
	// 	user.state = states.MAIN_MENU
	// 	await user.save()

	// 	const menuMessage = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'
	// 	await ctx.reply(menuMessage, keyboards.mainMenuKeyboard(user.language))

	// 	// Haydovchilarga xabar yuborish
	// 	for (const driver of drivers) {
	// 		try {
	// 			await ctx.telegram.sendMessage(
	// 				driver.telegramId,
	// 				`🚕 Yangi buyurtma!\n\n` +
	// 					`Yo'lovchi: @${order.username || order.userId}\n` +
	// 					`📍 Chiqish: ${order.fromRegion}\n` +
	// 					`📍 Kirish: ${order.toRegion}\n` +
	// 					`👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
	// 					`📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
	// 					`${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n` : ''}` +
	// 					`📊 Status: Yangi`
	// 			)
	// 		} catch (error) {
	// 			console.error('Driver notification error:', error)
	// 		}
	// 	}
	// },

	// Topilgan haydovchilarni ko'rsatish
	showFoundDrivers: async (ctx, drivers, order) => {
		const user = ctx.user

		// ============ ASOSIY XABAR: Inline keyboard bilan ============
		const orderMessage =
			user.language === 'uz'
				? `✅ Buyurtma qabul qilindi!\n\n` +
				  `📍 Chiqish: ${order.fromRegion}\n` +
				  `📍 Kirish: ${order.toRegion}\n` +
				  `👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
				  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n\n` : '\n'}` +
				  `Buyurtmangiz qabul qilindi va haydovchilar bilan bog'laning.\n` +
				  `✅ Topilgan haydovchilar:`
				: `✅ Заказ принят!\n\n` +
				  `📍 Отправление: ${order.fromRegion}\n` +
				  `📍 Прибытие: ${order.toRegion}\n` +
				  `👥 Количество пассажиров: ${order.passengerCount} человек\n` +
				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
				  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n\n` : '\n'}` +
				  `Ваш заказ принят, свяжитесь с водителями.\n` +
				  `✅ Найденные водители:`

		// ============ INLINE KEYBOARD YARATISH ============
		const inlineKeyboard = []

		// Har bir haydovchi uchun tugma
		drivers.forEach((driver, index) => {
			const carModelName =
				driver.carModel && typeof driver.carModel === 'object'
					? user.language === 'uz'
						? driver.carModel.name
						: driver.carModel.nameRu
					: driver.carModel

			const buttonText =
				user.language === 'uz'
					? `${index + 1}. ${driver.fullName}`
					: `${index + 1}. ${driver.fullName}`

			inlineKeyboard.push([
				{
					text: buttonText,
					callback_data: `select_driver_${driver._id}_${order._id}`
				}
			])
		})

		// Asosiy menyu tugmasi
		inlineKeyboard.push([
			{
				text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
				callback_data: 'main_menu'
			}
		])

		// Bitta xabarni inline keyboard bilan chiqarish
		await ctx.reply(orderMessage, {
			reply_markup: {
				inline_keyboard: inlineKeyboard
			},
			parse_mode: 'HTML'
		})

		// ============ HAYDOVCHILARGA XABAR YUBORISH ============
		// for (const driver of drivers) {
		// 	try {
		// 		await ctx.telegram.sendMessage(
		// 			driver.telegramId,
		// 			`🚕 Yangi buyurtma!\n\n` +
		// 				`Yo'lovchi: @${order.username || order.userId}\n` +
		// 				`📍 Chiqish: ${order.fromRegion}\n` +
		// 				`📍 Kirish: ${order.toRegion}\n` +
		// 				`👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
		// 				`📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
		// 				`${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n` : ''}` +
		// 				`📊 Status: Yangi`
		// 		)
		// 	} catch (error) {
		// 		console.error('Driver notification error:', error)
		// 	}
		// }

		// Asosiy menyuga qaytish
		user.state = states.MAIN_MENU
		await user.save()
	},
	// Kanalga yuborish (yo'lovchilar soni bilan)
	sendToChannel: async (ctx, order) => {
		try {
			const channelId = process.env.ORDER_CHANNEL_ID || '@your_channel'

			const message =
				`🚕 YANGI BUYURTMA\n\n` +
				`📍 Chiqish: ${order.fromRegion}\n` +
				`📍 Kirish: ${order.toRegion}\n` +
				`👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
				`📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
				`${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n` : ''}` +
				`👤 Foydalanuvchi: @${order.username || order.userId}\n` +
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
				delete ctx.session.orderData
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
	// showMyOrders: async ctx => {
	// 	const user = ctx.user

	// 	const orders = await Order.find({ userId: user.telegramId }).sort({ createdAt: -1 }).limit(10)

	// 	if (orders.length === 0) {
	// 		const message =
	// 			user.language === 'uz'
	// 				? '📭 Sizda hali buyurtmalar mavjud emas.'
	// 				: '📭 У вас пока нет заказов.'

	// 		await ctx.reply(message)
	// 		return
	// 	}

	// 	let message = user.language === 'uz' ? '📋 Mening buyurtmalarim:\n\n' : '📋 Мои заказы:\n\n'

	// 	orders.forEach((order, index) => {
	// 		const statusText = {
	// 			pending: '⏳ Kutilmoqda',
	// 			searching: '🔍 Qidirilmoqda',
	// 			found: '✅ Topildi',
	// 			cancelled: '❌ Bekor qilingan',
	// 			completed: '✅ Yakunlangan'
	// 		}

	// 		const status =
	// 			user.language === 'uz' ? statusText[order.status] || order.status : order.status

	// 		message += `${index + 1}. ${order.fromRegion} → ${order.toRegion}\n`
	// 		message += `   👥 Yo'lovchilar: ${order.passengerCount} kishi\n`
	// 		message += `   📅 ${new Date(order.createdAt).toLocaleDateString('uz-UZ')}\n`
	// 		message += `   📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n`
	// 		message += `   📊 ${status}\n`
	// 		message += `\n`
	// 	})

	// 	await ctx.reply(message)
	// }

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
				searching: '🔍 Qidirilmoqda',
				selected: '👤 Tanlangan',
				confirmed: '✅ Tasdiqlangan',
				accepted: '✅ Qabul qilingan',
				rejected: '❌ Rad etilgan',
				cancelled: '❌ Bekor qilingan',
				completed: '✅ Yakunlangan'
			}

			const status =
				user.language === 'uz' ? statusText[order.status] || order.status : order.status

			message += `${index + 1}. ${order.fromRegion} → ${order.toRegion}\n`
			message += `   👥 Yo'lovchilar: ${order.passengerCount} kishi\n`
			message += `   📅 ${new Date(order.createdAt).toLocaleDateString('uz-UZ')}\n`
			message += `   📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n`
			message += `   📊 ${status}\n`
			message += `\n`
		})

		await ctx.reply(message)
	}
}

// Yo'lovchi buyurtma yaratish
const createPassengerOrder = async (ctx) => {
	const user = ctx.user
	
	// Session ma'lumotlarini tekshirish
	ctx.session = ctx.session || {}
	if (!ctx.session.orderData) {
		await ctx.reply(
			user.language === 'uz'
				? "❌ Buyurtma ma'lumotlari topilmadi."
				: '❌ Данные заказа не найдены.'
		)
		return
	}
	
	const orderData = ctx.session.orderData
	
	// OrderData tekshirish
	if (!orderData.fromRegion || !orderData.toRegion || !orderData.passengerCount) {
		await ctx.reply(
			user.language === 'uz'
				? "❌ Barcha maydonlar to'ldirilmagan."
				: '❌ Не все поля заполнены.'
		)
		return
	}
	
	// Buyurtmani yaratish va haydovchilarni qidirish
	await createOrderAndFindDrivers(ctx, orderData)
	
	// Sessionni tozalash
	delete ctx.session.orderData
}