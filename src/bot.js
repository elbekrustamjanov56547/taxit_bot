require('dotenv').config()
const { Telegraf, session } = require('telegraf')
const mongoose = require('mongoose')
const cron = require('node-cron')
const startHandler = require('./handlers/start')
const passengerHandler = require('./handlers/passenger')
const driverHandler = require('./handlers/driver')
const adminHandler = require('./handlers/admin')
const express = require('express')

// Import models
const User = require('./models/User')
const Driver = require('./models/Driver')
const Order = require('./models/Order')

// Import keyboards
const keyboards = require('./keyboards/main')

// Import states
const states = require('./utils/states')

// Express app yaratish
const app = express()
const PORT = process.env.PORT || 5000

// JSON parserni o'rnatish
app.use(express.json())

// Bot yaratish
const bot = new Telegraf(process.env.BOT_TOKEN)

// Webhook endpoint
app.post(`/webhook/${process.env.BOT_TOKEN}`, async (req, res) => {
	try {
		await bot.handleUpdate(req.body, res)
	} catch (error) {
		console.error('Webhook error:', error)
		res.status(500).send('Internal Server Error')
	}
})

// Health check endpoint
app.get('/ping', (req, res) => {
	res.send('pong')
})

// Database ulanish
mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => console.log('MongoDB connected'))
	.catch(err => console.error('MongoDB connection error:', err))

// Admin ID larini olish
const ADMIN_IDS = process.env.ADMIN_IDS
	? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()))
	: []

// Middleware: Foydalanuvchini tekshirish
bot.use(
	session({
		defaultSession: () => ({
			driverData: {},
			orderId: null,
			tempData: {},
			adminAction: null,
			adminDriverId: null
		})
	})
)

bot.use(async (ctx, next) => {
	try {
		const userId = ctx.from?.id
		if (!userId) return next()

		// Foydalanuvchi mavjudligini tekshirish
		let user = await User.findOne({ telegramId: userId })

		if (!user) {
			// Yangi foydalanuvchi yaratish - language va role bo'sh qoldiramiz
			user = new User({
				telegramId: userId,
				username: ctx.from.username || '',
				firstName: ctx.from.first_name || '',
				lastName: ctx.from.last_name || '',
				language: '', // Bo'sh qoldiriladi
				role: 'none', // Bo'sh string
				state: states.START,
				lastActivity: new Date()
			})
			await user.save()
		} else {
			// Faollikni yangilash
			user.lastActivity = new Date()
			await user.save()
		}

		// Admin ekanligini tekshirish
		const isAdmin = ADMIN_IDS.includes(user.telegramId)
		ctx.user = user
		ctx.user.isAdmin = isAdmin

		// Sessionni tekshirish
		if (!ctx.session) {
			ctx.session = {
				driverData: {},
				orderId: null,
				tempData: {},
				adminAction: null,
				adminDriverId: null
			}
		}

		// Oldingi xabarni o'chirish (callback bo'lsa)
		if (ctx.callbackQuery) {
			try {
				await ctx.deleteMessage()
			} catch (e) {
				console.log("Xabarni o`chirishda xatolik:", e.message)
			}
		}

		await next()
	} catch (error) {
		console.error('Middleware error:', error)
	}
})

// /start command
bot.start(async ctx => {
	await startHandler.startHandler(ctx)
})

// Callback query handler
// bot.on('callback_query', async ctx => {
// 	try {
// 		const callbackData = ctx.callbackQuery.data
// 		const user = ctx.user

// 		console.log('Callback received:', callbackData)

// 		// Callback javobini darhol berish
// 		await ctx.answerCbQuery()

// 		// index.js faylida callback query handler qismini yangilang:

// 		// ============ BUYURTMA CALLBACKS ============
// 		// if (callbackData.startsWith('select_driver_')) {
// 		// 	await orderHandler.handleDriverSelection(ctx, callbackData)
// 		// } else if (callbackData.startsWith('confirm_order_')) {
// 		// 	await orderHandler.confirmOrder(ctx, callbackData)
// 		// } else if (callbackData.startsWith('cancel_order_')) {
// 		// 	await orderHandler.cancelOrder(ctx, callbackData)
// 		// } else if (callbackData.startsWith('driver_accept_')) {
// 		// 	await orderHandler.driverAcceptOrder(ctx, callbackData)
// 		// } else if (callbackData.startsWith('driver_reject_')) {
// 		// 	await orderHandler.driverRejectOrder(ctx, callbackData)
// 		// }

// 		// index.js faylida callback query handler qismiga qo'shing:

// 		// ============ HAYDOVCHI TANLASH CALLBACK ============
// 		// index.js faylida BU QISMLARNI O'CHIRING YO'KI COMMENTGA OLING:

// 		// ============ HAYDOVCHI TANLASH CALLBACK ============

// 		// Index.js fayliga qo'shing:

// 		// ============ ISH VAQTI CALLBACKS ============
// 		// Index.js faylida callback query handler qismini tekshiramiz:
// 		if (callbackData.startsWith('work_')) {
// 			console.log('🕒 Work callback detected:', callbackData)

// 			try {
// 				await driverHandler.selectWorkHoursCallback(ctx, callbackData)
// 			} catch (error) {
// 				console.error('❌ Work hours callback error:', error)
// 				console.error('❌ Error stack:', error.stack)
// 			}
// 			return
// 		}

// 		// ============ TEXT HANDLERDA ISH VAQTI ============
// 		// Text message handler qismiga qo'shing:

// 		if (callbackData.startsWith('select_driver_')) {
// 			const parts = callbackData.split('_')
// 			const driverId = parts[2]
// 			const orderId = parts[3]

// 			// Driver ma'lumotlarini olish
// 			const driver = await Driver.findById(driverId).populate('carModel').populate('carType')

// 			// Order ma'lumotlarini olish
// 			const order = await Order.findById(orderId)

// 			if (!driver || !order) {
// 				await ctx.reply(
// 					user.language === 'uz' ? "❌ Ma'lumotlar topilmadi" : '❌ Данные не найдены'
// 				)
// 				return
// 			}

// 			// Order statusini yangilash
// 			order.driverId = driver._id
// 			order.status = 'selected'
// 			await order.save()

// 			// ============ HAYDOVCHI MA'LUMOTLARI XABARI ============
// 			const carModelName =
// 				driver.carModel && typeof driver.carModel === 'object'
// 					? user.language === 'uz'
// 						? driver.carModel.name
// 						: driver.carModel.nameRu
// 					: driver.carModel

// 			const carTypeName = driver.carType
// 				? user.language === 'uz'
// 					? driver.carType.name
// 					: driver.carType.nameRu
// 				: ''

