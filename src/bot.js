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


// Callback query handler - birlashtirilgan versiya
bot.on('callback_query', async ctx => {
    try {
			const callbackData = ctx.callbackQuery.data
			const user = ctx.user

			console.log('📞 Callback received:', callbackData)

			// Avval callback query ga javob berish
			await ctx.answerCbQuery().catch(() => {})

			 if (callbackData === 'switch_to_user' || callbackData === 'switch_to_driver') {
					console.log("🔄 Xizmatni o'zgartirish:", callbackData)

					// Global switchServiceRole funksiyasini chaqirish
					await switchServiceRole(ctx)
					return
				}

			if (callbackData.startsWith('car_page_')) {
            await driverHandler.handleCarPageChange(ctx, callbackData)
        }
        // Mashina modelini qo'lda kiritish
        else if (callbackData === 'car_manual_input') {
            await driverHandler.showManualCarInput(ctx)
        }
        // Mashina tanlashga qaytish
        else if (callbackData === 'back_to_car_selection') {
            await driverHandler.handleBackToCarSelection(ctx)
        }
        // Registratsiya boshiga qaytish
        else if (callbackData === 'back_to_registration') {
            await driverHandler.handleBackToRegistration(ctx)
        }
        // Mashina tanlash
        else if (callbackData.startsWith('car_select_')) {
            await driverHandler.selectCarCallback(ctx, callbackData)
        }
        // Mashina turini tanlash
        else if (callbackData.startsWith('car_type_')) {
            await driverHandler.selectCarTypeCallback(ctx, callbackData)
        }

			// ============ LANGUAGE SELECTION ============
			if (callbackData.startsWith('lang_')) {
				await startHandler.handleLanguageSelection(ctx, callbackData)
				return
			}
			 if (callbackData.startsWith('car_type_')) {
					console.log('🏷️ Car type callback detected, calling handler...')
					const driverHandler = require('./handlers/driver')
					await driverHandler.selectCarTypeCallback(ctx, callbackData)
					return
				}

			if (callbackData === 'switch_to_user' || callbackData === 'switch_to_driver') {
				console.log("🔄 Xizmatni o'zgartirish:", callbackData)

				// driverHandler dan switchServiceRole funksiyasini chaqirish
				const driverHandler = require('./handlers/driver')
				await driverHandler.switchServiceRole(ctx)
				return
			}

			// ============ ROLE SELECTION ============
			if (callbackData.startsWith('role_')) {
				await startHandler.handleRoleSelection(ctx, callbackData)
				return
			}

			// ============ ADMIN CALLBACKS ============
			if (callbackData.startsWith('admin_')) {
				await adminHandler.handleAdminCallback(ctx, callbackData)
				return
			}

			// ============ BUYURTMA CALLBACKS ============
		if (callbackData.startsWith('select_driver_')) {
			console.log('🚕 Select driver callback:', callbackData)

			const orderHandler = require('./handlers/order')
			// Butun callback_data ni yuborish
			await orderHandler.handleDriverSelection(ctx, callbackData)
			return
		}
          if (callbackData.startsWith('confirm_order_')) {
						console.log('✅ Confirm order callback:', callbackData)

						const orderHandler = require('./handlers/order')
						await orderHandler.confirmOrder(ctx, callbackData)
						return
					}
				if (
					callbackData.startsWith('car_page_') ||
					callbackData === 'car_custom_input' ||
					callbackData === 'car_search_input' ||
					callbackData.startsWith('car_select_')
				) {
					const driverHandler = require('./handlers/driver')

					if (callbackData.startsWith('car_page_')) {
						const page = parseInt(callbackData.replace('car_page_', ''))
						await driverHandler.showCarSelection(ctx, page)
					} else if (callbackData === 'car_custom_input') {
						await driverHandler.showCustomCarInput(ctx)
					} else if (callbackData === 'car_search_input') {
						await driverHandler.showCarSearchInput(ctx)
					} else if (callbackData.startsWith('car_select_')) {
						await driverHandler.selectCarCallback(ctx, callbackData)
					}

					await ctx.answerCbQuery()
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

			// ============ SAHIFA NAVIGATSIYASI ============
			if (callbackData.startsWith('driver_page_')) {
				const orderHandler = require('./handlers/order')
				await orderHandler.handleDriverPage(ctx, callbackData)
				return
			}

			if (callbackData.startsWith('myorders_page_')) {
				const orderHandler = require('./handlers/order')
				await orderHandler.handleMyOrdersPage(ctx, callbackData)
				return
			}

			// ============ PASSENGER FLOW CALLBACKS ============
			if (callbackData.startsWith('passengers_')) {
				await passengerHandler.selectPassengerCount(ctx, callbackData)
				return
			}

			if (callbackData.startsWith('from_') && !callbackData.startsWith('driver_')) {
				await passengerHandler.selectFromRegion(ctx, callbackData)
				return
			}

			if (callbackData.startsWith('to_') && !callbackData.startsWith('driver_')) {
				await passengerHandler.selectToRegion(ctx, callbackData)
				return
			}

			if (callbackData.startsWith('parcel_')) {
				await passengerHandler.selectParcel(ctx, callbackData)
				return
			}

			// ============ DRIVER FLOW CALLBACKS ============
			if (callbackData.startsWith('max_passengers_')) {
				if (user.state === states.DRIVER_EDIT_PASSENGERS) {
					await driverHandler.saveEditedPassengers(ctx, callbackData)
				} else {
					await driverHandler.selectMaxPassengers(ctx, callbackData)
				}
				return
			}

			if (callbackData.startsWith('car_select_')) {
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

			if (callbackData.startsWith('car_type_')) {
				await driverHandler.selectCarTypeCallback(ctx, callbackData)
				return
			}

			if (callbackData.startsWith('driver_from_')) {
				if (user.state === states.DRIVER_EDIT_ROUTE_FROM) {
					await driverHandler.saveEditedRouteFrom(ctx, callbackData)
				} else {
					await driverHandler.selectFromRegion(ctx, callbackData)
				}
				return
			}

			if (callbackData.startsWith('driver_to_')) {
				if (user.state === states.DRIVER_EDIT_ROUTE_TO) {
					await driverHandler.saveEditedRouteTo(ctx, callbackData)
				} else {
					await driverHandler.selectToRegion(ctx, callbackData)
				}
				return
			}

			if (callbackData.startsWith('service_')) {
				if (user.state === states.DRIVER_EDIT_SERVICES) {
					await driverHandler.saveEditedServices(ctx, callbackData)
				} else {
					await driverHandler.selectServiceType(ctx, callbackData)
				}
				return
			}

			if (callbackData.startsWith('work_')) {
				console.log('🕒 Work callback detected:', callbackData)
				try {
					await driverHandler.selectWorkHoursCallback(ctx, callbackData)
				} catch (error) {
					console.error('❌ Work hours callback error:', error)
				}
				return
			}

			if (callbackData.startsWith('date_')) {
				console.log('📅 Date callback detected:', callbackData)
				try {
					await driverHandler.selectDate(ctx, callbackData)
				} catch (error) {
					console.error('❌ Date callback error:', error)
					await ctx.reply('❌ Xatolik yuz berdi')
				}
				return
			}

			if (callbackData.startsWith('time_')) {
				await driverHandler.selectTime(ctx, callbackData)
				return
			}

			// ============ CONFIRM & CANCEL CALLBACKS ============
			if (callbackData === 'confirm_driver_registration') {
				console.log('✅ Driver registration confirm callback')
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

			if (callbackData === 'cancel_driver_registration') {
				console.log('❌ Driver registration cancel callback')

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

				await ctx.reply(
					user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
					keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role)
				)
				return
			}

			if (callbackData === 'confirm') {
				console.log('📞 Confirm callback detected, user state:', user.state)

				if (user.state === states.DRIVER_REG_CONFIRM) {
					try {
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
					await passengerHandler.confirmOrder(ctx)
				} else {
					console.log("❌ Noto'g'ri state uchun confirm:", user.state)
					await ctx.reply(
						user.language === 'uz' ? "❌ Noto'g'ri amal." : '❌ Неправильное действие.'
					)
				}
				return
			}

			if (callbackData === 'cancel') {
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

			// ============ GENERAL CALLBACKS ============
			switch (callbackData) {
				case 'add_comment':
					await passengerHandler.addComment(ctx)
					break

				case 'skip_comment':
					await passengerHandler.skipComment(ctx)
					break

				case 'need_taxi':
					await passengerHandler.startOrder(ctx)
					break

				case 'taxi_service':
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
						await driverHandler.startRegistration(ctx)
					}
					break

				case 'my_orders':
					await passengerHandler.showMyOrders(ctx)
					break

				case 'driver_info':
					const driver = await Driver.findOne({ telegramId: user.telegramId })
					if (driver) {
						if (driver.status === 'active') {
							await driverHandler.showDriverMenu(ctx)
						} else {
							await driverHandler.showInactiveDriverMenu(ctx, driver)
						}
					} else {
						if (user.role === 'driver') {
							await ctx.reply(
								user.language === 'uz'
									? '🚘 Siz haydovchi sifatida tanlangansiz, ammo haydovchi profilingiz hali yaratilmagan yoki topilmadi.\n\nIltimos, ro‘yxatdan o‘tish jarayonini qayta boshlang.'
									: '🚘 Вы выбрали роль водителя, однако профиль водителя не был найден.\n\nПожалуйста, пройдите регистрацию заново.'
							)
						}
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
					await ctx.reply(
						user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
						keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role)
					)
					user.state = states.MAIN_MENU
					await user.save()
					break

				case 'close_menu':
					try {
						await ctx.deleteMessage()
					} catch (error) {
						console.log('Delete message error:', error.message)
					}
					break

				default:
					console.log('❌ Unknown callback:', callbackData)
					break
			}
		} catch (error) {
        console.error('❌ Callback error:', error)
        console.error('❌ Error details:', error.stack)
        try {
            await ctx.answerCbQuery('❌ Xatolik yuz berdi')
        } catch (e) {
            console.error('Answer callback error:', e)
        }
    }
})

// Regex pattern bilan callback handlerlar (alohida qo'shimcha)
bot.action(/^select_driver_(.+)_(.+)$/, async ctx => {
    const user = ctx.user
    if (!user) return
    
    try {
        const match = ctx.match
        const driverId = match[1]
        const orderId = match[2]
        
        console.log(`🚕 Haydovchi tanlandi: driverId=${driverId}, orderId=${orderId}`)
        
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

bot.on('text', async ctx => {
	try {
		const user = ctx.user
		const text = ctx.message.text

		console.log('📝 ========== TEXT HANDLER START ==========')
		console.log('👤 User ID:', user.telegramId)
		console.log('📊 User state:', user.state)
		console.log('📄 Text content:', text)

		// Barcha kerakli handlerlarni avval import qilib olamiz
		const driverHandler = require('./handlers/driver')
		const passengerHandler = require('./handlers/passenger')

		// ============ MASHINA RAQAMINI QABUL QILISH ============
		if (user.state === states.DRIVER_REG_CAR_NUMBER) {
			console.log('✅ DRIVER_REG_CAR_NUMBER state detected!')
			await driverHandler.saveCarNumber(ctx, text)
			return
		}
	if (user.state === states.DRIVER_REG_DATE_MANUAL) {
		console.log('📅 DRIVER_REG_DATE_MANUAL state detected - manual date input')

		try {
			await ctx.deleteMessage()
		} catch (error) {
			console.log('Delete message error:', error.message)
		}

		const driverHandler = require('./handlers/driver')
		await driverHandler.saveManualDateInput(ctx, text)
		return
	}
    
		if (user.state === 'DRIVER_REG_DATE_CUSTOM') {
			console.log('📅 DRIVER_REG_DATE_CUSTOM state detected - custom date input')
			
			// Avval xabarni o'chirish
			try {
				await ctx.deleteMessage()
			} catch (error) {
				console.log('Delete message error:', error.message)
			}
			
			const driverHandler = require('./handlers/driver')
			await driverHandler.saveCustomDate(ctx, text)
			return
		}
		if (user.state === 'DRIVER_REG_CAR_SEARCH') {
			console.log('🔍 Car search state detected')
			await searchCars(ctx, text)
			return
		}


		// ============ VAQT KIRITISH ============
		if (user.state === states.DRIVER_REG_TIME_INPUT) {
			console.log('✅ DRIVER_REG_TIME_INPUT state detected - time input')

			try {
				await ctx.deleteMessage()
			} catch (error) {
				console.log('Delete message error:', error.message)
			}

			await driverHandler.saveTimeInput(ctx, text)
			return
		}
		
		if (user.state === states.DRIVER_REG_DATE_MANUAL) {
			console.log('📅 DRIVER_REG_DATE_MANUAL state detected - manual date input')

			try {
				await ctx.deleteMessage()
			} catch (error) {
				console.log('Delete message error:', error.message)
			}

			await driverHandler.saveManualDateInput(ctx, text)
			return
		}
if (user.state === states.DRIVER_REG_WORK_HOURS_CUSTOM) {
	console.log('✅ DRIVER_REG_WORK_HOURS_CUSTOM state detected - custom work hours')
	await driverHandler.saveCustomWorkHours(ctx, text)
	return
}

		console.log('ℹ️ Text handled by default handler')

		// ============ QOLGAN TEXT HANDLERLAR ============
		switch (user.state) {
			case 'DRIVER_EDIT_FULLNAME':
				await driverHandler.saveEditedFullName(ctx, text)
				break

			case 'DRIVER_EDIT_PHONE':
				await driverHandler.saveEditedPhone(ctx, text)
				break

			case 'DRIVER_EDIT_CAR':
				await driverHandler.saveCarModel(ctx, text)
				break

			case 'DRIVER_REG_FULLNAME':
				await driverHandler.saveFullName(ctx, text)
				break

			case 'DRIVER_REG_PHONE':
				await driverHandler.savePhone(ctx, text)
				break

			case 'DRIVER_REG_SELECT_CAR':
			case 'DRIVER_REG_CAR_MODEL':
				await driverHandler.saveCarModel(ctx, text)
				break

			case 'PASSENGER_PARCEL_DESC':
				await passengerHandler.saveParcelDescription(ctx, text)
				break

			case 'PASSENGER_COMMENT':
				await passengerHandler.saveComment(ctx, text)
				break

			case 'PASSENGER_INFO_NAME':
				await passengerHandler.savePassengerName(ctx, text)
				break

			case 'PASSENGER_INFO_PHONE':
				await passengerHandler.savePassengerPhone(ctx, text)
				break

			default:
				console.log('⚠️ No matching state found for text handler')
				console.log('Current state:', user.state)
				if (text.startsWith('/')) {
					await ctx.reply(
						user.language === 'uz' ? 'Iltimos, menudan foydalaning' : 'Пожалуйста, используйте меню'
					)
				} else {
					await ctx.reply(
						user.language === 'uz'
							? 'ℹ️ Menyudan foydalanishingiz mumkin. /start ni bosing.'
							: 'ℹ️ Вы можете использовать меню. Нажмите /start.'
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
		parse_mode: 'HTML'
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
				? `🏠 Asosiy menyu\n\n` 
				: `🏠 Главное меню\n\n`

		const keyboard = {
			inline_keyboard: [
				[
					{
						text: user.language === 'uz' ? '🚘 Haydovchi menyusi' : '🚘 Меню водителя',
						callback_data: 'driver_info'
					}
				],
				[
					{
						text: user.language === 'uz' ? "🔄 Xizmatni o'zgartirish" : '🔄 Изменить услугу',
						callback_data: 'switch_to_user'
					}
				]
			]
		}

		await ctx.reply(message, { reply_markup: keyboard })
	} else if (user.role === 'user') {
		// USER rolida
		const message =
			user.language === 'uz'
				? `🏠 Asosiy menyu\n\n` +
				  `Siz yo'lovchi sifatida ro'yxatdan o'tgansiz. Quyidagilardan birini tanlang:`
				: `🏠 Главное меню\n\n` + `Вы зарегистрированы как пассажир. Выберите одно из следующих:`

		const keyboard = {
			inline_keyboard: [
				[
					{
						text: user.language === 'uz' ? '🚖 Taksiga buyurtma berish' : '🚖 Заказать такси',
						callback_data: 'need_taxi'
					}
				],
				[
					{
						text: user.language === 'uz' ? '📋 Mening buyurtmalarim' : '📋 Мои заказы',
						callback_data: 'my_orders'
					}
				],
				[
					{
						text: user.language === 'uz' ? "🔄 Xizmatni o'zgartirish" : '🔄 Изменить услугу',
						callback_data: 'switch_to_driver'
					}
				]
			]
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
						callback_data: 'need_taxi'
					},
					{
						text: user.language === 'uz' ? '🚘 Taksi xizmati' : '🚘 Такси сервис',
						callback_data: 'taxi_service'
					}
				]
			]
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

const switchServiceRole = async (ctx) => {
    const user = ctx.user;
    
    console.log('🔀 ========== switchServiceRole START ==========');
    console.log('👤 Current role:', user.role);
    console.log('👤 Telegram ID:', user.telegramId);
    
    try {
        // Avval oldingi xabarni o'chirish
        try {
            await ctx.deleteMessage();
        } catch (error) {
            console.log('Delete message error:', error.message);
        }

        // O'ZGARTIRISH NIYATI
        const currentRole = user.role;
        let newRole;
        
        if (currentRole === 'user') {
            newRole = 'driver';
        } else if (currentRole === 'driver') {
            newRole = 'user';
        } else {
            // Agar role 'none' bo'lsa
            newRole = 'user';
        }
        
        console.log(`🔄 Switching from ${currentRole} to ${newRole}`);
        
        // User ro'li yangilash
        user.role = newRole;
        await user.save();
        
        const driverHandler = require('./handlers/driver');
        
        if (newRole === 'driver') {
            // YANGI DRIVER SIFATIDA
            console.log("🚗 Checking driver profile for new driver role...");
            const driver = await Driver.findOne({ telegramId: user.telegramId });
            
            if (driver) {
                // Driver profili mavjud
                console.log("✅ Existing driver profile found");
                
                if (driver.status === 'active') {
                    // Faol driver - driver menyusi
                    await driverHandler.showDriverMenu(ctx);
                } else {
                    // Nofaol driver - nofaol menyusi
                    await driverHandler.showInactiveDriverMenu(ctx, driver);
                }
            } else {
                // Driver profili yo'q - ro'yxatdan o'tish
                console.log("❌ Driver profile not found, starting registration");
                await driverHandler.startRegistration(ctx);
            }
            
        } else if (newRole === 'user') {
            // YANGI USER SIFATIDA
            console.log("🚖 Showing passenger menu for new user role");
            
            const { message, keyboard } = keyboards.showMainMenu(ctx, user.language);
            await ctx.reply(message, {
                reply_markup: keyboard,
                parse_mode: 'HTML'
            });
            user.state = states.MAIN_MENU;
            await user.save();
        }
        
        const successMessage = user.language === 'uz'
            ? `✅ <b>Xizmat muvaffaqiyatli o'zgartirildi!</b>\n\n` +
              `Siz endi <b>${newRole === 'driver' ? 'haydovchi' : 'yo\'lovchi'}</b> sifatida ishlaysiz.`
            : `✅ <b>Услуга успешно изменена!</b>\n\n` +
              `Теперь вы работаете как <b>${newRole === 'driver' ? 'водитель' : 'пассажир'}</b>.`;
        
const keyboard = {
			inline_keyboard: [
				[
					{
						text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
						callback_data: 'main_menu'
					}
				]
			]
		}

							await ctx.telegram.sendMessage(user.telegramId, successMessage, {
            parse_mode: 'HTML'
        });
        
    } catch (error) {
        console.error('❌ Switch service role error:', error);
        console.error('❌ Error stack:', error.stack);
        
        await ctx.reply(
            user.language === 'uz'
                ? "❌ Xizmatni o'zgartirishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
                : '❌ Ошибка при изменении услуги. Пожалуйста, попробуйте еще раз.'
        );
    }
    
    console.log('🔀 ========== switchServiceRole END ==========');
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
		parse_mode: 'HTML'
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
		parse_mode: 'HTML'
	})

	user.state = states.MAIN_MENU
	await user.save()
})
bot.action('driver_info', async (ctx) => {
    await ctx.answerCbQuery();
    const driver = await Driver.findOne({ telegramId: ctx.user.telegramId });
    if (driver) {
        if (driver.status === 'active') {
            await driverHandler.showDriverMenu(ctx);
        } else {
            await driverHandler.showInactiveDriverMenu(ctx, driver);
        }
    } else {
        await ctx.reply(
            ctx.user.language === 'uz'
                ? "❌ Haydovchi profilingiz topilmadi."
                : "❌ Ваш профиль водителя не найден."
        );
    }
});

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
