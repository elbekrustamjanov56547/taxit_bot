const Order = require('../models/Order')
const Driver = require('../models/Driver')
const User = require('../models/User')
const states = require('../utils/states')
const keyboards = require('../keyboards/main')
const regionKeyboards = require('../keyboards/regions')
const { getPaginationKeyboard, paginateDrivers } = require('../utils/pagination')

module.exports = {
	// ============ BUYURTMA BOSHLASH ============
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

	// ============ CHIQISH VILOYATINI TANLASH ============
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

	// ============ KIRISH VILOYATINI TANLASH ============
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

	// ============ YO'LOVCHILAR SONINI TANLASH ============
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

	// ============ POCHTA TANLASH ============
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
			await this.createOrder(ctx)
		}
	},

	// ============ POCHTA TAVSIFINI SAQLASH ============
	saveParcelDescription: async (ctx, text) => {
		const user = ctx.user

		// Session ga saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.parcelDescription = text

		await this.createOrder(ctx)
	},

	// ============ BUYURTMA YARATISH ============
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
			// Yangi buyurtma yaratish - statusni 'searching' qilib o'rnatamiz
			const order = new Order({
				userId: user.telegramId,
				username: user.username,
				fromRegion: fromRegion,
				toRegion: toRegion,
				passengerCount: passengerCount,
				hasParcel: orderData.hasParcel || false,
				parcelDescription: orderData.parcelDescription || '',
				comment: '',
				status: 'searching',
				createdAt: new Date()
			})

			await order.save()

			// Session ga order id ni saqlash
			ctx.session.orderId = order._id
			ctx.session.orderPage = 1 // Sahifa raqami

			// Tasdiqlash oynasini ko'rsatish
			await this.showConfirmation(ctx, order)
		} catch (error) {
			console.error('Order creation error:', error)

			const message =
				user.language === 'uz'
					? "❌ Buyurtma yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
					: '❌ Ошибка при создании заказа. Пожалуйста, попробуйте еще раз.'

			await ctx.reply(message)
		}
	},

	// ============ TASDIQLASH OYNASINI KO'RSATISH ============
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

	// ============ BUYURTMA TASDIQLASH ============
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
			await this.searchDrivers(ctx, order, 1)
		} catch (error) {
			console.error('Confirm order error:', error)

			const message =
				user.language === 'uz'
					? "❌ Buyurtmani tasdiqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
					: '❌ Ошибка при подтверждении заказа. Пожалуйста, попробуйте еще раз.'

			await ctx.reply(message)
		}
	},

	// ============ HAYDOVCHI QIDIRISH (YO'LOVCHILAR SONI HISOBGA OLINADI) ============
	searchDrivers: async (ctx, order, page = 1) => {
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
			// Sahifalash
			const pagination = paginateDrivers(drivers, page, 5)

			// Haydovchilarni ko'rsatish (sahifalangan)
			await this.showFoundDrivers(ctx, pagination, order)
		} else {
			// Haydovchi topilmadi
			order.status = 'cancelled'
			await order.save()

			// Kanalga yuborish
			await this.sendToChannel(ctx, order)

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

	// ============ TOPILGAN HAYDOVCHILARNI KO'RSATISH (SAHIFALASH BILAN) ============
	showFoundDrivers: async (ctx, pagination, order) => {
		const user = ctx.user
		const { drivers, currentPage, totalPages, totalDrivers, startIndex, endIndex } = pagination

		// Sahifa navigatsiyasi tugmalari
		const paginationKeyboard = getPaginationKeyboard(
			currentPage,
			totalPages,
			order._id,
			user.language,
			'driver_page'
		)

		// Buyurtma ma'lumotlari
		const orderMessage =
			user.language === 'uz'
				? `✅ Buyurtma qabul qilindi!\n\n` +
				  `📍 Chiqish: ${order.fromRegion}\n` +
				  `📍 Kirish: ${order.toRegion}\n` +
				  `👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
				  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n\n` : '\n'}` +
				  `📊 Sahifa: ${currentPage}/${totalPages} (${totalDrivers} ta haydovchi)\n` +
				  `✅ Topilgan haydovchilar (${startIndex}-${endIndex}):\n\n`
				: `✅ Заказ принят!\n\n` +
				  `📍 Отправление: ${order.fromRegion}\n` +
				  `📍 Прибытие: ${order.toRegion}\n` +
				  `👥 Количество пассажиров: ${order.passengerCount} человек\n` +
				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
				  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n\n` : '\n'}` +
				  `📊 Страница: ${currentPage}/${totalPages} (${totalDrivers} водителей)\n` +
				  `✅ Найденные водители (${startIndex}-${endIndex}):\n\n`

		// Inline keyboard yaratish
		const inlineKeyboard = []

		// Har bir haydovchi uchun tugma
		drivers.forEach((driver, index) => {
			// Mashina modeli olish
			let carModelName = driver.carModel || 'Mashina'
			let carModelEmoji = '🚗'

			// Agar carModel object bo'lsa
			if (driver.carModel && typeof driver.carModel === 'object') {
				carModelName = user.language === 'uz' ? driver.carModel.name : driver.carModel.nameRu
				carModelEmoji = driver.carModel.emoji || '🚗'
			}

			// Tugma matni
			const buttonText =
				user.language === 'uz'
					? `${carModelEmoji} ${driver.fullName} (${carModelName})`
					: `${carModelEmoji} ${driver.fullName} (${carModelName})`

			inlineKeyboard.push([
				{
					text: buttonText,
					callback_data: `select_driver_${driver._id}_${order._id}`
				}
			])
		})

		// Sahifa navigatsiyasi tugmalari
		if (paginationKeyboard.length > 0) {
			inlineKeyboard.push(paginationKeyboard)
		}

		// Asosiy menyu tugmasi
		inlineKeyboard.push([
			{
				text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
				callback_data: 'main_menu'
			}
		])

		// Xabarni yuborish
		await ctx.reply(orderMessage, {
			reply_markup: {
				inline_keyboard: inlineKeyboard
			},
			parse_mode: 'HTML'
		})

		// Asosiy menyuga qaytish
		user.state = states.MAIN_MENU
		await user.save()

		// Sessionda sahifani saqlash
		ctx.session.orderPage = currentPage
	},

	// ============ SAHIFA NAVIGATSIYASI HANDLERI ============
	handleDriverPage: async (ctx, callbackData) => {
		const user = ctx.user
		const parts = callbackData.split('_')
		const orderId = parts[2]
		const page = parseInt(parts[3])

		try {
			const order = await Order.findById(orderId)

			if (!order) {
				await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
				return
			}

			// Yangi sahifani ko'rsatish
			await this.searchDrivers(ctx, order, page)

			// Callback query ni javoblash
			await ctx.answerCbQuery()
		} catch (error) {
			console.error('Page navigation error:', error)
			await ctx.answerCbQuery(
				user.language === 'uz' ? '❌ Xatolik yuz berdi' : '❌ Произошла ошибка'
			)
		}
	},

	// ============ HAYDOVCHI TANLASH ============
	// handleDriverSelection: async (ctx, driverId, orderId) => {
	// 	const user = ctx.user

	// 	try {
	// 		console.log(`🚕 handleDriverSelection: driverId=${driverId}, orderId=${orderId}`)

	// 		const driver = await Driver.findById(driverId).populate('carModel').populate('carType')
	// 		const order = await Order.findById(orderId)

	// 		if (!driver || !order) {
	// 			await ctx.reply(
	// 				user.language === 'uz' ? "❌ Ma'lumotlar topilmadi." : '❌ Данные не найдены.'
	// 			)
	// 			return
	// 		}

	// 		// Order statusini yangilash
	// 		order.driverId = driver._id
	// 		order.status = 'selected'
	// 		await order.save()

	// 		// Yo'lovchiga haydovchi ma'lumotlarini ko'rsatish
	// 		const carModelName =
	// 			driver.carModel && typeof driver.carModel === 'object'
	// 				? user.language === 'uz'
	// 					? driver.carModel.name
	// 					: driver.carModel.nameRu
	// 				: driver.carModel

	// 		const carTypeName = driver.carType
	// 			? user.language === 'uz'
	// 				? driver.carType.name
	// 				: driver.carType.nameRu
	// 			: ''

	// 		const driverInfoMessage =
	// 			user.language === 'uz'
	// 				? `✅ Haydovchi tanlandi!\n\n` +
	// 				  `👤 Ism: ${driver.fullName}\n` +
	// 				  `🚗 Mashina: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
	// 				  `👥 Sig'im: ${driver.maxPassengers} kishi\n` +
	// 				  `📞 Telefon: ${driver.phone}\n` +
	// 				  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
	// 				  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
	// 				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
	// 				  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n\n` : '\n'}` +
	// 				  `Haydovchi bilan bog'laning va jo'nash vaqtini kelishing.`
	// 				: `✅ Водитель выбран!\n\n` +
	// 				  `👤 Имя: ${driver.fullName}\n` +
	// 				  `🚗 Машина: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
	// 				  `👥 Вместимость: ${driver.maxPassengers} человек\n` +
	// 				  `📞 Телефон: ${driver.phone}\n` +
	// 				  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
	// 				  `👥 Пассажиры: ${order.passengerCount} человек\n` +
	// 				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
	// 				  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n\n` : '\n'}` +
	// 				  `Свяжитесь с водителем и договоритесь о времени отправления.`

	// 		const passengerKeyboard = {
	// 			inline_keyboard: [
	// 				[
	// 					{
	// 						text: user.language === 'uz' ? '✅ Buyurtma berish' : '✅ Подтвердить заказ',
	// 						callback_data: `confirm_order_${order._id}`
	// 					}
	// 				],
	// 				[
	// 					{
	// 						text: user.language === 'uz' ? '❌ Bekor qilish' : '❌ Отменить',
	// 						callback_data: `cancel_order_${order._id}`
	// 					}
	// 				]
	// 			]
	// 		}

	// 		await ctx.reply(driverInfoMessage, {
	// 			reply_markup: passengerKeyboard,
	// 			parse_mode: 'HTML'
	// 		})
	// 	} catch (error) {
	// 		console.error('Select driver error:', error)
	// 		await ctx.reply(
	// 			user.language === 'uz'
	// 				? '❌ Haydovchi tanlashda xatolik yuz berdi.'
	// 				: '❌ Ошибка при выборе водителя.'
	// 		)
	// 	}
	// },

	handleDriverSelection: async (ctx, driverId, orderId) => {
		const user = ctx.user

		try {
			console.log(`🚕 handleDriverSelection: driverId=${driverId}, orderId=${orderId}`)

			const driver = await Driver.findById(driverId).populate('carModel').populate('carType')
			const order = await Order.findById(orderId)

			if (!driver || !order) {
				await ctx.reply(
					user.language === 'uz' ? "❌ Ma'lumotlar topilmadi." : '❌ Данные не найдены.'
				)
				return
			}

			// Order statusini yangilash
			order.driverId = driver._id
			order.status = 'selected'
			await order.save()

			// Yo'lovchiga haydovchi ma'lumotlarini ko'rsatish
			const carModelName =
				driver.carModel && typeof driver.carModel === 'object'
					? user.language === 'uz'
						? driver.carModel.name
						: driver.carModel.nameRu
					: driver.carModel

			const carTypeName = driver.carType
				? user.language === 'uz'
					? driver.carType.name
					: driver.carType.nameRu
				: ''

			const driverInfoMessage =
				user.language === 'uz'
					? `✅ Haydovchi tanlandi!\n\n` +
					  `👤 Ism: ${driver.fullName}\n` +
					  `🚗 Mashina: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
					  `👥 Sig'im: ${driver.maxPassengers} kishi\n` +
					  `📞 Telefon: ${driver.phone}\n` +
					  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
					  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
					  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n\n` : '\n'}` +
					  `Haydovchi bilan bog'laning va jo'nash vaqtini kelishing.`
					: `✅ Водитель выбран!\n\n` +
					  `👤 Имя: ${driver.fullName}\n` +
					  `🚗 Машина: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
					  `👥 Вместимость: ${driver.maxPassengers} человек\n` +
					  `📞 Телефон: ${driver.phone}\n` +
					  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 Пассажиры: ${order.passengerCount} человек\n` +
					  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
					  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n\n` : '\n'}` +
					  `Свяжитесь с водителем и договоритесь о времени отправления.`

			const passengerKeyboard = {
				inline_keyboard: [
					[
						{
							text: user.language === 'uz' ? '✅ Buyurtma berish' : '✅ Подтвердить заказ',
							callback_data: `confirm_order_${order._id}`
						}
					],
					[
						{
							text: user.language === 'uz' ? '❌ Bekor qilish' : '❌ Отменить',
							callback_data: `cancel_order_${order._id}`
						}
					]
				]
			}

			await ctx.reply(driverInfoMessage, {
				reply_markup: passengerKeyboard,
				parse_mode: 'HTML'
			})
		} catch (error) {
			console.error('Select driver error:', error)
			await ctx.reply(
				user.language === 'uz'
					? '❌ Haydovchi tanlashda xatolik yuz berdi.'
					: '❌ Ошибка при выборе водителя.'
			)
		}
	},

	// ============ KANALGA YUBORISH (YO'LOVCHILAR SONI BILAN) ============
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

	// ============ BUYURTMA BEKOR QILISH ============
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

	// ============ MENING BUYURTMALARIM (SAHIFALASH BILAN) ============
	// showMyOrders: async ctx => {
	// 	const user = ctx.user

	// 	try {
	// 		// Sahifa raqami (default 1)
	// 		const page = parseInt(ctx.session?.myOrdersPage) || 1
	// 		const limit = 5 // Har sahifada 5 ta buyurtma
	// 		const skip = (page - 1) * limit

	// 		// Jami buyurtmalar soni
	// 		const totalOrders = await Order.countDocuments({ userId: user.telegramId })
	// 		const totalPages = Math.ceil(totalOrders / limit)

	// 		// Buyurtmalarni olish
	// 		const orders = await Order.find({ userId: user.telegramId })
	// 			.sort({ createdAt: -1 })
	// 			.skip(skip)
	// 			.limit(limit)
	// 			.populate('driverId')

	// 		if (orders.length === 0) {
	// 			await ctx.reply(
	// 				user.language === 'uz'
	// 					? '📭 Sizda hali buyurtmalar mavjud emas.'
	// 					: '📭 У вас пока нет заказов.'
	// 			)
	// 			return
	// 		}

	// 		// Xabar matni
	// 		let message =
	// 			user.language === 'uz'
	// 				? `📋 Mening buyurtmalarim (${page}/${totalPages} sahifa)\n\n`
	// 				: `📋 Мои заказы (${page}/${totalPages} страница)\n\n`

	// 		orders.forEach((order, index) => {
	// 			const statusText = {
	// 				searching: '🔍 Qidirilmoqda',
	// 				selected: '👤 Tanlangan',
	// 				confirmed: '✅ Tasdiqlangan',
	// 				accepted: '✅ Qabul qilingan',
	// 				rejected: '❌ Rad etilgan',
	// 				cancelled: '❌ Bekor qilingan',
	// 				completed: '✅ Yakunlangan'
	// 			}

	// 			const status =
	// 				user.language === 'uz' ? statusText[order.status] || order.status : order.status

	// 			const driverName = order.driverId ? order.driverId.fullName : 'Tanlanmagan'
	// 			const orderNumber = skip + index + 1

	// 			message += `${orderNumber}. ${order.fromRegion} → ${order.toRegion}\n`
	// 			message += `   👥 ${order.passengerCount} kishi\n`
	// 			message += `   🚗 ${driverName}\n`
	// 			message += `   📅 ${new Date(order.createdAt).toLocaleDateString('uz-UZ')}\n`
	// 			message += `   📊 ${status}\n\n`
	// 		})

	// 		message +=
	// 			user.language === 'uz'
	// 				? `📊 Jami: ${totalOrders} ta buyurtma`
	// 				: `📊 Всего: ${totalOrders} заказов`

	// 		// Inline keyboard (sahifa navigatsiyasi)
	// 		const inlineKeyboard = []

	// 		// Sahifa navigatsiyasi
	// 		if (totalPages > 1) {
	// 			const paginationButtons = []

	// 			if (page > 1) {
	// 				paginationButtons.push({
	// 					text: user.language === 'uz' ? '⬅️ Oldingi' : '⬅️ Назад',
	// 					callback_data: `myorders_page_${page - 1}`
	// 				})
	// 			}

	// 			paginationButtons.push({
	// 				text: user.language === 'uz' ? `📄 ${page}/${totalPages}` : `📄 ${page}/${totalPages}`,
	// 				callback_data: 'current_page'
	// 			})

	// 			if (page < totalPages) {
	// 				paginationButtons.push({
	// 					text: user.language === 'uz' ? 'Keyingi ➡️' : 'Далее ➡️',
	// 					callback_data: `myorders_page_${page + 1}`
	// 				})
	// 			}

	// 			inlineKeyboard.push(paginationButtons)
	// 		}

	// 		// Asosiy menyu tugmasi
	// 		inlineKeyboard.push([
	// 			{
	// 				text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
	// 				callback_data: 'main_menu'
	// 			}
	// 		])

	// 		await ctx.reply(message, {
	// 			reply_markup: {
	// 				inline_keyboard: inlineKeyboard
	// 			}
	// 		})

	// 		// Sessionda sahifani saqlash
	// 		ctx.session.myOrdersPage = page
	// 	} catch (error) {
	// 		console.error('Show my orders error:', error)
	// 		await ctx.reply(
	// 			user.language === 'uz'
	// 				? "❌ Buyurtmalarni ko'rsatishda xatolik yuz berdi."
	// 				: '❌ Ошибка при отображении заказов.'
	// 		)
	// 	}
	// },

	showMyOrders: async (ctx, page = 1) => {
		const user = ctx.user

		try {
			// Jami buyurtmalar soni
			const totalOrders = await Order.countDocuments({ userId: user.telegramId })
			const limit = 5 // Har sahifada 5 ta buyurtma
			const totalPages = Math.ceil(totalOrders / limit)
			const skip = (page - 1) * limit

			// Agar sahifa noto'g'ri bo'lsa
			if (page < 1) page = 1
			if (page > totalPages && totalPages > 0) page = totalPages

			// Buyurtmalarni olish
			const orders = await Order.find({ userId: user.telegramId })
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.populate('driverId')

			if (orders.length === 0) {
				await ctx.reply(
					user.language === 'uz'
						? '📭 Sizda hali buyurtmalar mavjud emas.'
						: '📭 У вас пока нет заказов.'
				)
				return
			}

			// Xabar matni
			let message =
				user.language === 'uz'
					? `📋 Mening buyurtmalarim (${page}/${totalPages} sahifa)\n\n`
					: `📋 Мои заказы (${page}/${totalPages} страница)\n\n`

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

				const driverName = order.driverId ? order.driverId.fullName : 'Tanlanmagan'
				const orderNumber = skip + index + 1

				message += `${orderNumber}. ${order.fromRegion} → ${order.toRegion}\n`
				message += `   👥 ${order.passengerCount} kishi\n`
				message += `   🚗 ${driverName}\n`
				message += `   📅 ${new Date(order.createdAt).toLocaleDateString('uz-UZ')}\n`
				message += `   📊 ${status}\n\n`
			})

			message +=
				user.language === 'uz'
					? `📊 Jami: ${totalOrders} ta buyurtma`
					: `📊 Всего: ${totalOrders} заказов`

			// Inline keyboard (sahifa navigatsiyasi)
			const inlineKeyboard = []

			// Sahifa navigatsiyasi
			if (totalPages > 1) {
				const paginationButtons = []

				if (page > 1) {
					paginationButtons.push({
						text: user.language === 'uz' ? '⬅️ Oldingi' : '⬅️ Назад',
						callback_data: `myorders_page_${page - 1}`
					})
				}

				paginationButtons.push({
					text: user.language === 'uz' ? `📄 ${page}/${totalPages}` : `📄 ${page}/${totalPages}`,
					callback_data: 'current_page'
				})

				if (page < totalPages) {
					paginationButtons.push({
						text: user.language === 'uz' ? 'Keyingi ➡️' : 'Далее ➡️',
						callback_data: `myorders_page_${page + 1}`
					})
				}

				inlineKeyboard.push(paginationButtons)
			}

			// Asosiy menyu tugmasi
			inlineKeyboard.push([
				{
					text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
					callback_data: 'main_menu'
				}
			])

			// Avvalgi xabarni o'chirish
			try {
				await ctx.deleteMessage()
			} catch (error) {
				console.log("Oldingi xabarni o'chirishda xatolik:", error.message)
			}

			await ctx.reply(message, {
				reply_markup: {
					inline_keyboard: inlineKeyboard
				}
			})

			// Sessionda sahifani saqlash
			ctx.session.myOrdersPage = page
		} catch (error) {
			console.error('Show my orders error:', error)
			await ctx.reply(
				user.language === 'uz'
					? "❌ Buyurtmalarni ko'rsatishda xatolik yuz berdi."
					: '❌ Ошибка при отображении заказов.'
			)
		}
	},
	// ============ MENING BUYURTMALARIM SAHIFA NAVIGATSIYASI ============
	// handleMyOrdersPage: async (ctx, callbackData) => {
	// 	const user = ctx.user
	// 	const page = parseInt(callbackData.split('_')[2])

	// 	try {
	// 		// Yangi sahifani ko'rsatish
	// 		ctx.session.myOrdersPage = page
	// 		await this.showMyOrders(ctx)

	// 		// Callback query ni javoblash
	// 		await ctx.answerCbQuery()
	// 	} catch (error) {
	// 		console.error('My orders page navigation error:', error)
	// 		await ctx.answerCbQuery(
	// 			user.language === 'uz' ? '❌ Xatolik yuz berdi' : '❌ Произошла ошибка'
	// 		)
	// 	}
	// },

	handleMyOrdersPage: async (ctx, callbackData) => {
		const user = ctx.user
		const page = parseInt(callbackData.split('_')[2])

		try {
			console.log(`📄 My orders page navigation: page=${page}`)

			// Yangi sahifani ko'rsatish
			await module.exports.showMyOrders(ctx, page)

			// Callback query ni javoblash
			await ctx.answerCbQuery()
		} catch (error) {
			console.error('My orders page navigation error:', error)
			await ctx.answerCbQuery(
				user.language === 'uz' ? '❌ Xatolik yuz berdi' : '❌ Произошла ошибка'
			)
		}
	},

	// ============ BUYURTMA TASDIQLASH (CALLBACK VERSIYASI) ============
	confirmOrderCallback: async (ctx, callbackData) => {
		const user = ctx.user
		const orderId = callbackData.split('_')[2]

		try {
			const order = await Order.findById(orderId).populate('driverId')

			if (!order) {
				await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
				return
			}

			if (order.userId !== user.telegramId) {
				await ctx.reply(
					user.language === 'uz'
						? '❌ Siz bu buyurtmani tasdiqlay olmaysiz.'
						: '❌ Вы не можете подтвердить этот заказ.'
				)
				return
			}

			order.status = 'confirmed'
			await order.save()

			await ctx.reply(
				user.language === 'uz'
					? "✅ Buyurtma rasmiy tasdiqlandi! Haydovchi bilan bog'laning."
					: '✅ Заказ официально подтвержден! Свяжитесь с водителем.'
			)

			if (order.driverId) {
				await ctx.telegram.sendMessage(
					order.driverId.telegramId,
					user.language === 'uz'
						? "✅ Yo'lovchi buyurtmani tasdiqladi! Endi siz jo'nash vaqtini kelishingiz mumkin."
						: '✅ Пассажир подтвердил заказ! Теперь вы можете договориться о времени отправления.'
				)
			}
		} catch (error) {
			console.error('Confirm order error:', error)
			await ctx.reply(
				user.language === 'uz'
					? '❌ Buyurtma tasdiqlashda xatolik yuz berdi.'
					: '❌ Ошибка при подтверждении заказа.'
			)
		}
	},

	// ============ HAYDOVCHI BUYURTMANI QABUL QILISHI ============
	driverAcceptOrder: async (ctx, callbackData) => {
		const user = ctx.user
		const orderId = callbackData.split('_')[2]

		try {
			const order = await Order.findById(orderId).populate('driverId')

			if (!order) {
				await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
				return
			}

			if (!order.driverId || order.driverId.telegramId !== user.telegramId) {
				await ctx.reply(
					user.language === 'uz'
						? '❌ Siz bu buyurtmani qabul qila olmaysiz.'
						: '❌ Вы не можете принять этот заказ.'
				)
				return
			}

			order.status = 'accepted'
			await order.save()

			order.driverId.totalOrders = (order.driverId.totalOrders || 0) + 1
			await order.driverId.save()

			await ctx.reply(
				user.language === 'uz'
					? "✅ Buyurtmani qabul qildingiz! Yo'lovchi bilan bog'laning."
					: '✅ Вы приняли заказ! Свяжитесь с пассажиром.'
			)

			await ctx.telegram.sendMessage(
				order.userId,
				user.language === 'uz'
					? "✅ Haydovchi buyurtmangizni qabul qildi! Tez orada siz bilan bog'lanadi."
					: '✅ Водитель принял ваш заказ! Скоро свяжется с вами.'
			)
		} catch (error) {
			console.error('Driver accept order error:', error)
			await ctx.reply(
				user.language === 'uz'
					? '❌ Buyurtma qabul qilishda xatolik yuz berdi.'
					: '❌ Ошибка при принятии заказа.'
			)
		}
	},

	// ============ HAYDOVCHI BUYURTMANI RAD ETISHI ============
	driverRejectOrder: async (ctx, callbackData) => {
		const user = ctx.user
		const orderId = callbackData.split('_')[2]

		try {
			const order = await Order.findById(orderId).populate('driverId')

			if (!order) {
				await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
				return
			}

			if (!order.driverId || order.driverId.telegramId !== user.telegramId) {
				await ctx.reply(
					user.language === 'uz'
						? '❌ Siz bu buyurtmani rad eta olmaysiz.'
						: '❌ Вы не можете отклонить этот заказ.'
				)
				return
			}

			order.status = 'rejected'
			order.driverId = null
			await order.save()

			await ctx.reply(
				user.language === 'uz' ? '❌ Buyurtmani rad etdingiz.' : '❌ Вы отклонили заказ.'
			)

			await ctx.telegram.sendMessage(
				order.userId,
				user.language === 'uz'
					? '❌ Haydovchi buyurtmangizni rad etdi. Boshqa haydovchi tanlang.'
					: '❌ Водитель отклонил ваш заказ. Выберите другого водителя.'
			)

			// Qaytadan haydovchi qidirish (oldingi sahifaga qaytish)
			if (ctx.session.orderPage) {
				setTimeout(async () => {
					await this.searchDrivers(ctx, order, ctx.session.orderPage)
				}, 1000)
			}
		} catch (error) {
			console.error('Driver reject order error:', error)
			await ctx.reply(
				user.language === 'uz'
					? '❌ Buyurtma rad etishda xatolik yuz berdi.'
					: '❌ Ошибка при отклонении заказа.'
			)
		}
	}
}
