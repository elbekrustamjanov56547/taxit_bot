require('dotenv').config()
const { Telegraf, session } = require('telegraf')
const mongoose = require('mongoose')
const cron = require('node-cron')
const startHandler = require('./handlers/start')
const passengerHandler = require('./handlers/passenger')
const driverHandler = require('./handlers/driver')
const adminHandler = require('./handlers/admin')
const express = require('express')
const OrderExpirationService = require('./services/orderExpirationService')

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
const orderExpirationService = new OrderExpirationService(bot)
orderExpirationService.start(15)

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
			adminDriverId: null,
		}),
	}),
)

// bot.js faylining middleware qismini quyidagicha o'zgartiring:

bot.use(async (ctx, next) => {
	try {
		console.log('🔄 ========== MIDDLEWARE START ==========')
		console.log('📊 Update type:', ctx.updateType)

		const userId = ctx.from?.id
		if (!userId) {
			console.log('⚠️ User ID not found in ctx.from')
			return next()
		}

		console.log('👤 User ID:', userId)

		// Foydalanuvchi mavjudligini tekshirish
		let user = await User.findOne({ telegramId: userId })

		if (!user) {
			// Yangi foydalanuvchi yaratish
			console.log('👤 Creating new user...')
			user = new User({
				telegramId: userId,
				username: ctx.from.username || '',
				firstName: ctx.from.first_name || '',
				lastName: ctx.from.last_name || '',
				language: '',
				role: 'none',
				state: states.START,
				lastActivity: new Date(),
			})
			await user.save()
			console.log('✅ New user created:', user.telegramId)
		} else {
			// Faollikni yangilash
			user.lastActivity = new Date()
			await user.save()
		}

		// Admin ekanligini tekshirish
		const isAdmin = ADMIN_IDS.includes(user.telegramId)
		ctx.user = user
		ctx.user.isAdmin = isAdmin

		console.log(
			'✅ User set in ctx:',
			ctx.user.telegramId,
			'Role:',
			ctx.user.role,
		)

		// Sessionni tekshirish
		if (!ctx.session) {
			console.log('🆕 Creating new session')
			ctx.session = {
				driverData: {},
				orderId: null,
				tempData: {},
				adminAction: null,
				adminDriverId: null,
			}
		}

		// Oldingi xabarni o'chirish (callback bo'lsa)
		if (ctx.callbackQuery && ctx.callbackQuery.message) {
			try {
				await ctx.deleteMessage()
			} catch (e) {
				console.log("⚠️ Xabarni o'chirishda xatolik:", e.message)
			}
		}

		console.log('🔄 ========== MIDDLEWARE END ==========')
		await next()
	} catch (error) {
		console.error('❌ Middleware error:', error)
		console.error('❌ Error stack:', error.stack)

		// Agar middleware xatosi bo'lsa, contextga standart user yaratish
		try {
			const userId = ctx.from?.id
			if (userId) {
				let user = await User.findOne({ telegramId: userId })
				if (!user) {
					user = new User({
						telegramId: userId,
						username: ctx.from.username || '',
						firstName: ctx.from.first_name || '',
						lastName: ctx.from.last_name || '',
						language: 'uz',
						role: 'none',
						state: states.MAIN_MENU,
						lastActivity: new Date(),
					})
					await user.save()
				}
				ctx.user = user
			}
		} catch (fallbackError) {
			console.error('❌ Fallback user creation error:', fallbackError)
		}

		await next()
	}
})