// 			const driverInfoMessage =
// 				user.language === 'uz'
// 					? `✅ Haydovchi tanlandi!\n\n` +
// 					  `👤 Ism: ${driver.fullName}\n` +
// 					  `🚗 Mashina: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
// 					  `👥 Sig'im: ${driver.maxPassengers} kishi\n` +
// 					  `📞 Telefon: ${driver.phone}\n` +
// 					  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
// 					  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
// 					  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
// 					  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n\n` : '\n'}` +
// 					  `Haydovchi bilan bog'laning va jo'nash vaqtini kelishing.`
// 					: `✅ Водитель выбран!\n\n` +
// 					  `👤 Имя: ${driver.fullName}\n` +
// 					  `🚗 Машина: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
// 					  `👥 Вместимость: ${driver.maxPassengers} человек\n` +
// 					  `📞 Телефон: ${driver.phone}\n` +
// 					  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
// 					  `👥 Пассажиры: ${order.passengerCount} человек\n` +
// 					  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
// 					  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n\n` : '\n'}` +
// 					  `Свяжитесь с водителем и договоритесь о времени отправления.`

// 			// ============ BUYURTMA BERISH TUGMASI ============
// 			const passengerKeyboard = {
// 				inline_keyboard: [
// 					[
// 						{
// 							text: user.language === 'uz' ? '✅ Buyurtma berish' : '✅ Подтвердить заказ',
// 							callback_data: `confirm_order_${order._id}`
// 						}
// 					],
// 					[
// 						{
// 							text: user.language === 'uz' ? '❌ Bekor qilish' : '❌ Отменить',
// 							callback_data: `cancel_order_${order._id}`
// 						}
// 					]
// 				]
// 			}

// 			await ctx.reply(driverInfoMessage, {
// 				reply_markup: passengerKeyboard,
// 				parse_mode: 'HTML'
// 			})

// 			// ============ HAYDOVCHIGA XABAR YUBORISH ============
// 			// BU QISMNI O'CHIRISH KERAK! Haydovchiga xabar faqat confirm_order'da borishi kerak
// 			/*
//     const orderForDriverMessage =
//         user.language === 'uz'
//             ? `🚖 Sizga yangi buyurtma biriktirildi!\n\n` +
//               `📍 Chiqish: ${order.fromRegion}\n` +
//               `📍 Kirish: ${order.toRegion}\n` +
//               `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
//               `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
//               `📝 Tavsif: ${order.parcelDescription || "Yo'q"}\n\n` +
//               `👤 Yo'lovchi: @${order.username || "Noma'lum"}\n` +
//               `📞 Telefon: Yo'lovchi bilan bog'laning\n\n` +
//               `Buyurtmani qabul qilish uchun yo'lovchi bilan bog'laning.`
//             : `🚖 Вам назначен новый заказ!\n\n` +
//               `📍 Отправление: ${order.fromRegion}\n` +
//               `📍 Прибытие: ${order.toRegion}\n` +
//               `👥 Пассажиры: ${order.passengerCount} человек\n` +
//               `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
//               `📝 Описание: ${order.parcelDescription || 'Нет'}\n\n` +
//               `👤 Пассажир: @${order.username || 'Неизвестно'}\n` +
//               `📞 Телефон: Свяжитесь с пассажиром\n\n` +
//               `Свяжитесь с пассажиром для подтверждения заказа.`

//     const driverKeyboard = {
//         inline_keyboard: [
//             [
//                 {
//                     text: user.language === 'uz' ? '✅ Qabul qilish' : '✅ Принять',
//                     callback_data: `driver_accept_${order._id}`
//                 }
//             ],
//             [
//                 {
//                     text: user.language === 'uz' ? '❌ Rad etish' : '❌ Отклонить',
//                     callback_data: `driver_reject_${order._id}`
//                 }
//             ]
//         ]
//     }

//     await ctx.telegram.sendMessage(driver.telegramId, orderForDriverMessage, {
//         reply_markup: driverKeyboard,
//         parse_mode: 'HTML'
//     })
//     */

// 			return
// 		}
// 		// ============ LANGUAGE SELECTION ============
// 		if (callbackData.startsWith('lang_')) {
// 			await startHandler.handleLanguageSelection(ctx, callbackData)
// 			return
// 		}
// 		// index.js faylida callback query handler qismiga qo'shing:

// 		// ============ SAHIFA NAVIGATSIYASI CALLBACKS ============
// 		if (callbackData.startsWith('driver_page_')) {
// 			const orderHandler = require('./handlers/order')
// 			await orderHandler.handleDriverPage(ctx, callbackData)
// 			return
// 		}

// 		if (callbackData.startsWith('myorders_page_')) {
// 			const orderHandler = require('./handlers/order')
// 			await orderHandler.handleMyOrdersPage(ctx, callbackData)
// 			return
// 		}
// 		// ============ BUYURTMA TASDIQLASH CALLBACK ============
// 		// if (callbackData.startsWith('confirm_order_')) {
// 		// 	const orderId = callbackData.split('_')[2]
// 		// 	const order = await Order.findById(orderId).populate('driverId')

// 		// 	if (!order) {
// 		// 		await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi' : '❌ Заказ не найден')
// 		// 		return
// 		// 	}

// 		// 	// Faqat buyurtma egasi tasdiqlashi mumkin
// 		// 	if (order.userId !== user.telegramId) {
// 		// 		await ctx.reply(
// 		// 			user.language === 'uz'
// 		// 				? '❌ Siz bu buyurtmani tasdiqlay olmaysiz'
// 		// 				: '❌ Вы не можете подтвердить этот заказ'
// 		// 		)
// 		// 		return
// 		// 	}

// 		// 	// Statusni yangilash
// 		// 	order.status = 'confirmed'
// 		// 	await order.save()

// 		// 	// Yo'lovchiga xabar
// 		// 	await ctx.reply(
// 		// 		user.language === 'uz'
// 		// 			? "✅ Buyurtma rasmiy tasdiqlandi! Haydovchi bilan bog'laning."
// 		// 			: '✅ Заказ официально подтвержден! Свяжитесь с водителем.'
// 		// 	)

// 		// 	// Haydovchiga xabar
// 		// 	if (order.driverId) {
// 		// 		await ctx.telegram.sendMessage(
// 		// 			order.driverId.telegramId,
// 		// 			user.language === 'uz'
// 		// 				? "✅ Yo'lovchi buyurtmani tasdiqladi! Endi siz jo'nash vaqtini kelishingiz mumkin."
// 		// 				: '✅ Пассажир подтвердил заказ! Теперь вы можете договориться о времени отправления.'
// 		// 		)
// 		// 	}

// 		// 	return
// 		// }

