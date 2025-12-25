require('dotenv').config()
const { Telegraf, session } = require('telegraf')
const mongoose = require('mongoose')
const cron = require('node-cron')

// Import handlers
const startHandler = require('./handlers/start')
const passengerHandler = require('./handlers/passenger')
const driverHandler = require('./handlers/driver')
const adminHandler = require('./handlers/admin')

// Import models
const User = require('./models/User')
const Driver = require('./models/Driver')
const Order = require('./models/Order')

// Import keyboards
const keyboards = require('./keyboards/main')

// Import states
const states = require('./utils/states')

// Bot yaratish
const bot = new Telegraf(process.env.BOT_TOKEN)

// Session middleware - to'g'ri konfiguratsiya
bot.use(
	session({
		// Session ni default qiymatlari
		defaultSession: () => ({
			driverData: {},
			orderId: null,
			tempData: {}
		})
	})
)

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
bot.use(async (ctx, next) => {
	try {
		const userId = ctx.from?.id
		if (!userId) return next()

		// Foydalanuvchi mavjudligini tekshirish
		let user = await User.findOne({ telegramId: userId })

		if (!user) {
			// Yangi foydalanuvchi yaratish
			user = new User({
				telegramId: userId,
				username: ctx.from.username || '',
				firstName: ctx.from.first_name || '',
				lastName: ctx.from.last_name || '',
				language: 'uz',
				state: states.START,
				lastActivity: new Date()
			})
			await user.save()
		} else {
			// Faollikni yangilash
			user.lastActivity = new Date()
			await user.save()
		}

		// Admin ekanligini tekshirish va ctx ga qo'shish
		const isAdmin = ADMIN_IDS.includes(user.telegramId)
		ctx.user = user
		ctx.user.isAdmin = isAdmin

		// Sessionni ishga tushirish
		if (!ctx.session) {
			ctx.session = {
				driverData: {},
				orderId: null,
				tempData: {}
			}
		}

		// Oldingi xabarni o'chirish (callback bo'lsa)
		if (ctx.callbackQuery) {
			try {
				await ctx.deleteMessage()
			} catch (e) {
				console.log("Xabarni o'chirishda xatolik:", e.message)
			}
		}

		await next()
	} catch (error) {
		console.error('Middleware error:', error)
	}
})

// /start command
bot.start(async ctx => {
	try {
		const user = ctx.user

		// Agar til allaqachon tanlangan bo'lsa, asosiy menyuni ko'rsatish
		if (user.language && user.language !== '') {
			const message = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'

			await ctx.reply(message, keyboards.mainMenuKeyboard(user.language, user.isAdmin))

			user.state = states.MAIN_MENU
			await user.save()
		} else {
			// Til tanlash
			const message =
				user.language === 'uz'
					? '👋 Assalomu alaykum! Iltimos, tilni tanlang:'
					: '👋 Здравствуйте! Пожалуйста, выберите язык:'

			await ctx.reply(message, keyboards.languageKeyboard())

			// State ni yangilash
			user.state = states.START
			await user.save()
		}
	} catch (error) {
		console.error('Start error:', error)
	}
})

