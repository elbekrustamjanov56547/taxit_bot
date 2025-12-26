require('dotenv').config()
const { Telegraf, session } = require('telegraf')
const mongoose = require('mongoose')
const cron = require('node-cron')

// Import handlers
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
	try {
		const user = ctx.user

		if (user.language && user.language !== '') {
			const message = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'
			await ctx.reply(message, keyboards.mainMenuKeyboard(user.language, user.isAdmin))
			user.state = states.MAIN_MENU
			await user.save()
		} else {
			const message =
				user.language === 'uz'
					? '👋 Assalomu alaykum! Iltimos, tilni tanlang:'
					: '👋 Здравствуйте! Пожалуйста, выберите язык:'

			await ctx.reply(message, keyboards.languageKeyboard())
			user.state = states.START
			await user.save()
		}
	} catch (error) {
		console.error('Start error:', error)
	}
})

// Callback query handler

// Callback query handler
bot.on('callback_query', async ctx => {
	try {
		const callbackData = ctx.callbackQuery.data
		const user = ctx.user

		// ============ ADMIN CALLBACKS ============
		if (callbackData.startsWith('admin_')) {
			// ... admin callback'lar ...
			return
		}

		// ============ LANGUAGE SELECTION ============
		if (callbackData.startsWith('lang_')) {
			// ... til tanlash ...
			return
		}

		// ============ PASSENGER FLOW CALLBACKS ============
		// Yo'lovchilar sonini tanlash
		if (callbackData.startsWith('passengers_')) {
			await passengerHandler.selectPassengerCount(ctx, callbackData)
			await ctx.answerCbQuery()
			return
		}
		
		// ============ DRIVER FLOW CALLBACKS ============
		// Maksimal yo'lovchilar sonini tanlash
		if (callbackData.startsWith('max_passengers_')) {
			await driverHandler.selectMaxPassengers(ctx, callbackData)
			await ctx.answerCbQuery()
			return
		}

		// ============ MAIN MENU ============
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
						keyboards.mainMenuKeyboard(user.language, user.isAdmin)
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
				// Mashina modelini tanlash
				else if (callbackData.startsWith('car_select_')) {
					await driverHandler.selectCarCallback(ctx, callbackData)
				}
				// Mashina turini tanlash
				else if (callbackData.startsWith('car_type_')) {
					await driverHandler.selectCarTypeCallback(ctx, callbackData)
				}
				// Chiqish viloyati
				else if (callbackData.startsWith('driver_from_')) {
					await driverHandler.selectFromRegion(ctx, callbackData)
				}
				// Kirish viloyati
				else if (callbackData.startsWith('driver_to_')) {
					await driverHandler.selectToRegion(ctx, callbackData)
				}
				// Xizmat turini tanlash
				else if (callbackData.startsWith('service_')) {
					await driverHandler.selectServiceType(ctx, callbackData)
				}
				// ============ DATE & TIME ============
				// Sana tanlash
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
				// Endi text emas, callback orqali mashina tanlanadi
				// Qo'lda mashina modelini kiritish uchun qolgan holat
				await driverHandler.saveCarModel(ctx, text)
				break
			case states.DRIVER_REG_CAR_MODEL:
				// Qo'lda mashina modelini kiritish
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

// To'lov bosilganda
bot.action('driver_payment', async ctx => {
    const user = ctx.user;
    
    // Haydovchi ma'lumotlarini olish
    const driver = await Driver.findOne({ telegramId: user.telegramId })
        .populate('carModel')
        .populate('carType');
    
    if (driver) {
        // Admin bilan bog'lanish xabarini ko'rsatish
        await driverFunctions.showAdminContactForDriver(ctx, driver);
    } else {
        await ctx.reply(
            user.language === 'uz' 
                ? '❌ Haydovchi profili topilmadi' 
                : '❌ Профиль водителя не найден'
        );
    }
});

// Serverni ishga tushirish
// const startServer = async () => {
// 	try {
// 		// Environment'ni tekshirish
// 		const isProduction = process.env.NODE_ENV === 'production'

// 		if (isProduction) {
// 			// Production (Render.com) uchun webhook
// 			const hostname = process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:5000'
// 			const webhookUrl = `https://${hostname}/webhook/${process.env.BOT_TOKEN}`

// 			console.log(`Production mode - Setting webhook to: ${webhookUrl}`)

// 			try {
// 				await bot.telegram.setWebhook(webhookUrl)
// 				console.log('✅ Webhook successfully set')
// 			} catch (error) {
// 				console.error('❌ Failed to set webhook:', error.message)
// 				// Webhook o'rnatishda xatolik bo'lsa ham serverni ishga tushiramiz
// 			}
// 		} else {
// 			// Development uchun polling
// 			console.log('Development mode - Using polling')
// 			bot
// 				.launch()
// 				.then(() => console.log('✅ Bot polling mode da ishga tushdi'))
// 				.catch(error => console.error('❌ Botni ishga tushirishda xatolik:', error))
// 		}

// 		// Express serverni ishga tushirish
// 		app.listen(PORT, () => {
// 			console.log(`🌐 Server ${PORT} portda ishga tushdi`)
// 			if (isProduction) {
// 				console.log(`🤖 Bot webhook mode da ishlayapti`)
// 			}
// 		})

// 		// Graceful shutdown
// 		process.once('SIGINT', () => bot.stop('SIGINT'))
// 		process.once('SIGTERM', () => bot.stop('SIGTERM'))
// 	} catch (error) {
// 		console.error('Server start error:', error)
// 	}
// }

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
					console.error(`❌ Botni ishga tushirishda xatolik (${retryCount + 1}/${maxRetries}):`, error.message)
					
					if (retryCount < maxRetries - 1) {
						// Kuting va qayta urinib ko'ring
						const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Exponential backoff
						console.log(`⏳ ${delay/1000} soniyadan keyin qayta uriniladi...`)
						
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