// 		// ============ BUYURTMA TASDIQLASH CALLBACK ============
// 		if (callbackData.startsWith('confirm_order_')) {
// 			const orderId = callbackData.split('_')[2]
// 			const order = await Order.findById(orderId).populate('driverId')

// 			if (!order) {
// 				await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi' : '❌ Заказ не найден')
// 				return
// 			}

// 			// Faqat buyurtma egasi tasdiqlashi mumkin
// 			if (order.userId !== user.telegramId) {
// 				await ctx.reply(
// 					user.language === 'uz'
// 						? '❌ Siz bu buyurtmani tasdiqlay olmaysiz'
// 						: '❌ Вы не можете подтвердить этот заказ'
// 				)
// 				return
// 			}

// 			// Statusni yangilash
// 			order.status = 'confirmed'
// 			await order.save()

// 			// Yo'lovchiga xabar
// 			await ctx.reply(
// 				user.language === 'uz'
// 					? "✅ Buyurtma rasmiy tasdiqlandi! Haydovchi bilan bog'laning."
// 					: '✅ Заказ официально подтвержден! Свяжитесь с водителем.'
// 			)

// 			// ============ HAYDOVCHIGA XABAR YUBORISH (ENDI BU YERDA) ============
// 			if (order.driverId) {
// 				const orderForDriverMessage =
// 					user.language === 'uz'
// 						? `🚖 Sizga yangi buyurtma biriktirildi!\n\n` +
// 						  `📍 Chiqish: ${order.fromRegion}\n` +
// 						  `📍 Kirish: ${order.toRegion}\n` +
// 						  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
// 						  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
// 						  `📝 Tavsif: ${order.parcelDescription || "Yo'q"}\n\n` +
// 						  `👤 Yo'lovchi: @${order.username || "Noma'lum"}\n` +
// 						  `📞 Telefon: Yo'lovchi bilan bog'laning\n\n` +
// 						  `Buyurtmani qabul qilish uchun yo'lovchi bilan bog'laning.`
// 						: `🚖 Вам назначен новый заказ!\n\n` +
// 						  `📍 Отправление: ${order.fromRegion}\n` +
// 						  `📍 Прибытие: ${order.toRegion}\n` +
// 						  `👥 Пассажиры: ${order.passengerCount} человек\n` +
// 						  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
// 						  `📝 Описание: ${order.parcelDescription || 'Нет'}\n\n` +
// 						  `👤 Пассажир: @${order.username || 'Неизвестно'}\n` +
// 						  `📞 Телефон: Свяжитесь с пассажиром\n\n` +
// 						  `Свяжитесь с пассажиром для подтверждения заказа.`

// 				const driverKeyboard = {
// 					inline_keyboard: [
// 						[
// 							{
// 								text: user.language === 'uz' ? '✅ Qabul qilish' : '✅ Принять',
// 								callback_data: `driver_accept_${order._id}`
// 							}
// 						],
// 						[
// 							{
// 								text: user.language === 'uz' ? '❌ Rad etish' : '❌ Отклонить',
// 								callback_data: `driver_reject_${order._id}`
// 							}
// 						]
// 					]
// 				}

// 				await ctx.telegram.sendMessage(order.driverId.telegramId, orderForDriverMessage, {
// 					reply_markup: driverKeyboard,
// 					parse_mode: 'HTML'
// 				})
// 			}

// 			return
// 		}
// 		// ============ HAYDOVCHI QABUL QILISH CALLBACK ============
// 		if (callbackData.startsWith('driver_accept_')) {
// 			const orderId = callbackData.split('_')[2]
// 			const order = await Order.findById(orderId).populate('driverId')

// 			if (!order) {
// 				await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi' : '❌ Заказ не найден')
// 				return
// 			}

// 			// Faqat haydovchi qabul qilishi mumkin
// 			if (!order.driverId || order.driverId.telegramId !== user.telegramId) {
// 				await ctx.reply(
// 					user.language === 'uz'
// 						? '❌ Siz bu buyurtmani qabul qila olmaysiz'
// 						: '❌ Вы не можете принять этот заказ'
// 				)
// 				return
// 			}

// 			// Statusni yangilash
// 			order.status = 'accepted'
// 			await order.save()

// 			// Haydovchi statistikasini yangilash
// 			order.driverId.totalOrders = (order.driverId.totalOrders || 0) + 1
// 			await order.driverId.save()

// 			// Haydovchiga xabar
// 			// await ctx.reply(
// 			// 	user.language === 'uz'
// 			// 		? `✅ Buyurtmani qabul qildingiz! Yo'lovchi bilan bog'laning
// 			// 		@${order.username || "noma'lum"}
// 			// 		${order.firstName}
// 			// 		`
// 			// 		: `✅ Вы приняли заказ! Свяжитесь с пассажиром
// 			// 			@${order.username || 'неизвестно'}
// 			// 			${order.firstName}
// 			// 		`
// 			// )

// 			await ctx.reply(
// 				user.language === 'uz'
// 					? `✅ Buyurtmani qabul qildingiz!\n\n` +
// 							`👤 Yo'lovchi ma'lumotlari:\n` +
// 							`• Username: @${order.username || "noma'lum"}\n` +
// 							`• Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
// 							`• Yo'lovchilar: ${order.passengerCount} kishi\n\n` +
// 							`📞 Endi yo'lovchi bilan bog'lanishingiz mumkin!`
// 					: `✅ Вы приняли заказ!\n\n` +
// 							`👤 Информация о пассажире:\n` +
// 							`• Username: @${order.username || 'неизвестно'}\n` +
// 							`• Направление: ${order.fromRegion} → ${order.toRegion}\n` +
// 							`• Пассажиры: ${order.passengerCount} человек\n\n` +
// 							`📞 Теперь вы можете связаться с пассажиром!`,
// 				{ parse_mode: 'HTML' }
// 			)

// 			// Yo'lovchiga xabar
// 			await ctx.telegram.sendMessage(
// 				order.userId,
// 				user.language === 'uz'
// 					? `✅ Haydovchi buyurtmangizni qabul qildi!\n\n` +
// 							`👤 Haydovchi: ${order.driverId.fullName}\n` +
// 							`📞 Telefon: ${order.driverId.phone}\n\n` +
// 							`Tez orada siz bilan bog'lanadi`
// 					: `✅ Водитель принял ваш заказ!\n\n` +
// 							`👤 Водитель: ${order.driverId.fullName}\n` +
// 							`📞 Телефон: ${order.driverId.phone}\n\n` +
// 							`Скоро свяжется с вами`
// 			)
// 			return
// 		}

// 		// ============ ROLE SELECTION ============
// 		if (callbackData.startsWith('role_')) {
// 			await startHandler.handleRoleSelection(ctx, callbackData)
// 			return
// 		}