// Callback query handler
bot.on('callback_query', async ctx => {
	try {
		const callbackData = ctx.callbackQuery.data
		const user = ctx.user

	if (!ctx.session) {
		ctx.session = {
			driverData: {},
			orderId: null,
			tempData: {}
		}
	}

	// Admin callback'lari (birinchi tekshirish)
	if (callbackData.startsWith('admin_')) {
		switch (true) {
			case callbackData === 'admin':
			case callbackData === 'admin_menu':
				await adminHandler.showAdminMenu(ctx)
				break

			// ✅ TO'G'RI: Haydovchi ma'lumotlari
			case callbackData.startsWith('admin_driver_'):
				const driverId = callbackData.replace('admin_driver_', '')
				await adminHandler.showDriverDetails(ctx, driverId)
				break

			// ✅ TO'G'RI: Haydovchi holatini o'zgartirish
			case callbackData.startsWith('admin_toggle_'):
				const toggleDriverId = callbackData.replace('admin_toggle_', '')
				await adminHandler.toggleDriverStatus(ctx, toggleDriverId)
				break

			// ✅ TO'G'RI: To'lov qo'shish bosqichi
			case callbackData.startsWith('admin_payment_'):
				const paymentDriverId = callbackData.replace('admin_payment_', '')
				await adminHandler.addPaymentStep(ctx, paymentDriverId)
				break

			// ✅ TO'G'RI: Xabar yuborish bosqichi
			case callbackData.startsWith('admin_message_'):
				const messageDriverId = callbackData.replace('admin_message_', '')
				await adminHandler.sendMessageStep(ctx, messageDriverId)
				break

			// ✅ TO'G'RI: Haydovchilar ro'yxati
			case callbackData === 'admin_drivers':
				await adminHandler.showDrivers(ctx, 0)
				break

			// ✅ TO'G'RI: Pagination
			case callbackData.startsWith('admin_drivers_page_'):
				const page = parseInt(callbackData.replace('admin_drivers_page_', ''))
				await adminHandler.showDrivers(ctx, page)
				break

			// ✅ TO'G'RI: Faol haydovchilar
			case callbackData === 'admin_drivers_active':
				await adminHandler.showActiveDrivers(ctx)
				break

			// ✅ TO'G'RI: Nofaol haydovchilar
			case callbackData === 'admin_drivers_inactive':
				await adminHandler.showInactiveDrivers(ctx)
				break

			// Foydalanuvchilar ro'yxati
			case callbackData === 'admin_users':
				await adminHandler.showUsers(ctx)
				break

			// Buyurtmalar ro'yxati
			case callbackData === 'admin_orders':
				await adminHandler.showOrders(ctx)
				break

			// Statistika
			case callbackData === 'admin_stats':
				await adminHandler.showStats(ctx)
				break

			// ❌ OLIB TASHLASH: Qo'shimcha admin_driver_view_ qismi
			// Bu callbackData admin.js da yo'q
			// case callbackData.startsWith('admin_driver_view_'):
			//     await adminHandler.viewDriver(ctx, callbackData);
			//     break;

			default:
				// Agar boshqa admin callback bo'lsa
				await ctx.reply(
					user.language === 'uz'
						? "⚠️ Admin funksiyasi hali qo'shilmagan"
						: '⚠️ Функция администратора еще не добавлена'
				)
				break
		}
		await ctx.answerCbQuery()
		return
	}
		// Til tanlash
		if (callbackData.startsWith('lang_')) {
			user.language = callbackData.split('_')[1]
			user.state = states.MAIN_MENU
			await user.save()

			const message = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'

			await ctx.reply(message, keyboards.mainMenuKeyboard(user.language, user.isAdmin))
			await ctx.answerCbQuery()
			return
		}

		// Asosiy menyu
		switch (callbackData) {
			case 'need_taxi':
				await passengerHandler.startOrder(ctx)
				break
			case 'taxi_service':
				await driverHandler.startRegistration(ctx)
				break
			case 'my_orders':
				await passengerHandler.showMyOrders(ctx)
				break
			case 'admin':
				await adminHandler.showAdminMenu(ctx)
				break

			// Tasdiqlash va bekor qilish
			case 'confirm':
				// Qaysi holatda ekanligini tekshirish
				if (user.state === states.DRIVER_REG_CONFIRM) {
					await driverHandler.saveProfile(ctx)
				} else if (user.state === states.PASSENGER_CONFIRM) {
					await passengerHandler.confirmOrder(ctx)
				}
				break
			case 'cancel':
				// Qaysi holatda ekanligini tekshirish
				if (user.state === states.DRIVER_REG_CONFIRM) {
					await ctx.reply('❌ Bekor qilindi')
					user.state = states.MAIN_MENU
					await user.save()
					await ctx.reply(
						'🏠 Asosiy menyu',
						keyboards.mainMenuKeyboard(user.language, user.isAdmin)
					)
				} else if (user.state === states.PASSENGER_CONFIRM) {
					await passengerHandler.cancelOrder(ctx)
				}
				break
			default:
				// Yo'lovchi flow
				if (callbackData.startsWith('from_') && !callbackData.startsWith('driver_')) {
					await passengerHandler.selectFromRegion(ctx, callbackData)
				} else if (callbackData.startsWith('to_') && !callbackData.startsWith('driver_')) {
					await passengerHandler.selectToRegion(ctx, callbackData)
				} else if (callbackData.startsWith('parcel_')) {
					await passengerHandler.selectParcel(ctx, callbackData)
				}
				// Haydovchi flow
				else if (callbackData.startsWith('driver_from_')) {
					await driverHandler.selectFromRegion(ctx, callbackData)
				} else if (callbackData.startsWith('driver_to_')) {
					await driverHandler.selectToRegion(ctx, callbackData)
				} else if (callbackData.startsWith('service_')) {
					await driverHandler.selectServiceType(ctx, callbackData)
				}
				// Sana va vaqt tanlash
				else if (callbackData.startsWith('date_')) {
					await driverHandler.selectDate(ctx, callbackData)
				} else if (callbackData.startsWith('time_')) {
					await driverHandler.selectTime(ctx, callbackData)
				}
				// Umumiy
				else if (callbackData === 'add_comment') {
					await passengerHandler.addComment(ctx)
				} else if (callbackData === 'skip_comment') {
					await passengerHandler.skipComment(ctx)
				}
				break
		}

		await ctx.answerCbQuery()
	} catch (error) {
		console.error('Callback error:', error)
		console.error('Error details:', error.stack)
		await ctx.answerCbQuery('❌ Xatolik yuz berdi')
	}
})