// /start command
bot.start(async ctx => {
	await startHandler.startHandler(ctx)
})
bot.on('callback_query', async ctx => {
	try {
		console.log('📞 ========== CALLBACK HANDLER START ==========')
		console.log(
			'🔍 Full callback query:',
			JSON.stringify(ctx.callbackQuery, null, 2),
		)
		console.log('🔍 Callback data:', ctx.callbackQuery.data)
		console.log('🔍 Message ID:', ctx.callbackQuery.message?.message_id)

		// ctx.user mavjudligini tekshirish
		if (!ctx.user) {
			console.error('❌ ctx.user not found')
			try {
				await ctx.answerCbQuery('❌ Xatolik: Foydalanuvchi topilmadi')
			} catch (e) {
				console.log('Answer callback error:', e.message)
			}
			return
		}

		const user = ctx.user
		const callbackData = ctx.callbackQuery.data

		console.log('📞 Callback received:', callbackData)
		console.log('👤 User:', user.telegramId, 'State:', user.state)

		// Avval callback query ga javob berish
		try {
			await ctx.answerCbQuery()
		} catch (cbError) {
			console.log('⚠️ answerCbQuery error:', cbError.message)
		}

		// ============ MASHINA TANLASH CALLBACKLARI ============
		if (callbackData === 'car_manual_input') {
			console.log('🏷️ Car manual input callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.showManualCarInput(ctx)
			return
		}
		if (callbackData === 'parcel_yes' || callbackData === 'parcel_no') {
			console.log('📦 Parcel callback:', callbackData)
			const passengerHandler = require('./handlers/passenger')

			if (
				user.state === states.PASSENGER_PARCEL ||
				user.state === states.PASSENGER_EDIT_PARCEL
			) {
				if (user.state === states.PASSENGER_EDIT_PARCEL) {
					// Tahrirlash uchun
					await passengerHandler.saveEditedParcel(ctx, callbackData)
				} else {
					// Yangi buyurtma uchun
					await passengerHandler.selectParcel(ctx, callbackData)
				}
				return
			}
		}

		if (callbackData.startsWith('car_page_')) {
			console.log('📄 Car page callback:', callbackData)
			const driverHandler = require('./handlers/driver')
			await driverHandler.handleCarPageChange(ctx, callbackData)
			return
		}

		if (callbackData.startsWith('car_select_')) {
			console.log('🚗 Car select callback:', callbackData)
			const driverHandler = require('./handlers/driver')
			await driverHandler.selectCarCallback(ctx, callbackData)
			return
		}

		if (callbackData.startsWith('car_type_')) {
			console.log('🏷️ Car type callback:', callbackData)
			const driverHandler = require('./handlers/driver')
			await driverHandler.selectCarTypeCallback(ctx, callbackData)
			return
		}
		if (callbackData.startsWith('work_')) {
			console.log('🕒 Work hours callback:', callbackData)
			const driverHandler = require('./handlers/driver')

			if (callbackData === 'work_custom') {
				if (driverHandler.showCustomWorkHoursInput) {
					await driverHandler.showCustomWorkHoursInput(ctx)
				} else if (driverHandler.handleCustomWorkHours) {
					await driverHandler.handleCustomWorkHours(ctx)
				} else if (driverHandler.showWorkHoursInput) {
					await driverHandler.showWorkHoursInput(ctx)
				} else {
					// Agar hech qaysi funksiya topilmasa, oddiy xabar
					user.state = states.DRIVER_REG_WORK_HOURS_CUSTOM
					await user.save()

					await ctx.reply(
						user.language === 'uz'
							? '🕒 Ish vaqtini kiriting (masalan: 09:00 - 18:00):'
							: '🕒 Введите рабочее время (например: 09:00 - 18:00):',
					)
				}
			} else {
				await driverHandler.selectWorkHoursCallback(ctx, callbackData)
			}
			return
		}

		if (callbackData.startsWith('date_')) {
			console.log('📅 Date callback:', callbackData)
			const driverHandler = require('./handlers/driver')

			if (callbackData === 'date_custom') {
				await driverHandler.showCustomDateInput(ctx)
			} else if (callbackData === 'date_manual') {
				await driverHandler.showManualDateInput(ctx)
			} else {
				await driverHandler.selectDate(ctx, callbackData)
			}
			return
		}

		if (callbackData.startsWith('time_')) {
			console.log('⏰ Time callback:', callbackData)
			const driverHandler = require('./handlers/driver')

			if (callbackData === 'time_custom') {
				await driverHandler.showCustomTimeInput(ctx)
			} else {
				await driverHandler.selectTime(ctx, callbackData)
			}
			return
		}

		// ============ NAVIGATSIYA CALLBACKLARI ============
		if (callbackData === 'back_to_car_selection') {
			console.log('⬅️ Back to car selection')
			const driverHandler = require('./handlers/driver')
			await driverHandler.handleBackToCarSelection(ctx)
			return
		}

		if (callbackData === 'back_to_registration') {
			console.log('⬅️ Back to registration')
			const driverHandler = require('./handlers/driver')
			await driverHandler.handleBackToRegistration(ctx)
			return
		}

		// ============ TAXI CALLBACKLARI ============
		if (callbackData === 'taxi_service') {
			console.log('🚖 Taxi service callback')
			const driverHandler = require('./handlers/driver')
			const existingDriver = await Driver.findOne({
				telegramId: user.telegramId,
			})

			if (existingDriver) {
				if (existingDriver.status === 'active') {
					await driverHandler.showDriverMenu(ctx)
				} else {
					await driverHandler.showInactiveDriverMenu(ctx, existingDriver)
				}
			} else {
				await ctx.reply(
					user.language === 'uz'
						? "🚘 Haydovchi profilingiz topilmadi.\n\nKeling, ro'yxatdan o'tishni boshlaymiz."
						: '🚘 Профиль водителя не найден.\n\nДавайте начнём регистрацию.',
				)
				await driverHandler.startRegistration(ctx)
			}
			return
		}

		// ============ DRIVER REGISTRATION CALLBACKLARI ============
		if (callbackData === 'confirm_driver_registration') {
			console.log('✅ Confirm driver registration')
			const driverHandler = require('./handlers/driver')
			await driverHandler.completeDriverRegistration(ctx)
			return
		}

		if (callbackData === 'cancel_driver_registration') {
			console.log('❌ Cancel driver registration')
			const driverHandler = require('./handlers/driver')

			if (ctx.session && ctx.session.driverData) {
				delete ctx.session.driverData
			}

			await ctx.reply(
				user.language === 'uz'
					? '❌ Profil yaratish bekor qilindi. Qayta boshlash uchun /start ni bosing.'
					: '❌ Создание профиля отменено. Нажмите /start чтобы начать заново.',
			)

			user.state = states.MAIN_MENU
			await user.save()

			await ctx.reply(
				user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
				keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role),
			)
			return
		}

		// ============ DRIVER EDIT CALLBACKLARI ============
		if (callbackData === 'profile_driver_edit') {
			console.log('✏️ Driver edit callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.handleDriverEditMenu(ctx)
			return
		}

		if (callbackData === 'edit_car_number') {
			console.log('🚗 Edit car number callback')
			user.state = states.DRIVER_EDIT_CAR_NUMBER
			await user.save()

			await ctx.reply(
				user.language === 'uz'
					? '🚗 Yangi mashina raqamini kiriting: 01AA000BB'
					: '🚗 Введите новый номер машины: 01AA000BB',
					user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
				keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role),
			)

			return
		}

		// ============ DESTINATION CALLBACKLARI ============
		if (callbackData === 'select_new_destination') {
			console.log('📍 Select new destination callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.selectNewDestination(ctx)
			return
		}
		if (callbackData.startsWith('to_')) {
			console.log('📍 ========== TO CALLBACK DETECTED ==========')
			console.log('📍 Callback data:', callbackData)
			console.log('👤 User state:', user.state)

			// Driver callback emasligini tekshirish
			if (callbackData.startsWith('driver_to_')) {
				console.log('🚗 This is driver_to callback, skipping passenger handler')
			} else if (
				user.state === states.PASSENGER_TO_REGION ||
				user.state === states.PASSENGER_EDIT_TO_REGION
			) {
				console.log('✅ Valid passenger to region callback')

				const passengerHandler = require('./handlers/passenger')

				if (user.state === states.PASSENGER_EDIT_TO_REGION) {
					console.log('📝 Handling edited to region')
					await passengerHandler.saveEditedToRegion(ctx, callbackData)
				} else {
					console.log('📍 Handling new to region')
					await passengerHandler.selectToRegion(ctx, callbackData)
				}
				return
			} else {
				console.log('⚠️ Invalid state for to region callback')
				console.log('⚠️ Expected:', states.PASSENGER_TO_REGION)
				console.log('⚠️ Got:', user.state)
			}
		}

		// ============ ORDER CALLBACKLARI ============
		if (callbackData === 'confirm_order') {
			console.log('✅ Confirm order callback')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.confirmOrder(ctx)
			return
		}
		// bot.js faylida callback handler'ning need_taxi qismini quyidagicha o'zgartiramiz:

		if (callbackData === 'need_taxi') {
			console.log('🚖 Need taxi callback')

			try {
				// 1. Avval callback queryga javob berish (loading animatsiya)
				await ctx.answerCbQuery('⏳ Yuklanmoqda...')

				// 2. passengerHandler'ni import qilish
				const passengerHandler = require('./handlers/passenger')

				// 3. Avvalgi xabarni O'CHIRMASLIK, chunki startOrder o'zi o'chiradi
				console.log('✅ Calling passengerHandler.startOrder...')

				// 4. startOrder funksiyasini chaqirish
				await passengerHandler.startOrder(ctx)
			} catch (error) {
				console.error('❌ Need taxi callback error:', error)
				console.error('❌ Error stack:', error.stack)

				// Agar xatolik bo'lsa, foydalanuvchiga xabar berish
				try {
					await ctx.reply(
						ctx.user?.language === 'uz'
							? "❌ Taksi buyurtma qilishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
							: '❌ Ошибка при заказе такси. Пожалуйста, попробуйте еще раз.',
					)
				} catch (replyError) {
					console.error('Reply error:', replyError)
				}
			}
			return
		}
		if (callbackData === 'edit_order') {
			console.log('✏️ Edit order callback')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.editOrder(ctx)
			return
		}

		if (callbackData === 'confirm_final_order') {
			console.log('✅ Confirm final order callback')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.createOrderWithPhone(ctx)
			return
		}

		if (callbackData === 'edit_from_region') {
			console.log('📍 Edit from region callback')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.editFromRegion(ctx)
			return
		}

		if (callbackData === 'edit_to_region') {
			console.log('📍 Edit to region callback')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.editToRegion(ctx)
			return
		}

		if (callbackData === 'edit_passenger_count') {
			console.log('👥 Edit passenger count callback')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.editPassengerCount(ctx)
			return
		}

		if (callbackData === 'edit_parcel') {
			console.log('📦 Edit parcel callback')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.editParcel(ctx)
			return
		}

		if (callbackData === 'back_to_confirmation') {
			console.log('⬅️ Back to confirmation callback')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.backToConfirmation(ctx)
			return
		}

		if (callbackData === 'back_to_edit_menu') {
			console.log('⬅️ Back to edit menu callback')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.backToEditMenu(ctx)
			return
		}

		// ============ LANGUAGE CALLBACKLARI ============
		if (callbackData.startsWith('lang_')) {
			console.log('🌐 Language selection:', callbackData)
			const startHandler = require('./handlers/start')
			await startHandler.handleLanguageSelection(ctx, callbackData)
			return
		}

		// ============ ROLE CALLBACKLARI ============
		if (callbackData.startsWith('role_')) {
			console.log('👤 Role selection:', callbackData)
			const startHandler = require('./handlers/start')
			await startHandler.handleRoleSelection(ctx, callbackData)
			return
		}

		// ============ SERVICE SWITCH CALLBACKLARI ============
		if (
			callbackData === 'switch_to_user' ||
			callbackData === 'switch_to_driver'
		) {
			console.log('🔄 Service switch:', callbackData)
			await switchServiceRole(ctx)
			return
		}

		// ============ MAIN MENU CALLBACKLARI ============
		if (callbackData === 'main_menu') {
			console.log('🏠 Main menu callback')
			await ctx.reply(
				user.language === 'uz' ? `🏠 Asosiy menyu\n\n` + `Quyidagilardan birini tanlang:`
				: `🏠 Главное меню\n\n` + `Выберите одно из следующих:`,
				keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role),
			)
			user.state = states.MAIN_MENU
			await user.save()
			return
		}

		if (callbackData === 'close_menu') {
			console.log('❌ Close menu callback')
			try {
				await ctx.deleteMessage()
			} catch (error) {
				console.log('Delete message error:', error.message)
			}
			return
		}

		// ============ ORDER MANAGEMENT CALLBACKLARI ============
		if (callbackData.startsWith('select_driver_')) {
			console.log('🚕 Select driver callback:', callbackData)
			const orderHandler = require('./handlers/order')
			await orderHandler.handleDriverSelection(ctx, callbackData)
			return
		}

		if (callbackData.startsWith('confirm_order_')) {
			console.log('✅ Confirm order callback:', callbackData)
			const orderHandler = require('./handlers/order')
			await orderHandler.confirmOrder(ctx, callbackData)
			return
		}

		if (callbackData.startsWith('cancel_order_')) {
			console.log('❌ Cancel order callback:', callbackData)
			const orderHandler = require('./handlers/order')
			await orderHandler.cancelOrder(ctx, callbackData)
			return
		}

		if (callbackData.startsWith('driver_accept_')) {
			console.log('✅ Driver accept callback:', callbackData)
			const orderHandler = require('./handlers/order')
			await orderHandler.driverAcceptOrder(ctx, callbackData)
			return
		}

		if (callbackData.startsWith('driver_reject_')) {
			console.log('❌ Driver reject callback:', callbackData)
			const orderHandler = require('./handlers/order')
			await orderHandler.driverRejectOrder(ctx, callbackData)
			return
		}

		// ============ PASSENGER CALLBACKLARI ============
		if (callbackData.startsWith('passengers_')) {
			console.log('👥 Passenger count callback:', callbackData)
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.selectPassengerCount(ctx, callbackData)
			return
		}
		if (callbackData.startsWith('from_')) {
			console.log('📍 ========== FROM CALLBACK DETECTED ==========')
			console.log('📍 Callback data:', callbackData)
			console.log('👤 User state:', user.state)
			console.log('👤 User role:', user.role)

			// Driver callback emasligini tekshirish
			if (callbackData.startsWith('driver_from_')) {
				console.log(
					'🚗 This is driver_from callback, skipping passenger handler',
				)
			} else if (
				user.state === states.PASSENGER_FROM_REGION ||
				user.state === states.PASSENGER_EDIT_FROM_REGION
			) {
				console.log('✅ Valid passenger from region callback')

				const passengerHandler = require('./handlers/passenger')

				if (user.state === states.PASSENGER_EDIT_FROM_REGION) {
					console.log('📝 Handling edited from region')
					await passengerHandler.saveEditedFromRegion(ctx, callbackData)
				} else {
					console.log('📍 Handling new from region')
					await passengerHandler.selectFromRegion(ctx, callbackData)
				}
				return
			} else {
				console.log('⚠️ Invalid state for from region callback')
				console.log('⚠️ Expected:', states.PASSENGER_FROM_REGION)
				console.log('⚠️ Got:', user.state)
			}
		}
		// ============ DRIVER CALLBACKLARI ============
		if (callbackData.startsWith('max_passengers_')) {
			console.log('👥 Max passengers callback:', callbackData)
			const driverHandler = require('./handlers/driver')

			if (user.state === states.DRIVER_EDIT_PASSENGERS) {
				await driverHandler.saveEditedPassengers(ctx, callbackData)
			} else {
				await driverHandler.selectMaxPassengers(ctx, callbackData)
			}
			return
		}

		if (callbackData.startsWith('driver_from_')) {
			console.log('📍 Driver from region callback:', callbackData)
			const driverHandler = require('./handlers/driver')

			if (user.state === states.DRIVER_EDIT_ROUTE_FROM) {
				await driverHandler.saveEditedRouteFrom(ctx, callbackData)
			} else {
				await driverHandler.selectFromRegion(ctx, callbackData)
			}
			return
		}

		if (callbackData.startsWith('driver_to_')) {
			console.log('📍 Driver to region callback:', callbackData)
			const driverHandler = require('./handlers/driver')

			if (user.state === states.DRIVER_EDIT_ROUTE_TO) {
				await driverHandler.saveEditedRouteTo(ctx, callbackData)
			} else {
				await driverHandler.selectToRegion(ctx, callbackData)
			}
			return
		}

		if (callbackData.startsWith('service_')) {
			console.log('⚙️ Service type callback:', callbackData)
			const driverHandler = require('./handlers/driver')

			if (user.state === states.DRIVER_EDIT_SERVICES) {
				await driverHandler.saveEditedServices(ctx, callbackData)
			} else {
				await driverHandler.selectServiceType(ctx, callbackData)
			}
			return
		}

		// ============ MY ORDERS CALLBACKLARI ============
		if (callbackData === 'my_orders') {
			console.log('📋 My orders callback')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.showMyOrders(ctx)
			return
		}

		// ============ DRIVER INFO CALLBACKLARI ============
		if (callbackData === 'driver_info') {
			console.log('🚗 Driver info callback')
			const driverHandler = require('./handlers/driver')
			const driver = await Driver.findOne({ telegramId: user.telegramId })

			if (driver) {
				if (driver.status === 'active') {
					await driverHandler.showDriverMenu(ctx)
				} else {
					await driverHandler.showInactiveDriverMenu(ctx, driver)
				}
			} else {
				await ctx.reply(
					user.language === 'uz'
						? '❌ Haydovchi profilingiz topilmadi.'
						: '❌ Ваш профиль водителя не найден.',
					await driverHandler.startRegistration(ctx),
				)
			}
			return
		}

		// ============ ADMIN CALLBACKLARI ============
		if (callbackData.startsWith('admin_')) {
			console.log('👨‍💼 Admin callback:', callbackData)
			const adminHandler = require('./handlers/admin')
			await adminHandler.handleAdminCallback(ctx, callbackData)
			return
		}

		// ============ PAYMENT CALLBACKLARI ============
		if (callbackData === 'driver_payment') {
			console.log('💳 Driver payment callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.handleEnhancedDriverPayment(ctx)
			return
		}

		if (callbackData === 'driver_payment_enhanced') {
			console.log('💳 Enhanced driver payment callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.handleEnhancedDriverPayment(ctx)
			return
		}

		// ============ PROFILE CALLBACKLARI ============
		if (callbackData === 'show_driver_profile') {
			console.log('📋 Show driver profile callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.handleShowProfileCallback(ctx)
			return
		}

		// ============ TRIP CALLBACKLARI ============
		if (callbackData === 'driver_trip_menu') {
			console.log('🚗 Driver trip menu callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.showDriverTripMenu(ctx)
			return
		}

		if (callbackData === 'start_trip') {
			console.log('🚀 Start trip callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.startTrip(ctx)
			return
		}

		if (callbackData === 'end_trip') {
			console.log('✅ End trip callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.endTrip(ctx)
			return
		}

		if (callbackData === 'cancel_trip') {
			console.log('❌ Cancel trip callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.cancelTrip(ctx)
			return
		}

		if (callbackData === 'change_trip_destination') {
			console.log('📍 Change trip destination callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.changeTripDestination(ctx)
			return
		}

		if (
			callbackData === 'accept_parcel' ||
			callbackData === 'accept_parcel_trip'
		) {
			console.log('📦 Accept parcel callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.acceptParcel(ctx)
			return
		}

		if (callbackData === 'trip_info' || callbackData === 'trip_stats') {
			console.log('📊 Trip info callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.showTripInfo(ctx)
			return
		}

		// ============ EDIT PROFILE CALLBACKLARI ============
		if (callbackData === 'edit_fullname') {
			console.log('✏️ Edit fullname callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.editFullName(ctx)
			return
		}

		if (callbackData === 'edit_phone') {
			console.log('📱 Edit phone callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.editPhone(ctx)
			return
		}

		if (callbackData === 'edit_car') {
			console.log('🚗 Edit car callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.editCar(ctx)
			return
		}

		if (callbackData === 'edit_passengers') {
			console.log('👥 Edit passengers callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.editPassengers(ctx)
			return
		}

		if (callbackData === 'edit_route') {
			console.log('📍 Edit route callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.editRoute(ctx)
			return
		}

		if (callbackData === 'edit_services') {
			console.log('⚙️ Edit services callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.editServices(ctx)
			return
		}

		if (callbackData === 'edit_time') {
			console.log('⏰ Edit time callback')
			const driverHandler = require('./handlers/driver')
			await driverHandler.editTime(ctx)
			return
		}

		// ============ COMMENT CALLBACKLARI ============
		if (callbackData === 'add_comment') {
			console.log('💬 Add comment callback')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.addComment(ctx)
			return
		}

		if (callbackData === 'skip_comment') {
			console.log('⏭️ Skip comment callback')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.skipComment(ctx)
			return
		}

		// ============ DEFAULT ============
		console.log('❌ Unknown callback:', callbackData)
		await ctx.reply(
			user.language === 'uz'
				? '❌ Buyurtma bekor qilindi.\n\nDavom etish uchun /start bosing yoki asosiy menyudan foydalaning.'
				: '❌ Команда не распознана.\n\nПожалуйста, воспользуйтесь главным меню.',
		)

		console.log('📞 ========== CALLBACK HANDLER END ==========')
	} catch (error) {
		console.error('❌ Callback handler error:', error)
		console.error('❌ Error stack:', error.stack)
		try {
			await ctx.answerCbQuery('❌ Xatolik yuz berdi')
		} catch (e) {
			console.error('Answer callback error:', e)
		}
	}
})

bot.action('new_order_after_expired', async ctx => {
	const user = ctx.user

	// Avvalgi sessionni tozalash
	if (ctx.session) {
		delete ctx.session.orderData
		delete ctx.session.orderId
	}

	// Tez buyurtma berishga o'tish
	user.state = states.ORDER_FROM_REGION
	await user.save()

	const message =
		user.language === 'uz'
			? "✅ Yangi buyurtma berish!\n\n📍 Qaysi viloyatdan jo'namoqchisiz?"
			: '✅ Создание нового заказа!\n\n📍 Из какого региона выезжаете?'

	await ctx.reply(message, keyboards.passengerFromRegionsKeyboard(user.language))
})
bot.action(/^select_driver_(.+)_(.+)$/, async ctx => {
	const user = ctx.user
	if (!user) return

	try {
		const match = ctx.match
		const driverId = match[1]
		const orderId = match[2]

		console.log(
			`🚕 Haydovchi tanlandi: driverId=${driverId}, orderId=${orderId}`,
		)

		const orderHandler = require('./handlers/order')
		await orderHandler.handleDriverSelection(ctx, driverId, orderId)

		await ctx.answerCbQuery()
	} catch (error) {
		console.error('Select driver callback error:', error)
		await ctx.answerCbQuery(
			user?.language === 'uz' ? '❌ Xatolik yuz berdi' : '❌ Произошла ошибка',
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

bot.action('driver_payment_enhanced', async ctx => {
	await driverHandler.handleEnhancedDriverPayment(ctx)
	await ctx.answerCbQuery()
})

bot.action('show_driver_profile', async ctx => {
	await driverHandler.handleShowProfileCallback(ctx)
	await ctx.answerCbQuery()
})

bot.action('driver_payment', async ctx => {
	await driverHandler.handleEnhancedDriverPayment(ctx)
	await ctx.answerCbQuery()
})

// bot.on('text', async ctx => {
// 	try {
// 		const user = ctx.user
// 		const text = ctx.message.text

// 		console.log('📝 ========== TEXT HANDLER START ==========')
// 		console.log('👤 User ID:', user.telegramId)
// 		console.log('📊 User state:', user.state)
// 		console.log('📄 Text content:', text)

// 		// Barcha kerakli handlerlarni avval import qilib olamiz
// 		const driverHandler = require('./handlers/driver')
// 		const passengerHandler = require('./handlers/passenger')

// 		// ============ MASHINA RAQAMINI QABUL QILISH ============
// 		if (user.state === states.DRIVER_REG_CAR_NUMBER) {
// 			console.log('✅ DRIVER_REG_CAR_NUMBER state detected!')
// 			await driverHandler.saveCarNumber(ctx, text)
// 			return
// 		}
// 		if (user.state === 'driver_edit_car_number') {
// 			console.log('🚗 DRIVER_EDIT_CAR_NUMBER state - text input:', text)
// 			const driverHandler = require('./handlers/driver')

// 			if (
// 				driverHandler.saveEditedCarNumber &&
// 				typeof driverHandler.saveEditedCarNumber === 'function'
// 			) {
// 				console.log('✅ saveEditedCarNumber function found, calling...')
// 				await driverHandler.saveEditedCarNumber(ctx, text)
// 			} else {
// 				console.log('❌ saveEditedCarNumber function not found')
// 				await ctx.reply(
// 					user.language === 'uz'
// 						? '❌ Mashina raqamini saqlash funksiyasi topilmadi.'
// 						: '❌ Функция сохранения номера машины не найдена.'
// 				)
// 			}
// 			return
// 		}

// 		if (user.state === states.PASSENGER_PHONE) {
// 			console.log('📱 PASSENGER_PHONE state - text input')
// 			const passengerHandler = require('./handlers/passenger')
// 			await passengerHandler.savePassengerPhoneForOrder(ctx, text)
// 			return
// 		}
// 		// bot.js faylining text handleriga quyidagilarni qo'shing:

// 		// PASSENGER_EDIT_PHONE holati (tahrirlangan telefon raqam)
// 		if (user.state === states.PASSENGER_EDIT_PHONE) {
// 			console.log('📱 PASSENGER_EDIT_PHONE state - text input')
// 			const passengerHandler = require('./handlers/passenger')
// 			await passengerHandler.saveEditedPhone(ctx, text)
// 			return
// 		}

// 		// PASSENGER_EDIT_PARCEL_DESC holati (tahrirlangan pochtа tavsifi)
// 		if (user.state === states.PASSENGER_EDIT_PARCEL_DESC) {
// 			console.log('📝 PASSENGER_EDIT_PARCEL_DESC state - text input')
// 			const passengerHandler = require('./handlers/passenger')
// 			await passengerHandler.saveEditedParcelDescription(ctx, text)
// 			return
// 		}
// 		if (user.state === states.PASSENGER_INFO_NAME) {
// 			const passengerHandler = require('./handlers/passenger')
// 			await passengerHandler.savePassengerName(ctx, text)
// 			return
// 		}
// 		if (user.state === states.PASSENGER_INFO_PHONE) {
// 			const passengerHandler = require('./handlers/passenger')
// 			await passengerHandler.savePassengerPhone(ctx, text)
// 			return
// 		}
// 		if (user.state === states.DRIVER_REG_DATE_MANUAL) {
// 			console.log('📅 DRIVER_REG_DATE_MANUAL state detected - manual date input')

// 			try {
// 				await ctx.deleteMessage()
// 			} catch (error) {
// 				console.log('Delete message error:', error.message)
// 			}

// 			const driverHandler = require('./handlers/driver')
// 			await driverHandler.saveManualDateInput(ctx, text)
// 			return
// 		}

// 		if (user.state === 'DRIVER_REG_DATE_CUSTOM') {
// 			console.log('📅 DRIVER_REG_DATE_CUSTOM state detected - custom date input')

// 			// Avval xabarni o'chirish
// 			try {
// 				await ctx.deleteMessage()
// 			} catch (error) {
// 				console.log('Delete message error:', error.message)
// 			}

// 			const driverHandler = require('./handlers/driver')
// 			await driverHandler.saveCustomDate(ctx, text)
// 			return
// 		}
// 		if (user.state === 'DRIVER_REG_CAR_SEARCH') {
// 			console.log('🔍 Car search state detected')
// 			await searchCars(ctx, text)
// 			return
// 		}

// 		// ============ VAQT KIRITISH ============
// 		if (user.state === states.DRIVER_REG_TIME_INPUT) {
// 			console.log('✅ DRIVER_REG_TIME_INPUT state detected - time input')

// 			try {
// 				await ctx.deleteMessage()
// 			} catch (error) {
// 				console.log('Delete message error:', error.message)
// 			}

// 			await driverHandler.saveTimeInput(ctx, text)
// 			return
// 		}

// 		if (user.state === states.DRIVER_REG_DATE_MANUAL) {
// 			console.log('📅 DRIVER_REG_DATE_MANUAL state detected - manual date input')

// 			try {
// 				await ctx.deleteMessage()
// 			} catch (error) {
// 				console.log('Delete message error:', error.message)
// 			}

// 			await driverHandler.saveManualDateInput(ctx, text)
// 			return
// 		}
// 		if (user.state === states.DRIVER_REG_WORK_HOURS_CUSTOM) {
// 			console.log('✅ DRIVER_REG_WORK_HOURS_CUSTOM state detected - custom work hours')
// 			await driverHandler.saveCustomWorkHours(ctx, text)
// 			return
// 		}

// 		console.log('ℹ️ Text handled by default handler')

// 		// ============ QOLGAN TEXT HANDLERLAR ============
// 		switch (user.state) {
// 			case 'DRIVER_EDIT_FULLNAME':
// 				await driverHandler.saveEditedFullName(ctx, text)
// 				break

// 			case 'DRIVER_EDIT_PHONE':
// 				await driverHandler.saveEditedPhone(ctx, text)
// 				break

// 			case 'DRIVER_EDIT_CAR':
// 				await driverHandler.saveCarModel(ctx, text)
// 				break

// 			case 'DRIVER_REG_FULLNAME':
// 				await driverHandler.saveFullName(ctx, text)
// 				break

// 			case 'DRIVER_REG_PHONE':
// 				await driverHandler.savePhone(ctx, text)
// 				break

// 			case 'DRIVER_REG_SELECT_CAR':
// 			case 'DRIVER_REG_CAR_MODEL':
// 				await driverHandler.saveCarModel(ctx, text)
// 				break

// 			case 'PASSENGER_PARCEL_DESC':
// 				await passengerHandler.saveParcelDescription(ctx, text)
// 				break

// 			case 'PASSENGER_COMMENT':
// 				await passengerHandler.saveComment(ctx, text)
// 				break

// 			case 'PASSENGER_INFO_NAME':
// 				await passengerHandler.savePassengerName(ctx, text)
// 				break

// 			case 'PASSENGER_INFO_PHONE':
// 				await passengerHandler.savePassengerPhone(ctx, text)
// 				break
// 			default:
// 				console.log('⚠️ No matching state found for text handler')
// 				console.log('Current state:', user.state)
// 				if (text.startsWith('/')) {
// 					await ctx.reply(
// 						user.language === 'uz' ? 'Iltimos, menudan foydalaning' : 'Пожалуйста, используйте меню'
// 					)
// 				} else {
// 					await ctx.reply(
// 						user.language === 'uz'
// 							? 'ℹ️ Menyudan foydalanishingiz mumkin. /start ni bosing.'
// 							: 'ℹ️ Вы можете использовать меню. Нажмите /start.'
// 					)
// 				}
// 				break
// 		}

// 		console.log('📝 ========== TEXT HANDLER END ==========')
// 	} catch (error) {
// 		console.error('❌ Text handler error:', error)
// 		console.error('❌ Error stack:', error.stack)

// 		try {
// 			await ctx.reply("❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
// 		} catch (replyError) {
// 			console.error('Reply error:', replyError)
// 		}
// 	}
// })

bot.on('text', async ctx => {
	try {
		const user = ctx.user
		const text = ctx.message.text

		console.log('📝 ========== TEXT HANDLER START ==========')
		console.log('👤 User ID:', user.telegramId)
		console.log('📊 User state:', user.state)
		console.log('📄 Text content:', text)

		const driverHandler = require('./handlers/driver')
		const passengerHandler = require('./handlers/passenger')

		// ============ DRIVER STATES ============
		switch (user.state) {
			case states.DRIVER_REG_WORK_HOURS:
			case states.DRIVER_REG_WORK_HOURS_CUSTOM:
				console.log('🕒 Custom work hours input')
				await driverHandler.saveCustomWorkHours(ctx, text)
				break

			case states.DRIVER_REG_DATE_MANUAL:
				console.log('📅 Manual date input')
				await driverHandler.saveManualDateInput(ctx, text)
				break

			case states.DRIVER_REG_DATE_CUSTOM:
				console.log('📅 Custom date input')
				await driverHandler.saveCustomDate(ctx, text)
				break

			case states.DRIVER_REG_TIME_INPUT:
				console.log('⏰ Time input')
				await driverHandler.saveTimeInput(ctx, text)
				break

			case states.DRIVER_REG_CAR_NUMBER:
				console.log('🚗 Car number input')
				await driverHandler.saveCarNumber(ctx, text)
				break

			case states.DRIVER_EDIT_CAR_NUMBER:
				console.log('🚗 Edit car number input')
				await driverHandler.saveEditedCarNumber(ctx, text)
				break

			case 'DRIVER_REG_CAR_SEARCH':
				console.log('🔍 Car search input')
				await searchCars(ctx, text)
				break

			case states.DRIVER_EDIT_FULLNAME:
				await driverHandler.saveEditedFullName(ctx, text)
				break

			case states.DRIVER_EDIT_PHONE:
				await driverHandler.saveEditedPhone(ctx, text)
				break

			case states.DRIVER_REG_FULLNAME:
				await driverHandler.saveFullName(ctx, text)
				break

			case states.DRIVER_REG_PHONE:
				await driverHandler.savePhone(ctx, text)
				break

			case states.DRIVER_REG_SELECT_CAR:
			case states.DRIVER_REG_CAR_MODEL:
				await driverHandler.saveCarModel(ctx, text)
				break

			// ============ PASSENGER STATES ============
			case states.PASSENGER_PHONE:
				console.log('📱 Passenger phone input')
				await passengerHandler.savePassengerPhoneForOrder(ctx, text)
				break

			case states.PASSENGER_EDIT_PHONE:
				console.log('📱 Edit phone input')
				await passengerHandler.saveEditedPhone(ctx, text)
				break

			case states.PASSENGER_EDIT_PARCEL_DESC:
				console.log('📝 Edit parcel description')
				await passengerHandler.saveEditedParcelDescription(ctx, text)
				break

			case states.PASSENGER_INFO_NAME:
				await passengerHandler.savePassengerName(ctx, text)
				break

			case states.PASSENGER_INFO_PHONE:
				await passengerHandler.savePassengerPhone(ctx, text)
				break

			case states.PASSENGER_PARCEL_DESC:
				await passengerHandler.saveParcelDescription(ctx, text)
				break

			case states.PASSENGER_COMMENT:
				await passengerHandler.saveComment(ctx, text)
				break

			default:
				console.log('⚠️ No matching state found for text handler')
				console.log('Current state:', user.state)
				if (text.startsWith('/')) {
					await ctx.reply(
						user.language === 'uz'
							? 'Iltimos, menudan foydalaning'
							: 'Пожалуйста, используйте меню',
					)
				} else {
					await ctx.reply(
						user.language === 'uz'
							? 'ℹ️ Menyudan foydalanishingiz mumkin. /start ni bosing.'
							: 'ℹ️ Вы можете использовать меню. Нажмите /start.',
					)
				}
				break
		}

		console.log('📝 ========== TEXT HANDLER END ==========')
	} catch (error) {
		console.error('❌ Text handler error:', error)
		console.error('❌ Error stack:', error.stack)

		try {
			await ctx.reply("❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
		} catch (replyError) {
			console.error('Reply error:', replyError)
		}
	}
})

// bot.js faylida contact handler'ni quyidagicha o'zgartiring:

bot.on('contact', async ctx => {
	try {
		console.log('📱 ========== CONTACT HANDLER START ==========')

		// User ni tekshirish
		if (!ctx.user) {
			console.error('❌ User not found in contact handler')
			return
		}

		const user = ctx.user
		console.log('👤 User:', user.telegramId, 'State:', user.state)

		// Contact mavjudligini tekshirish
		if (!ctx.message || !ctx.message.contact) {
			console.error('❌ Contact not found in message')
			return
		}

		const contact = ctx.message.contact
		console.log('📞 Contact received:', contact.phone_number)

		// Holat bo'yicha handlerlarni chaqirish
		if (user.state === states.PASSENGER_PHONE) {
			console.log('📱 PASSENGER_PHONE state - handling contact')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.handleContactPhone(ctx)
			return
		}
		if (user.state === states.PASSENGER_EDIT_PHONE) {
			console.log('📱 PASSENGER_EDIT_PHONE state - handling contact')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.saveEditedPhone(ctx, contact.phone_number)
			return
		}

		if (user.state === states.PASSENGER_INFO_PHONE) {
			console.log('📱 PASSENGER_INFO_PHONE state - handling contact')
			const passengerHandler = require('./handlers/passenger')
			await passengerHandler.savePassengerPhone(ctx, contact.phone_number)
			return
		}

		if (
			user.state === states.DRIVER_REG_PHONE ||
			user.state === states.DRIVER_EDIT_PHONE
		) {
			console.log('📱 DRIVER_PHONE state - handling contact')
			const driverHandler = require('./handlers/driver')
			await driverHandler.savePhone(ctx, contact.phone_number)
			return
		}

		// Boshqa holatlar uchun standart xabar
		console.log('ℹ️ Default contact handler')
		await ctx.reply(
			user.language === 'uz'
				? '✅ Telefon raqamingiz qabul qilindi.'
				: '✅ Ваш номер телефона принят.',
		)

		console.log('📱 ========== CONTACT HANDLER END ==========')
	} catch (error) {
		console.error('❌ Contact handler error:', error)
		console.error('❌ Error stack:', error.stack)
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
			status: 'active',
		})
		for (const driver of expiredDrivers) {
			driver.status = 'inactive'
			await driver.save()

			try {
				await bot.telegram.sendMessage(
					driver.telegramId,
					"⚠️ Sizning obunangiz tugadi. Faollashtirish uchun to'lov qiling.",
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
	const user = ctx.user

	try {
		// Avvalgi xabarni o'chirish
		await ctx.deleteMessage().catch(() => {
			console.log('Delete message failed, continuing...')
		})
	} catch (error) {
		console.log('Delete message error:', error.message)
	}

	// Asosiy menyuni ko'rsatish
	const { message, keyboard } = keyboards.showMainMenu(ctx, user.language)

	await ctx.reply(message, {
		reply_markup: keyboard,
		parse_mode: 'HTML',
	})

	user.state = states.MAIN_MENU
	await user.save()
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

		console.log(
			`🚕 Haydovchi tanlandi: driverId=${driverId}, orderId=${orderId}`,
		)

		// Order handler bilan ishlash
		const orderHandler = require('./handlers/order')
		await orderHandler.handleDriverSelection(ctx, driverId, orderId)

		await ctx.answerCbQuery()
	} catch (error) {
		console.error('Select driver callback error:', error)
		await ctx.answerCbQuery(
			user?.language === 'uz' ? '❌ Xatolik yuz berdi' : '❌ Произошла ошибка',
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
bot.action('main_menu', async ctx => {
	const user = ctx.user

	console.log('🏠 Main menu callback, user role:', user.role)

	try {
		// Avvalgi xabarni o'chirish
		await ctx.deleteMessage().catch(() => {
			console.log('Delete message failed, continuing...')
		})
	} catch (error) {
		console.log('Delete message error:', error.message)
	}

	// RO'LGA QARAB ASOSIY MENYU KO'RSATISH
	if (user.role === 'driver') {
		// DRIVER rolida
		const message =
			user.language === 'uz'
				? `🏠 Asosiy menyu\n\n` + `Quyidagilardan birini tanlang:`
				: `🏠 Главное меню\n\n` + `Выберите одно из следующих:`

		const keyboard = {
			inline_keyboard: [
				[
					{
						text:
							user.language === 'uz'
								? '🚘 Haydovchi menyusi'
								: '🚘 Меню водителя',
						callback_data: 'driver_info',
					},
				],
				[
					{
						text:
							user.language === 'uz'
								? "🔄 Xizmatni o'zgartirish"
								: '🔄 Изменить услугу',
						callback_data: 'switch_to_user',
					},
				],
			],
		}

		await ctx.reply(message, { reply_markup: keyboard })
	} else if (user.role === 'user') {
		// USER rolida
		const message =
			user.language === 'uz' ? `🏠 Asosiy menyu\n\n` + `Quyidagilardan birini tanlang:`
				: `🏠 Главное меню\n\n` + `Выберите одно из следующих:`

		const keyboard = {
			inline_keyboard: [
				[
					{
						text:
							user.language === 'uz'
								? '🚖 Taksiga buyurtma berish'
								: '🚖 Заказать такси',
						callback_data: 'need_taxi',
					},
				],

				[
					{
						text:
							user.language === 'uz'
								? "🔄 Xizmatni o'zgartirish"
								: '🔄 Изменить услугу',
						callback_data: 'switch_to_driver',
					},
				],
			],
		}

		await ctx.reply(message, { reply_markup: keyboard })
	} else {
		// ROL TANLAMAGANLAR UCHUN
		const message =
			user.language === 'uz'
				? `🏠 Asosiy menyu\n\n` + `Quyidagilardan birini tanlang:`
				: `🏠 Главное меню\n\n` + `Выберите одно из следующих:`

		const keyboard = {
			inline_keyboard: [
				[
					{
						text: user.language === 'uz' ? '🚖 Taksi kerak' : '🚖 Нужно такси',
						callback_data: 'need_taxi',
					},
					{
						text:
							user.language === 'uz' ? '🚘 Taksi xizmati' : '🚘 Такси сервис',
						callback_data: 'taxi_service',
					},
				],
			],
		}

		await ctx.reply(message, { reply_markup: keyboard })
	}

	user.state = states.MAIN_MENU
	await user.save()
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
const switchServiceRole = async ctx => {
	const user = ctx.user

	console.log('🔀 ========== switchServiceRole START ==========')
	console.log('👤 Current role:', user.role)
	console.log('👤 Telegram ID:', user.telegramId)

	try {
		// Avval oldingi xabarni o'chirish
		try {
			await ctx.deleteMessage()
		} catch (error) {
			console.log('Delete message error:', error.message)
		}

		// O'ZGARTIRISH NIYATI
		const currentRole = user.role
		let newRole

		if (currentRole === 'user') {
			newRole = 'driver'
		} else if (currentRole === 'driver') {
			newRole = 'user'
		} else {
			// Agar role 'none' bo'lsa
			newRole = 'user'
		}

		console.log(`🔄 Switching from ${currentRole} to ${newRole}`)

		// User ro'li yangilash
		user.role = newRole
		await user.save()

		const driverHandler = require('./handlers/driver')

		if (newRole === 'driver') {
			// YANGI DRIVER SIFATIDA
			console.log('🚗 Checking driver profile for new driver role...')
			const driver = await Driver.findOne({ telegramId: user.telegramId })

			if (driver) {
				// Driver profili mavjud
				console.log('✅ Existing driver profile found')

				if (driver.status === 'active') {
					// Faol driver - driver menyusi
					await driverHandler.showDriverMenu(ctx)
				} else {
					// Nofaol driver - nofaol menyusi
					await driverHandler.showInactiveDriverMenu(ctx, driver)
				}
			} else {
				// Driver profili yo'q - ro'yxatdan o'tish
				console.log('❌ Driver profile not found, starting registration')
				await driverHandler.startRegistration(ctx)
			}
		} else if (newRole === 'user') {
			// YANGI USER SIFATIDA
			console.log('🚖 Showing passenger menu for new user role')

			const { message, keyboard } = keyboards.showMainMenu(ctx, user.language)
			await ctx.reply(message, {
				reply_markup: keyboard,
				parse_mode: 'HTML',
			})
			user.state = states.MAIN_MENU
			await user.save()
		}

		const successMessage =
			user.language === 'uz'
				? `✅ <b>Xizmat muvaffaqiyatli o'zgartirildi!</b>\n\n` +
					`Siz endi <b>${newRole === 'driver' ? 'haydovchi' : "yo'lovchi"}</b> sifatida ishlaysiz.`
				: `✅ <b>Услуга успешно изменена!</b>\n\n` +
					`Теперь вы работаете как <b>${newRole === 'driver' ? 'водитель' : 'пассажир'}</b>.`

		const keyboard = {
			inline_keyboard: [
				[
					{
						text:
							user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
						callback_data: 'main_menu',
					},
				],
			],
		}

		await ctx.telegram.sendMessage(user.telegramId, successMessage, {
			parse_mode: 'HTML',
		})
	} catch (error) {
		console.error('❌ Switch service role error:', error)
		console.error('❌ Error stack:', error.stack)

		await ctx.reply(
			user.language === 'uz'
				? "❌ Xizmatni o'zgartirishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
				: '❌ Ошибка при изменении услуги. Пожалуйста, попробуйте еще раз.',
		)
	}

	console.log('🔀 ========== switchServiceRole END ==========')
}

bot.action('switch_to_user', async ctx => {
	console.log('🔄 switch_to_user callback')
	await switchServiceRole(ctx)
})

bot.action('switch_to_driver', async ctx => {
	console.log('🔄 switch_to_driver callback')
	await switchServiceRole(ctx)
})
// Main menu callback handlerga qo'shing
bot.action('main_menu', async ctx => {
	const user = ctx.user

	console.log('🏠 Main menu callback called')

	try {
		// Avvalgi xabarni o'chirish
		try {
			await ctx.deleteMessage()
		} catch (error) {
			console.log('Delete message error:', error.message)
		}
	} catch (error) {
		console.log('Delete message error:', error.message)
	}

	// Asosiy menyuni ko'rsatish
	const { message, keyboard } = keyboards.showMainMenu(ctx, user.language)

	await ctx.reply(message, {
		reply_markup: keyboard,
		parse_mode: 'HTML',
	})

	user.state = states.MAIN_MENU
	await user.save()
})

// index.js faylida callback handler'lar qatoriga qo'shing:
bot.action('main_menu', async ctx => {
	const user = ctx.user

	try {
		// Avvalgi xabarni o'chirish
		await ctx.deleteMessage().catch(() => {
			console.log('Delete message failed, continuing...')
		})
	} catch (error) {
		console.log('Delete message error:', error.message)
	}

	// Asosiy menyuni ko'rsatish
	const { message, keyboard } = keyboards.showMainMenu(ctx, user.language)

	await ctx.reply(message, {
		reply_markup: keyboard,
		parse_mode: 'HTML',
	})

	user.state = states.MAIN_MENU
	await user.save()
})
bot.action('driver_info', async ctx => {
	await ctx.answerCbQuery()
	const driver = await Driver.findOne({ telegramId: ctx.user.telegramId })
	if (driver) {
		if (driver.status === 'active') {
			await driverHandler.showDriverMenu(ctx)
		} else {
			await driverHandler.showInactiveDriverMenu(ctx, driver)
		}
	} else {
		await ctx.reply(
			ctx.user.language === 'uz'
				? '❌ Haydovchi profilingiz topilmadi.'
				: '❌ Ваш профиль водителя не найден.',
			await driverHandler.startRegistration(ctx),
		)
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
						error.message,
					)

					// if (retryCount < maxRetries - 1) {
					// 	// Kuting va qayta urinib ko'ring
					// 	const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Exponential backoff
					// 	console.log(`⏳ ${delay / 1000} soniyadan keyin qayta uriniladi...`)

					// 	setTimeout(() => {
					// 		startPolling(retryCount + 1, maxRetries)
					// 	}, delay)
					// } else {
					// 	console.error('❌ Maksimal qayta urinishlar soniga yetildi. Bot ishga tushmadi.')
					// }
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