// 		// ============ ADMIN CALLBACKS ============
// 		if (callbackData.startsWith('admin_')) {
// 			// ... admin callback'lar ...
// 			return
// 		}

// 		// ============ PASSENGER FLOW CALLBACKS ============
// 		if (callbackData.startsWith('passengers_')) {
// 			await passengerHandler.selectPassengerCount(ctx, callbackData)
// 			return
// 		}

// 		if (callbackData.startsWith('max_passengers_')) {
// 			if (user.state === states.DRIVER_EDIT_PASSENGERS) {
// 				await driverHandler.saveEditedPassengers(ctx, callbackData)
// 			} else {
// 				await driverHandler.selectMaxPassengers(ctx, callbackData)
// 			}
// 			return
// 		}

// 		// Mashina modelini tanlash
// 		if (callbackData.startsWith('car_select_')) {
// 			if (user.state === states.DRIVER_EDIT_CAR) {
// 				await driverHandler.selectCarCallback(ctx, callbackData)
// 				// Mashina tanlagandan keyin avtomatik sahifaga qaytish
// 				const driver = await Driver.findOne({ telegramId: user.telegramId })
// 				if (driver) {
// 					user.state = states.MAIN_MENU
// 					await user.save()
// 					await driverHandler.showDriverMenu(ctx)
// 				}
// 			} else {
// 				await driverHandler.selectCarCallback(ctx, callbackData)
// 			}
// 			return
// 		}

// 		// Chiqish viloyati
// 		if (callbackData.startsWith('driver_from_')) {
// 			if (user.state === states.DRIVER_EDIT_ROUTE_FROM) {
// 				await driverHandler.saveEditedRouteFrom(ctx, callbackData)
// 			} else {
// 				await driverHandler.selectFromRegion(ctx, callbackData)
// 			}
// 			return
// 		}

// 		// Kirish viloyati
// 		if (callbackData.startsWith('driver_to_')) {
// 			if (user.state === states.DRIVER_EDIT_ROUTE_TO) {
// 				await driverHandler.saveEditedRouteTo(ctx, callbackData)
// 			} else {
// 				await driverHandler.selectToRegion(ctx, callbackData)
// 			}
// 			return
// 		}

// 		// Xizmat turini tanlash
// 		if (callbackData.startsWith('service_')) {
// 			if (user.state === states.DRIVER_EDIT_SERVICES) {
// 				await driverHandler.saveEditedServices(ctx, callbackData)
// 			} else {
// 				await driverHandler.selectServiceType(ctx, callbackData)
// 			}
// 			return
// 		}

// 		// ============ MAIN MENU ============
// 		switch (callbackData) {
// 			case states.DRIVER_REG_WORK_HOURS_CUSTOM:
// 				await driverHandler.saveCustomWorkHours(ctx, text)
// 				break
// 			case 'driver_info':
// 				// Ma'lumotlar
// 				const driver = await Driver.findOne({ telegramId: user.telegramId })

// 				if (driver) {
// 					if (driver.status === 'active') {
// 						await driverHandler.showDriverMenu(ctx)
// 					} else {
// 						await driverHandler.showInactiveDriverMenu(ctx, driver)
// 					}
// 				} else {
// 					// Agar user roli driver bo'lsa, lekin driver profili yo'q
// 					if (user.role === 'driver') {
// 						await ctx.reply(
// 							user.language === 'uz'
// 								? '🚘 Siz haydovchi sifatida tanlangansiz, ammo haydovchi profilingiz hali yaratilmagan yoki topilmadi.\n\nIltimos, ro‘yxatdan o‘tish jarayonini qayta boshlang.'
// 								: '🚘 Вы выбрали роль водителя, однако профиль водителя не был найден.\n\nПожалуйста, пройдите регистрацию заново.'
// 						)
// 					}

// 					// Ro'yxatdan o'tishni boshlash
// 					await driverHandler.startRegistration(ctx)
// 				}
// 				break

// 			case 'driver_payment':
// 				console.log('Driver payment callback triggered')
// 				await driverHandler.handleDriverPayment(ctx)
// 				break

// 			case 'driver_edit':
// 				await driverHandler.showDriverEditMenu(ctx)
// 				break

// 			case 'edit_fullname':
// 				await driverHandler.editFullName(ctx)
// 				break

// 			case 'edit_phone':
// 				await driverHandler.editPhone(ctx)
// 				break

// 			case 'edit_car':
// 				await driverHandler.editCar(ctx)
// 				break

// 			case 'edit_passengers':
// 				await driverHandler.editPassengers(ctx)
// 				break

// 			case 'edit_route':
// 				await driverHandler.editRoute(ctx)
// 				break

// 			case 'edit_services':
// 				await driverHandler.editServices(ctx)
// 				break

// 			case 'edit_time':
// 				await driverHandler.editTime(ctx)
// 				break

// 			case 'main_menu':
// 				// Asosiy menyuga qaytish
// 				try {
// 					await ctx.deleteMessage()
// 				} catch (error) {
// 					console.log('Delete message for main_menu error:', error.message)
// 				}

// 				await ctx.reply(
// 					user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
// 					keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role)
// 				)
// 				user.state = states.MAIN_MENU
// 				await user.save()
// 				break

// 			case 'close_menu':
// 				// Menyuni yopish - faqat xabarni o'chirish
// 				try {
// 					await ctx.deleteMessage()
// 				} catch (error) {
// 					console.log('Delete message error:', error.message)
// 				}
// 				break

// 			case 'need_taxi':
// 				await passengerHandler.startOrder(ctx)
// 				break

// 			case 'taxi_service':
// 				// Agar user roli driver bo'lsa, lekin driver profili yo'q
// 				if (user.role === 'driver') {
// 					const existingDriver = await Driver.findOne({ telegramId: user.telegramId })

// 					if (existingDriver) {
// 						if (existingDriver.status === 'active') {
// 							await driverHandler.showDriverMenu(ctx)
// 						} else {
// 							await driverHandler.showInactiveDriverMenu(ctx, existingDriver)
// 						}
// 					} else {
// 						await ctx.reply(
// 							user.language === 'uz'
// 								? '🚘 Haydovchi profilingiz topilmadi.\n\nKeling, ro‘yxatdan o‘tishni boshlaymiz.'
// 								: '🚘 Профиль водителя не найден.\n\nДавайте начнём регистрацию.'
// 						)

// 						await driverHandler.startRegistration(ctx)
// 					}
// 				} else {
// 					// Oddiy ro'yxatdan o'tish
// 					await driverHandler.startRegistration(ctx)
// 				}
// 				break

// 			case 'my_orders':
// 				await passengerHandler.showMyOrders(ctx)
// 				break

