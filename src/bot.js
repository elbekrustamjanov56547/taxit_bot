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
				role: '', // Bo'sh string
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
	await startHandler.startHandler(ctx)
})

// Callback query handler
bot.on('callback_query', async ctx => {
	try {
		const callbackData = ctx.callbackQuery.data
		const user = ctx.user

		console.log('Callback received:', callbackData)

		// Callback javobini darhol berish
		await ctx.answerCbQuery()

		// ============ LANGUAGE SELECTION ============
		if (callbackData.startsWith('lang_')) {
			await startHandler.handleLanguageSelection(ctx, callbackData)
			return
		}

		// ============ ROLE SELECTION ============
		if (callbackData.startsWith('role_')) {
			await startHandler.handleRoleSelection(ctx, callbackData)
			return
		}

		// ============ ADMIN CALLBACKS ============
		if (callbackData.startsWith('admin_')) {
			// ... admin callback'lar ...
			return
		}

		// ============ PASSENGER FLOW CALLBACKS ============
		if (callbackData.startsWith('passengers_')) {
			await passengerHandler.selectPassengerCount(ctx, callbackData)
			return
		}

		if (callbackData.startsWith('max_passengers_')) {
			if (user.state === states.DRIVER_EDIT_PASSENGERS) {
				await driverHandler.saveEditedPassengers(ctx, callbackData)
			} else {
				await driverHandler.selectMaxPassengers(ctx, callbackData)
			}
			return
		}

		// Mashina modelini tanlash
		if (callbackData.startsWith('car_select_')) {
			if (user.state === states.DRIVER_EDIT_CAR) {
				await driverHandler.selectCarCallback(ctx, callbackData)
				// Mashina tanlagandan keyin avtomatik sahifaga qaytish
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

		// Chiqish viloyati
		if (callbackData.startsWith('driver_from_')) {
			if (user.state === states.DRIVER_EDIT_ROUTE_FROM) {
				await driverHandler.saveEditedRouteFrom(ctx, callbackData)
			} else {
				await driverHandler.selectFromRegion(ctx, callbackData)
			}
			return
		}

		// Kirish viloyati
		if (callbackData.startsWith('driver_to_')) {
			if (user.state === states.DRIVER_EDIT_ROUTE_TO) {
				await driverHandler.saveEditedRouteTo(ctx, callbackData)
			} else {
				await driverHandler.selectToRegion(ctx, callbackData)
			}
			return
		}

		// Xizmat turini tanlash
		if (callbackData.startsWith('service_')) {
			if (user.state === states.DRIVER_EDIT_SERVICES) {
				await driverHandler.saveEditedServices(ctx, callbackData)
			} else {
				await driverHandler.selectServiceType(ctx, callbackData)
			}
			return
		}

		// ============ MAIN MENU ============
		switch (callbackData) {
			case 'driver_info':
				// Ma'lumotlar
				const driver = await Driver.findOne({ telegramId: user.telegramId })

				if (driver) {
					if (driver.status === 'active') {
						await driverHandler.showDriverMenu(ctx)
					} else {
						await driverHandler.showInactiveDriverMenu(ctx, driver)
					}
				} else {
					// Agar user roli driver bo'lsa, lekin driver profili yo'q
					if (user.role === 'driver') {
						await ctx.reply(
							user.language === 'uz'
								? '🚘 Siz haydovchi sifatida tanlangansiz, ammo haydovchi profilingiz hali yaratilmagan yoki topilmadi.\n\nIltimos, ro‘yxatdan o‘tish jarayonini qayta boshlang.'
								: '🚘 Вы выбрали роль водителя, однако профиль водителя не был найден.\n\nПожалуйста, пройдите регистрацию заново.'
						)
					}

					// Ro'yxatdan o'tishni boshlash
					await driverHandler.startRegistration(ctx)
				}
				break

			case 'driver_payment':
				console.log('Driver payment callback triggered')
				await driverHandler.handleDriverPayment(ctx)
				break

			case 'driver_edit':
				await driverHandler.showDriverEditMenu(ctx)
				break

			case 'edit_fullname':
				await driverHandler.editFullName(ctx)
				break

			case 'edit_phone':
				await driverHandler.editPhone(ctx)
				break

			case 'edit_car':
				await driverHandler.editCar(ctx)
				break

			case 'edit_passengers':
				await driverHandler.editPassengers(ctx)
				break

			case 'edit_route':
				await driverHandler.editRoute(ctx)
				break

			case 'edit_services':
				await driverHandler.editServices(ctx)
				break

			case 'edit_time':
				await driverHandler.editTime(ctx)
				break

			case 'main_menu':
				// Asosiy menyuga qaytish
				try {
					await ctx.deleteMessage()
				} catch (error) {
					console.log('Delete message for main_menu error:', error.message)
				}

				await ctx.reply(
					user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
					keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role)
				)
				user.state = states.MAIN_MENU
				await user.save()
				break

			case 'close_menu':
				// Menyuni yopish - faqat xabarni o'chirish
				try {
					await ctx.deleteMessage()
				} catch (error) {
					console.log('Delete message error:', error.message)
				}
				break

			case 'need_taxi':
				await passengerHandler.startOrder(ctx)
				break

			case 'taxi_service':
				// Agar user roli driver bo'lsa, lekin driver profili yo'q
				if (user.role === 'driver') {
					const existingDriver = await Driver.findOne({ telegramId: user.telegramId })

					if (existingDriver) {
						if (existingDriver.status === 'active') {
							await driverHandler.showDriverMenu(ctx)
						} else {
							await driverHandler.showInactiveDriverMenu(ctx, existingDriver)
						}
					} else {
						await ctx.reply(
							user.language === 'uz'
								? '🚘 Haydovchi profilingiz topilmadi.\n\nKeling, ro‘yxatdan o‘tishni boshlaymiz.'
								: '🚘 Профиль водителя не найден.\n\nДавайте начнём регистрацию.'
						)

						await driverHandler.startRegistration(ctx)
					}
				} else {
					// Oddiy ro'yxatdan o'tish
					await driverHandler.startRegistration(ctx)
				}
				break

			case 'my_orders':
				await passengerHandler.showMyOrders(ctx)
				break

			case 'confirm':
				if (user.state === states.DRIVER_REG_CONFIRM) {
					await driverHandler.saveProfile(ctx)
				} else if (user.state === states.PASSENGER_CONFIRM) {
					await passengerHandler.confirmOrder(ctx)
				}
				break

			case 'cancel':
				if (user.state === states.DRIVER_REG_CONFIRM) {
					await ctx.reply('❌ Bekor qilindi')
					user.state = states.MAIN_MENU
					await user.save()
					await ctx.reply(
						'🏠 Asosiy menyu',
						keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role)
					)
				} else if (user.state === states.PASSENGER_CONFIRM) {
					await passengerHandler.cancelOrder(ctx)
				}
				break

			default:
				// ============ PASSENGER FLOW ============
				if (callbackData.startsWith('from_') && !callbackData.startsWith('driver_')) {
					await passengerHandler.selectFromRegion(ctx, callbackData)
				} else if (callbackData.startsWith('to_') && !callbackData.startsWith('driver_')) {
					await passengerHandler.selectToRegion(ctx, callbackData)
				} else if (callbackData.startsWith('parcel_')) {
					await passengerHandler.selectParcel(ctx, callbackData)
				}
				// ============ DRIVER FLOW ============
				// Mashina turini tanlash
				else if (callbackData.startsWith('car_type_')) {
					await driverHandler.selectCarTypeCallback(ctx, callbackData)
				}
				// ============ DATE & TIME ============
				else if (callbackData.startsWith('date_')) {
					await driverHandler.selectDate(ctx, callbackData)
				}
				// Vaqt tanlash
				else if (callbackData.startsWith('time_')) {
					await driverHandler.selectTime(ctx, callbackData)
				}
				// ============ GENERAL ============
				else if (callbackData === 'add_comment') {
					await passengerHandler.addComment(ctx)
				} else if (callbackData === 'skip_comment') {
					await passengerHandler.skipComment(ctx)
				}
				break
		}
	} catch (error) {
		console.error('Callback error:', error)
		console.error('Error details:', error.stack)
		try {
			await ctx.answerCbQuery('❌ Xatolik yuz berdi')
		} catch (e) {
			console.error('Answer callback error:', e)
		}
	}
})

// Text message handler
bot.on('text', async ctx => {
	try {
		const user = ctx.user
		const text = ctx.message.text

		// ============ ADMIN PAYMENT ADD ============
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

		// ============ STATE BASED ACTIONS ============
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
				if (text.startsWith('/')) {
					await ctx.reply(
						user.language === 'uz' ? 'Iltimos, menudan foydalaning' : 'Пожалуйста, используйте меню'
					)
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