// Text message handler
bot.on('text', async ctx => {
	try {
		const user = ctx.user
		const text = ctx.message.text

		// Sessionni tekshirish
		if (!ctx.session) {
			ctx.session = {
				driverData: {},
				orderId: null,
				tempData: {}
			}
		}

		// Admin to'lov qo'shish
		if (ctx.session?.adminAction === 'add_payment' && ctx.session?.adminDriverId) {
			const amount = parseInt(text)
			if (isNaN(amount) || amount <= 0) {
				await ctx.reply("❌ Noto'g'ri miqdor. Iltimos, raqam kiriting:")
				return
			}

			const driver = await Driver.findOne({ telegramId: ctx.session.adminDriverId })
			if (driver) {
				driver.balance += amount
				await driver.save()

				const message =
					user.language === 'uz'
						? `✅ Haydovchi balansi yangilandi!\n\n${
								driver.fullName
						  }\n💰 Qo'shilgan summa: ${amount.toLocaleString()} so'm\n💳 Yangi balans: ${driver.balance.toLocaleString()} so'm`
						: `✅ Баланс водителя обновлен!\n\n${
								driver.fullName
						  }\n💰 Добавленная сумма: ${amount.toLocaleString()} сум\n💳 Новый баланс: ${driver.balance.toLocaleString()} сум`

				await ctx.reply(message)

				// Haydovchiga xabar
				try {
					await ctx.telegram.sendMessage(
						driver.telegramId,
						user.language === 'uz'
							? `💰 Sizning balansingizga ${amount.toLocaleString()} so'm qo'shildi.\n\n💳 Joriy balans: ${driver.balance.toLocaleString()} so'm\n🎉 Rahmat!`
							: `💰 На ваш баланс добавлено ${amount.toLocaleString()} сум.\n\n💳 Текущий баланс: ${driver.balance.toLocaleString()} сум\n🎉 Спасибо!`
					)
				} catch (error) {
					console.error('Driver notification error:', error)
				}
			}

			// Sessionni tozalash
			delete ctx.session.adminAction
			delete ctx.session.adminDriverId

			// Admin menyusiga qaytish
			await adminHandler.showAdminMenu(ctx)
			return
		}

		// State bo'yicha harakat
		switch (user.state) {
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
			case states.DRIVER_REG_CAR_MODEL:
				await driverHandler.saveCarModel(ctx, text)
				break
			default:
				// Agar command bo'lsa
				if (text.startsWith('/')) {
					await ctx.reply('Iltimos, menudan foydalaning')
				}
				break
		}
	} catch (error) {
		console.error('Text handler error:', error)
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

// Cron job: Haydovchi statusini tekshirish
cron.schedule('0 0 * * *', async () => {
	try {
		const expiredDrivers = await Driver.find({
			paidUntil: { $lt: new Date() },
			status: 'active'
		})

		for (const driver of expiredDrivers) {
			driver.status = 'inactive'
			await driver.save()

			// Haydovchiga xabar yuborish
			await bot.telegram.sendMessage(
				driver.telegramId,
				"⚠️ Sizning obunangiz tugadi. Faollashtirish uchun to'lov qiling."
			)
		}

		console.log(`Expired drivers checked: ${expiredDrivers.length}`)
	} catch (error) {
		console.error('Cron job error:', error)
	}
})

// Botni ishga tushirish
bot.launch().then(() => {
	console.log('Bot ishga tushdi!')
})

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