// 			case 'confirm':
// 				if (user.state === states.DRIVER_REG_CONFIRM) {
// 					await driverHandler.saveProfile(ctx)
// 				} else if (user.state === states.PASSENGER_CONFIRM) {
// 					await passengerHandler.confirmOrder(ctx)
// 				}
// 				break

// 			case 'cancel':
// 				if (user.state === states.DRIVER_REG_CONFIRM) {
// 					await ctx.reply('❌ Bekor qilindi')
// 					user.state = states.MAIN_MENU
// 					await user.save()
// 					await ctx.reply(
// 						'🏠 Asosiy menyu',
// 						keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role)
// 					)
// 				} else if (user.state === states.PASSENGER_CONFIRM) {
// 					await passengerHandler.cancelOrder(ctx)
// 				}
// 				break

// 			default:
// 				// ============ PASSENGER FLOW ============
// 				if (callbackData.startsWith('from_') && !callbackData.startsWith('driver_')) {
// 					await passengerHandler.selectFromRegion(ctx, callbackData)
// 				} else if (callbackData.startsWith('to_') && !callbackData.startsWith('driver_')) {
// 					await passengerHandler.selectToRegion(ctx, callbackData)
// 				} else if (callbackData.startsWith('parcel_')) {
// 					await passengerHandler.selectParcel(ctx, callbackData)
// 				}
// 				// ============ DRIVER FLOW ============
// 				// Mashina turini tanlash
// 				else if (callbackData.startsWith('car_type_')) {
// 					await driverHandler.selectCarTypeCallback(ctx, callbackData)
// 				}
// 				// ============ DATE & TIME ============
// 				else if (callbackData.startsWith('date_')) {
// 					await driverHandler.selectDate(ctx, callbackData)
// 				}
// 				// Vaqt tanlash
// 				else if (callbackData.startsWith('time_')) {
// 					await driverHandler.selectTime(ctx, callbackData)
// 				}
// 				// ============ GENERAL ============
// 				else if (callbackData === 'add_comment') {
// 					await passengerHandler.addComment(ctx)
// 				} else if (callbackData === 'skip_comment') {
// 					await passengerHandler.skipComment(ctx)
// 				}
// 				break
// 		}
// 	} catch (error) {
// 		console.error('Callback error:', error)
// 		console.error('Error details:', error.stack)
// 		try {
// 			await ctx.answerCbQuery('❌ Xatolik yuz berdi')
// 		} catch (e) {
// 			console.error('Answer callback error:', e)
// 		}
// 	}
// })

// index.js faylida callback query handler qismini yangilang:

bot.on('callback_query', async ctx => {
    try {
			const callbackData = ctx.callbackQuery.data
			const user = ctx.user

			console.log('📞 Callback received:', callbackData)

			// index.js faylida callback query handler qismiga qo'shing:

			// index.js yoki asosiy handler faylida:
			if (user.state === states.DRIVER_REG_TIME_INPUT) {
				console.log('⏰ DRIVER_REG_TIME_INPUT state detected')
				await driverHandler.saveTimeInput(ctx, text)
				return
			}
			if (user.state === states.DRIVER_REG_WORK_HOURS_CUSTOM) {
				console.log('🕒 DRIVER_REG_WORK_HOURS_CUSTOM state detected')
				await driverHandler.saveCustomWorkHours(ctx, text)
				return
			}
			// ============ CONFIRM CALLBACK ============
			if (callbackData === 'confirm') {
				await ctx.answerCbQuery()

				console.log('📞 Confirm callback detected, user state:', user.state)

				if (user.state === states.DRIVER_REG_CONFIRM) {
					try {
						// Driver registration confirm
						await driverHandler.saveProfile(ctx)
					} catch (error) {
						console.error('Driver confirm error:', error)
						await ctx.reply(
							user.language === 'uz'
								? "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
								: '❌ Произошла ошибка. Пожалуйста, попробуйте еще раз.'
						)
					}
				} else if (user.state === states.PASSENGER_CONFIRM) {
					// Passenger confirm
					await passengerHandler.confirmOrder(ctx)
				} else {
					console.log("❌ Noto'g'ri state uchun confirm:", user.state)
					await ctx.reply(
						user.language === 'uz' ? "❌ Noto'g'ri amal." : '❌ Неправильное действие.'
					)
				}
				return
			}

			// ============ DRIVER REGISTRATION CONFIRM CALLBACK ============
		if (callbackData === 'confirm_driver_registration') {
			await ctx.answerCbQuery()
			console.log('✅ Driver registration confirm callback')

			// Driver handlerdan completeDriverRegistration funksiyasini chaqiramiz
			try {
				await driverHandler.completeDriverRegistration(ctx)
			} catch (error) {
				console.error('❌ Complete driver registration error:', error)
				await ctx.reply(
					user.language === 'uz'
						? '❌ Profil saqlashda xatolik yuz berdi.'
						: '❌ Ошибка при сохранении профиля.'
				)
			}
			return
		}
			// ============ DRIVER REGISTRATION CANCEL CALLBACK ============
			if (callbackData === 'cancel_driver_registration') {
				await ctx.answerCbQuery()
				console.log('❌ Driver registration cancel callback')

				// Sessionni tozalash
				if (ctx.session && ctx.session.driverData) {
					delete ctx.session.driverData
				}

				await ctx.reply(
					user.language === 'uz'
						? '❌ Profil yaratish bekor qilindi. Qayta boshlash uchun /start ni bosing.'
						: '❌ Создание профиля отменено. Нажмите /start чтобы начать заново.'
				)

				user.state = states.MAIN_MENU
				await user.save()

				// Asosiy menyuga qaytish
				await ctx.reply(
					user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
					keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role)
				)
				return
			}


			// ============ CANCEL CALLBACK ============
			if (callbackData === 'cancel') {
				await ctx.answerCbQuery()

				if (user.state === states.DRIVER_REG_CONFIRM) {
					await ctx.reply(user.language === 'uz' ? '❌ Bekor qilindi' : '❌ Отменено')
					user.state = states.MAIN_MENU
					await user.save()
					await ctx.reply(
						user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
						keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role)
					)
				} else if (user.state === states.PASSENGER_CONFIRM) {
					await passengerHandler.cancelOrder(ctx)
				}
				return
			}

			// ============ ISH VAQTI CALLBACK'LARI ============
			if (callbackData.startsWith('work_')) {
				console.log('🕒 Work callback detected:', callbackData)
				try {
					await ctx.answerCbQuery() // Avval callback query javob berish
					await driverHandler.selectWorkHoursCallback(ctx, callbackData)
				} catch (error) {
					console.error('❌ Work hours callback error:', error)
					await ctx.answerCbQuery(
						user.language === 'uz' ? '❌ Xatolik yuz berdi' : '❌ Произошла ошибка'
					)
				}
				return
			}

			// ============ MASHINA CALLBACK'LARI ============
			if (callbackData.startsWith('car_select_')) {
				await ctx.answerCbQuery()
				if (user.state === states.DRIVER_EDIT_CAR) {
					await driverHandler.selectCarCallback(ctx, callbackData)
					const driver = await Driver.findOne({ telegramId: user.telegramId })
					if (driver) {
						user.state = states.MAIN_MENU
						await user.save()
						await driverHandler.showDriverMenu(ctx)
					}
				} else {
					await driverHandler.selectCarCallback(ctx, callbackData)
				}
				return
			}

			// ============ MASHINA TURI CALLBACK'LARI ============
			if (callbackData.startsWith('car_type_')) {
				await ctx.answerCbQuery()
				await driverHandler.selectCarTypeCallback(ctx, callbackData)
				return
			}

			// ============ MAX PASSENGERS CALLBACK'LARI ============
			if (callbackData.startsWith('max_passengers_')) {
				await ctx.answerCbQuery()
				if (user.state === states.DRIVER_EDIT_PASSENGERS) {
					await driverHandler.saveEditedPassengers(ctx, callbackData)
				} else {
					await driverHandler.selectMaxPassengers(ctx, callbackData)
				}
				return
			}

			// ============ SERVICE TYPE CALLBACK'LARI ============
			if (callbackData.startsWith('service_')) {
				await ctx.answerCbQuery()
				if (user.state === states.DRIVER_EDIT_SERVICES) {
					await driverHandler.saveEditedServices(ctx, callbackData)
				} else {
					await driverHandler.selectServiceType(ctx, callbackData)
				}
				return
			}

			// index.js faylida date callback handler:
			if (callbackData.startsWith('date_')) {
				console.log('📅 Date callback detected:', callbackData)
				await ctx.answerCbQuery()
				try {
					await driverHandler.selectDate(ctx, callbackData)
				} catch (error) {
					console.error('❌ Date callback error:', error)
					await ctx.reply('❌ Xatolik yuz berdi')
				}
				return
			}

			if (callbackData.startsWith('time_')) {
				await ctx.answerCbQuery()
				await driverHandler.selectTime(ctx, callbackData)
				return
			}

			// ============ VILOYAT CALLBACK'LARI ============
			if (callbackData.startsWith('driver_from_')) {
				await ctx.answerCbQuery()
				if (user.state === states.DRIVER_EDIT_ROUTE_FROM) {
					await driverHandler.saveEditedRouteFrom(ctx, callbackData)
				} else {
					await driverHandler.selectFromRegion(ctx, callbackData)
				}
				return
			}

			if (callbackData.startsWith('driver_to_')) {
				await ctx.answerCbQuery()
				if (user.state === states.DRIVER_EDIT_ROUTE_TO) {
					await driverHandler.saveEditedRouteTo(ctx, callbackData)
				} else {
					await driverHandler.selectToRegion(ctx, callbackData)
				}
				return
			}

			// ============ ASOSIY MENYU CALLBACK'LARI ============
			switch (callbackData) {
				case 'driver_info':
					await ctx.answerCbQuery()
					const driver = await Driver.findOne({ telegramId: user.telegramId })
					if (driver) {
						if (driver.status === 'active') {
							await driverHandler.showDriverMenu(ctx)
						} else {
							await driverHandler.showInactiveDriverMenu(ctx, driver)
						}
					} else {
						await driverHandler.startRegistration(ctx)
					}
					break

				case 'driver_payment':
					await ctx.answerCbQuery()
					console.log('Driver payment callback triggered')
					await driverHandler.handleDriverPayment(ctx)
					break

				case 'driver_edit':
					await ctx.answerCbQuery()
					await driverHandler.showDriverEditMenu(ctx)
					break

				case 'edit_fullname':
					await ctx.answerCbQuery()
					await driverHandler.editFullName(ctx)
					break

				case 'edit_phone':
					await ctx.answerCbQuery()
					await driverHandler.editPhone(ctx)
					break

				case 'edit_car':
					await ctx.answerCbQuery()
					await driverHandler.editCar(ctx)
					break

				case 'edit_passengers':
					await ctx.answerCbQuery()
					await driverHandler.editPassengers(ctx)
					break

				case 'edit_route':
					await ctx.answerCbQuery()
					await driverHandler.editRoute(ctx)
					break

				case 'edit_services':
					await ctx.answerCbQuery()
					await driverHandler.editServices(ctx)
					break

				case 'edit_time':
					await ctx.answerCbQuery()
					await driverHandler.editTime(ctx)
					break

				case 'main_menu':
					await ctx.answerCbQuery()
					await ctx.reply(
						user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
						keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role)
					)
					user.state = states.MAIN_MENU
					await user.save()
					break

				default:
					// Agar callback topilmasa, default handler
					await ctx.answerCbQuery()
					console.log('❌ Unknown callback:', callbackData)
					break
			}
		} catch (error) {
        console.error('❌ Callback error:', error)
        try {
            await ctx.answerCbQuery('❌ Xatolik yuz berdi')
        } catch (e) {
            console.error('Answer callback error:', e)
        }
    }
})

// Text message handler
// bot.on('text', async ctx => {
// 	try {
// 		const user = ctx.user
// 		const text = ctx.message.text

// 		// ============ ADMIN PAYMENT ADD ============
// 		if (ctx.session?.adminAction === 'add_payment' && ctx.session?.adminDriverId) {
// 			const amount = parseInt(text)
// 			if (isNaN(amount) || amount <= 0) {
// 				await ctx.reply("❌ Noto'g'ri miqdor. Iltimos, raqam kiriting:")
// 				return
// 			}

// 			const driver = await Driver.findOne({ telegramId: ctx.session.adminDriverId })
// 			if (driver) {
// 				driver.balance += amount
// 				await driver.save()

// 				const message =
// 					user.language === 'uz'
// 						? `✅ Haydovchi balansi yangilandi!\n\n${
// 								driver.fullName
// 						  }\n💰 Qo'shilgan summa: ${amount.toLocaleString()} so'm\n💳 Yangi balans: ${driver.balance.toLocaleString()} so'm`
// 						: `✅ Баланс водителя обновлен!\n\n${
// 								driver.fullName
// 						  }\n💰 Добавленная сумма: ${amount.toLocaleString()} сум\n💳 Новый баланс: ${driver.balance.toLocaleString()} сум`

// 				await ctx.reply(message)

// 				// Haydovchiga xabar
// 				try {
// 					await ctx.telegram.sendMessage(
// 						driver.telegramId,
// 						user.language === 'uz'
// 							? `💰 Sizning balansingizga ${amount.toLocaleString()} so'm qo'shildi.\n\n💳 Joriy balans: ${driver.balance.toLocaleString()} so'm\n🎉 Rahmat!`
// 							: `💰 На ваш баланс добавлено ${amount.toLocaleString()} сум.\n\n💳 Текущий баланс: ${driver.balance.toLocaleString()} сум\n🎉 Спасибо!`
// 					)
// 				} catch (error) {
// 					console.error('Driver notification error:', error)
// 				}
// 			}

// 			// Sessionni tozalash
// 			delete ctx.session.adminAction
// 			delete ctx.session.adminDriverId

// 			// Admin menyusiga qaytish
// 			await adminHandler.showAdminMenu(ctx)
// 			return
// 		}

// 		// ============ STATE BASED ACTIONS ============
// 		switch (user.state) {
// 			case states.DRIVER_EDIT_FULLNAME:
// 				await driverHandler.saveEditedFullName(ctx, text)
// 				break

// 			case states.DRIVER_EDIT_PHONE:
// 				await driverHandler.saveEditedPhone(ctx, text)
// 				break

// 			case states.DRIVER_EDIT_CAR:
// 				await driverHandler.saveCarModel(ctx, text)
// 				break

// 			case states.PASSENGER_PARCEL_DESC:
// 				await passengerHandler.saveParcelDescription(ctx, text)
// 				break

// 			case states.PASSENGER_COMMENT:
// 				await passengerHandler.saveComment(ctx, text)
// 				break

// 			case states.DRIVER_REG_FULLNAME:
// 				await driverHandler.saveFullName(ctx, text)
// 				break

// 			case states.DRIVER_REG_PHONE:
// 				await driverHandler.savePhone(ctx, text)
// 				break

// 			case states.DRIVER_REG_SELECT_CAR:
// 				await driverHandler.saveCarModel(ctx, text)
// 				break

// 			case states.DRIVER_REG_CAR_MODEL:
// 				await driverHandler.saveCarModel(ctx, text)
// 				break

// 			default:
// 				if (text.startsWith('/')) {
// 					await ctx.reply(
// 						user.language === 'uz' ? 'Iltimos, menudan foydalaning' : 'Пожалуйста, используйте меню'
// 					)
// 				}
// 				break
// 		}
// 	} catch (error) {
// 		console.error('Text handler error:', error)
// 	}
// })

// index.js faylida text handler qismini quyidagicha yangilang:

bot.on('text', async ctx => {
    try {
        const user = ctx.user
        const text = ctx.message.text

        console.log('📝 ========== TEXT HANDLER START ==========')
        console.log('👤 User ID:', user.telegramId)
        console.log('📊 User state:', user.state)
        console.log('📄 Text content:', text)
        console.log('📋 Message type:', ctx.message?.content_type || 'text')
        
        // User states ni konsolga chiqaramiz
        console.log('🔍 All states check:')
        console.log('DRIVER_REG_TIME_INPUT:', states.DRIVER_REG_TIME_INPUT)
        console.log('DRIVER_REG_WORK_HOURS_CUSTOM:', states.DRIVER_REG_WORK_HOURS_CUSTOM)
        console.log('Is user.state === states.DRIVER_REG_TIME_INPUT?', user.state === states.DRIVER_REG_TIME_INPUT)

        // ============ Vaqt kiritish handleri ============
        if (user.state === states.DRIVER_REG_TIME_INPUT) {
            console.log('✅ DRIVER_REG_TIME_INPUT state detected - vaqt kiritish uchun')
            console.log('📤 Calling saveTimeInput...')
            
            // Avval oldingi xabarni o'chirish
            try {
                if (ctx.message?.message_id) {
                    await ctx.deleteMessage(ctx.message.message_id)
                }
            } catch (deleteError) {
                console.log('Delete message error:', deleteError.message)
            }
            
            await driverHandler.saveTimeInput(ctx, text)
            console.log('✅ saveTimeInput called successfully')
            return
        }

        // ============ ISH VAQTI MAXSUS KIRITISH ============
        if (user.state === states.DRIVER_REG_WORK_HOURS_CUSTOM) {
            console.log('✅ DRIVER_REG_WORK_HOURS_CUSTOM state detected')
            await driverHandler.saveCustomWorkHours(ctx, text)
            return
        }

        console.log('ℹ️ Text handled by default handler')
        
        // ============ QOLGAN TEXT HANDLERLAR ============
        switch (user.state) {
            case states.DRIVER_EDIT_FULLNAME:
                await driverHandler.saveEditedFullName(ctx, text)
                break
                
            case states.DRIVER_EDIT_PHONE:
                await driverHandler.saveEditedPhone(ctx, text)
                break
                
            case states.DRIVER_EDIT_CAR:
                await driverHandler.saveCarModel(ctx, text)
                break
                
            case states.PASSENGER_PARCEL_DESC:
                await passengerHandler.saveParcelDescription(ctx, text)
                break
                
            case states.PASSENGER_COMMENT:
                await passengerHandler.saveComment(ctx, text)
                break
                
            case states.DRIVER_REG_FULLNAME:
                await driverHandler.saveFullName(ctx, text)
                break
                
            case states.DRIVER_REG_PHONE:
                await driverHandler.savePhone(ctx, text)
                break
                
            case states.DRIVER_REG_SELECT_CAR:
                await driverHandler.saveCarModel(ctx, text)
                break
                
            case states.DRIVER_REG_CAR_MODEL:
                await driverHandler.saveCarModel(ctx, text)
                break
                
            default:
                console.log('⚠️ No matching state found for text handler')
                if (text.startsWith('/')) {
                    await ctx.reply(
                        user.language === 'uz' 
                            ? 'Iltimos, menudan foydalaning' 
                            : 'Пожалуйста, используйте меню'
                    )
                }
                break
        }
        
        console.log('📝 ========== TEXT HANDLER END ==========')

    } catch (error) {
        console.error('❌ Text handler error:', error)
        console.error('❌ Error stack:', error.stack)
        
        try {
            await ctx.reply(
                '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'
            )
        } catch (replyError) {
            console.error('Reply error:', replyError)
        }
    }
})

// Contact handler
bot.on('contact', async ctx => {
	try {
		const user = ctx.user
		const contact = ctx.message.contact

		if (user.state === states.DRIVER_REG_PHONE) {
			await driverHandler.savePhone(ctx, contact.phone_number)
		}
	} catch (error) {
		console.error('Contact handler error:', error)
	}
})

// Admin commandlari
bot.command('admin', async ctx => {
	await adminHandler.showAdminMenu(ctx)
})

// Cron job - oylik obuna tekshiruvi
cron.schedule('0 0 * * *', async () => {
	try {
		const expiredDrivers = await Driver.find({
			paidUntil: { $lt: new Date() },
			status: 'active'
		})

		for (const driver of expiredDrivers) {
			driver.status = 'inactive'
			await driver.save()

			try {
				await bot.telegram.sendMessage(
					driver.telegramId,
					"⚠️ Sizning obunangiz tugadi. Faollashtirish uchun to'lov qiling."
				)
			} catch (error) {
				console.error('Driver notification failed:', error.message)
			}
		}

		console.log(`Expired drivers checked: ${expiredDrivers.length}`)
	} catch (error) {
		console.error('Cron job error:', error)
	}
})

// To'lov callbacklarini qo'shish
bot.action('driver_payment_enhanced', async ctx => {
	await driverHandler.handleEnhancedDriverPayment(ctx)
	await ctx.answerCbQuery()
})

bot.action('show_driver_profile', async ctx => {
	await driverHandler.handleShowProfileCallback(ctx)
	await ctx.answerCbQuery()
})

bot.action('close_menu', async ctx => {
	await ctx.deleteMessage()
	await ctx.answerCbQuery()
})

// ============ ESKI TO'LOV HANDLERINI YANGILASH ============
bot.action('driver_payment', async ctx => {
	await driverHandler.handleEnhancedDriverPayment(ctx)
	await ctx.answerCbQuery()
})

// Bot konfiguratsiyasiga qo'shing
// Bot konfiguratsiyasiga callback handler qo'shing:

// ============ BUYURTMA CALLBACK HANDLERS ============
// bot.action(/^select_driver_(.+)_(.+)$/, async ctx => {
// 	const user = ctx.user
// 	if (!user) return

// 	try {
// 		const match = ctx.match
// 		const driverId = match[1]
// 		const orderId = match[2]

// 		const orderHandler = require('./handlers/order')
// 		await orderHandler.handleDriverSelection(ctx, driverId, orderId)
		
// 		await ctx.answerCbQuery()
// 	} catch (error) {
// 		console.error('Select driver callback error:', error)
// 		await ctx.answerCbQuery(
// 			user.language === 'uz'
// 				? '❌ Xatolik yuz berdi'
// 				: '❌ Произошла ошибка'
// 		)
// 	}
// })

bot.action(/^select_driver_(.+)_(.+)$/, async ctx => {
	const user = ctx.user
	if (!user) return

	try {
		const match = ctx.match
		const driverId = match[1]
		const orderId = match[2]

		console.log(`🚕 Haydovchi tanlandi: driverId=${driverId}, orderId=${orderId}`)

		// Order handler bilan ishlash
		const orderHandler = require('./handlers/order')
		await orderHandler.handleDriverSelection(ctx, driverId, orderId)

		await ctx.answerCbQuery()
	} catch (error) {
		console.error('Select driver callback error:', error)
		await ctx.answerCbQuery(
			user?.language === 'uz' ? '❌ Xatolik yuz berdi' : '❌ Произошла ошибка'
		)
	}
})

bot.action(/^confirm_order_(.+)$/, async ctx => {
	const user = ctx.user
	if (!user) return

	try {
		const orderHandler = require('./handlers/order')
		await orderHandler.confirmOrder(ctx, ctx.callbackQuery.data)
		
		await ctx.answerCbQuery()
	} catch (error) {
		console.error('Confirm order callback error:', error)
	}
})

bot.action(/^cancel_order_(.+)$/, async ctx => {
	const user = ctx.user
	if (!user) return

	try {
		const orderHandler = require('./handlers/order')
		await orderHandler.cancelOrder(ctx, ctx.callbackQuery.data)
		
		await ctx.answerCbQuery()
	} catch (error) {
		console.error('Cancel order callback error:', error)
	}
})

bot.action(/^driver_accept_(.+)$/, async ctx => {
	const user = ctx.user
	if (!user) return

	try {
		const orderHandler = require('./handlers/order')
		await orderHandler.driverAcceptOrder(ctx, ctx.callbackQuery.data)
		
		await ctx.answerCbQuery()
	} catch (error) {
		console.error('Driver accept callback error:', error)
	}
})

bot.action(/^driver_reject_(.+)$/, async ctx => {
	const user = ctx.user
	if (!user) return

	try {
		const orderHandler = require('./handlers/order')
		await orderHandler.driverRejectOrder(ctx, ctx.callbackQuery.data)
		
		await ctx.answerCbQuery()
	} catch (error) {
		console.error('Driver reject callback error:', error)
	}
})

// Serverni ishga tushirish funksiyasini yangilaymiz
const startServer = async () => {
	try {
		// Environment'ni tekshirish
		const isProduction = process.env.NODE_ENV === 'production'

		if (isProduction) {
			// Production (Render.com) uchun webhook
			const hostname = process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:5000'
			const webhookUrl = `https://${hostname}/webhook/${process.env.BOT_TOKEN}`

			console.log(`Production mode - Setting webhook to: ${webhookUrl}`)

			try {
				await bot.telegram.setWebhook(webhookUrl)
				console.log('✅ Webhook successfully set')
			} catch (error) {
				console.error('❌ Failed to set webhook:', error.message)
				// Webhook o'rnatishda xatolik bo'lsa ham serverni ishga tushiramiz
			}
		} else {
			// Development uchun polling - qayta urinish mexanizmi
			console.log('Development mode - Using polling')

			// Qayta urinish funksiyasi
			const startPolling = async (retryCount = 0, maxRetries = 5) => {
				try {
					await bot.launch()
					console.log('✅ Bot polling mode da ishga tushdi')
				} catch (error) {
					console.error(
						`❌ Botni ishga tushirishda xatolik (${retryCount + 1}/${maxRetries}):`,
						error.message
					)

					if (retryCount < maxRetries - 1) {
						// Kuting va qayta urinib ko'ring
						const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Exponential backoff
						console.log(`⏳ ${delay / 1000} soniyadan keyin qayta uriniladi...`)

						setTimeout(() => {
							startPolling(retryCount + 1, maxRetries)
						}, delay)
					} else {
						console.error('❌ Maksimal qayta urinishlar soniga yetildi. Bot ishga tushmadi.')
					}
				}
			}

			// Polling ni boshlash
			startPolling()
		}

		// Express serverni ishga tushirish
		app.listen(PORT, () => {
			console.log(`🌐 Server ${PORT} portda ishga tushdi`)
			if (isProduction) {
				console.log(`🤖 Bot webhook mode da ishlayapti`)
			}
		})

		// Graceful shutdown
		process.once('SIGINT', () => bot.stop('SIGINT'))
		process.once('SIGTERM', () => bot.stop('SIGTERM'))
	} catch (error) {
		console.error('Server start error:', error)
	}
}

// .env faylni yuklash va server ishga tushirish
startServer()
