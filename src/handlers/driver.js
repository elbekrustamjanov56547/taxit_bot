const Driver = require('../models/Driver')
const User = require('../models/User')
const Order = require('../models/Order')
const Car = require('../models/Car')
const CarType = require('../models/CarType')
const states = require('../utils/states')
const keyboards = require('../keyboards/main')
const { Markup } = require('telegraf')

// ====================== SIMPLE PAYMENT CONTACT SYSTEM ======================

// Admin telegram username formatini tekshirish va tozalash
const validateAndFormatAdminUsername = () => {
	const adminUsername = process.env.ADMIN_TELEGRAM_USERNAME || '@TaxiAdmin'

	const cleanedUsername = adminUsername.replace(/[^\w@]/g, '').trim()

	if (!cleanedUsername.startsWith('@')) {
		return '@' + cleanedUsername
	}

	return cleanedUsername
}

// Admin bilan chat linkini yaratish
const createAdminChatLink = () => {
	const adminUsername = validateAndFormatAdminUsername()
	const usernameClean = adminUsername.replace('@', '')

	return `https://t.me/${usernameClean}`
}

// Admin bilan bog'lanish uchun oddiy keyboard
// const createSimplePaymentKeyboard = (userLanguage = 'uz') => {
// 	const adminUsername = validateAndFormatAdminUsername()
// 	const adminChatLink = createAdminChatLink()

// 	return {
// 		inline_keyboard: [
// 			[
// 				{
// 					text: userLanguage === 'uz' ? '📩 Admin bilan gaplashish' : '📩 Чат с админом',
// 					url: adminChatLink
// 				}
// 			],
// 			[
// 				{
// 					text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
// 					callback_data: 'main_menu'
// 				}
// 			]
// 		]
// 	}
// }

// Admin bilan bog'lanish uchun oddiy keyboard
const createSimplePaymentKeyboard = (userLanguage = 'uz') => {
	const adminUsername = validateAndFormatAdminUsername()
	const adminChatLink = createAdminChatLink()

	return {
		inline_keyboard: [
			[
				{
					text: userLanguage === 'uz' ? '📩 Admin bilan gaplashish' : '📩 Чат с админом',
					url: adminChatLink
				}
			],
			[
				{
					text: userLanguage === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
					callback_data: 'main_menu'
				}
			]
		]
	}
}

const getSimplePaymentMessage = (userLanguage = 'uz') => {
	const adminUsername = validateAndFormatAdminUsername()

	if (userLanguage === 'uz') {
		return (
			`💳 <b>Xizmatlardan foydalanish uchun to'lov qilishingiz kerak</b>\n\n` +
			`To'lov va boshqa savollar uchun admin bilan bog'laning:\n\n` +
			`👤 <b>Admin:</b> ${adminUsername}\n` +
			`⏱ <b>Ish vaqti:</b> 09:00 - 18:00\n\n` +
			`<b>Qanday to'lov qilish kerak:</b>\n` +
			`1. "Admin bilan gaplashish" tugmasini bosing\n` +
			`2. Telegramda admin bilan chat ochiladi\n` +
			`3. Adminga "To'lov qilmoqchiman" deb yozing\n` +
			`4. To'lov qiling va profilingiz faollashadi`
		)
	} else {
		return (
			`💳 <b>Для использования услуг необходимо оплатить</b>\n\n` +
			`По вопросам оплаты и другим вопросам свяжитесь с администратором:\n\n` +
			`👤 <b>Админ:</b> ${adminUsername}\n` +
			`⏱ <b>Время работы:</b> 09:00 - 18:00\n\n` +
			`<b>Как произвести оплату:</b>\n` +
			`1. Нажмите кнопку "Чат с админом"\n` +
			`2. В Telegram откроется чат с администратором\n` +
			`3. Напишите администратору "Хочу оплатить"\n` +
			`4. Оплатите и ваш профиль активируется`
		)
	}
}

const handleDriverPayment = async ctx => {
	console.log('🔵 handleDriverPayment FUNKSIYASI CHAQIRILDI')
	console.log('User:', ctx.user?.telegramId)

	try {
		const user = ctx.user

		if (!user) {
			console.log('❌ User not found')
			return
		}

		// VAQTINCHALIK: To'lovsiz tizim
		const message =
			user.language === 'uz'
				? `✅ Profilingiz muvaffaqiyatli yaratildi!\n\n` +
				  `🚗 Siz endi haydovchi sifatida faolsiz.\n` +
				  `📍 Buyurtmalarni qabul qilishni boshlashingiz mumkin.\n\n` +
				  `🏠 Asosiy menyuga qaytish uchun pastdagi tugmani bosing.`
				: `✅ Ваш профиль успешно создан!\n\n` +
				  `🚗 Теперь вы активны как водитель.\n` +
				  `📍 Вы можете начать принимать заказы.\n\n` +
				  `🏠 Нажмите кнопку ниже, чтобы вернуться в главное меню.`

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

		await ctx.reply(message, {
			reply_markup: keyboard,
			parse_mode: 'HTML'
		})

		console.log("✅ Xabar muvaffaqiyatli yuborildi (to'lovsiz)")
	} catch (error) {
		console.error('❌ handleDriverPayment da xatolik:', error)

		try {
			await ctx.reply(
				ctx.user?.language === 'uz'
					? "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
					: '❌ Произошла ошибка. Пожалуйста, попробуйте еще раз.',
				{ parse_mode: 'HTML' }
			)
		} catch (replyError) {
			console.error('Failed to send error message:', replyError)
		}
	}
}
// ====================== PROFIL SAQLASH FUNKSIYASI ======================
const saveProfileWithPayment = async ctx => {
	const user = ctx.user

	console.log('🔵 ========== saveProfileWithPayment START ==========')
	console.log('👤 User ID:', user.telegramId)
	console.log('🔍 Session data:', JSON.stringify(ctx.session?.driverData, null, 2))

	// Avval oldingi xabarni o'chirishga urinish
	try {
		if (ctx.callbackQuery?.message?.message_id) {
			await ctx.deleteMessage()
		}
	} catch (error) {
		console.log('Delete message error:', error.message)
	}

	// Sessionni tekshirish
	if (!ctx.session || !ctx.session.driverData) {
		console.log("❌ Session yoki driverData yo'q")
		await ctx.reply(
			user.language === 'uz'
				? "❌ Ma'lumotlar topilmadi. Iltimos, qayta boshlang."
				: '❌ Данные не найдены. Пожалуйста, начните заново.'
		)
		user.state = states.MAIN_MENU
		await user.save()
		return
	}

	const data = ctx.session.driverData

	if (!data.carNumber) {
		console.log('❌ Mashina raqami kiritilmagan')
		await ctx.reply(
			user.language === 'uz'
				? '❌ Mashina raqami kiritilmagan. Iltimos, mashina raqamini kiriting.'
				: '❌ Номер машины не введен. Пожалуйста, введите номер машины.'
		)
		return
	}

	// Required fields tekshirish
	console.log('📊 Required fields tekshirish:')
	const requiredFields = [
		'fullName',
		'phone',
		'fromRegion',
		'toRegion',
		'maxPassengers',
		'serviceType',
		'workHours'
	]

	for (const field of requiredFields) {
		console.log(`${field}:`, data[field] || "YO'Q")
		if (!data[field]) {
			console.log(`❌ ${field} maydoni to'ldirilmagan`)
			await ctx.reply(
				user.language === 'uz'
					? `❌ ${field} maydoni to'ldirilmagan. Iltimos, qayta boshlang.`
					: `❌ Поле ${field} не заполнено. Пожалуйста, начните заново.`
			)
			user.state = states.MAIN_MENU
			await user.save()
			return
		}
	}

	// TASDIQLASH KLAVIATURASINI KO'RSATISH
	const confirmationMessage = user.language === 'uz'
		? `📋 <b>Ma'lumotlaringizni yakuniy tekshiring:</b>\n\n` +
		  `👤 <b>Ism:</b> ${data.fullName}\n` +
		  `📍 <b>Yo'nalish:</b> ${data.fromRegion} → ${data.toRegion}\n` +
		  `🚗 <b>Mashina:</b> ${data.carModel || "Noma'lum"}\n` +
		  `👥 <b>Sig'im:</b> ${data.maxPassengers} kishi\n` +
		  `🎯 <b>Xizmatlar:</b> ${data.serviceType.map(type => {
				const serviceNames = {
					road: "Yo'l-yo'lakay",
					route: "Yo'nalish",
					parcel: 'Pochta'
				}
				return serviceNames[type] || type
		  }).join(', ')}\n` +
		  `🏪 <b>Ish vaqti:</b> ${data.workHours}\n` +
		  (data.departureTime ? `⏰ <b>Jo'nash vaqti:</b> ${data.departureTime}\n\n` : '\n') +
		  `<b>Barchasi to'g'rimi?</b>`
		: `📋 <b>Проверьте ваши данные:</b>\n\n` +
		  `👤 <b>Имя:</b> ${data.fullName}\n` +
		  `📍 <b>Направление:</b> ${data.fromRegion} → ${data.toRegion}\n` +
		  `🚗 <b>Машина:</b> ${data.carModel || 'Неизвестно'}\n` +
		  `👥 <b>Вместимость:</b> ${data.maxPassengers} человек\n` +
		  `🎯 <b>Услуги:</b> ${data.serviceType.map(type => {
				const serviceNames = {
					road: 'Попутка',
					route: 'Направление',
					parcel: 'Посылка'
				}
				return serviceNames[type] || type
		  }).join(', ')}\n` +
		  `🏪 <b>Время работы:</b> ${data.workHours}\n` +
		  (data.departureTime ? `⏰ <b>Время отправления:</b> ${data.departureTime}\n\n` : '\n') +
		  `<b>Все верно?</b>`

	// User state ni o'zgartirish
	user.state = states.DRIVER_REG_CONFIRM
	await user.save()

	// Tasdiqlash klaviaturasini yuborish
	const confirmKeyboard = {
		inline_keyboard: [
			[
				{
					text: user.language === 'uz' ? "✅ Ha, to'g'ri" : '✅ Да, верно',
					callback_data: 'confirm_driver_registration'
				},
				{
					text: user.language === 'uz' ? "❌ Yo'q, o'zgartirish" : '❌ Нет, изменить',
					callback_data: 'cancel_driver_registration'
				}
			]
		]
	}

	await ctx.reply(confirmationMessage, {
		reply_markup: confirmKeyboard,
		parse_mode: 'HTML'
	})

	console.log('🔵 ========== saveProfileWithPayment END ==========')
}

// ====================== PROFILNI TO'LIQ SAQLASH ======================
// const completeDriverRegistration = async ctx => {
// 	const user = ctx.user

// 	console.log('🔵 ========== completeDriverRegistration START ==========')
// 	console.log('👤 User ID:', user.telegramId)

// 	// Avval oldingi xabarni o'chirishga urinish
// 	try {
// 		if (ctx.callbackQuery?.message?.message_id) {
// 			await ctx.deleteMessage()
// 		}
// 	} catch (error) {
// 		console.log('Delete message error:', error.message)
// 	}

// 	if (!ctx.session || !ctx.session.driverData) {
// 		console.log("❌ Session yoki driverData yo'q")
// 		await ctx.reply(
// 			user.language === 'uz'
// 				? "❌ Ma'lumotlar topilmadi. Iltimos, qayta boshlang."
// 				: '❌ Данные не найдены. Пожалуйста, начните заново.'
// 		)
// 		user.state = states.MAIN_MENU
// 		await user.save()
// 		return
// 	}

// 	const data = ctx.session.driverData

// 	try {
// 		// Avval mavjud haydovchini tekshirish
// 		const existingDriver = await Driver.findOne({ telegramId: user.telegramId })

// 		if (existingDriver) {
// 			console.log('⚠️ Mavjud driver topildi:', existingDriver._id)
// 			await ctx.reply(
// 				user.language === 'uz'
// 					? "❌ Siz allaqachon haydovchi sifatida ro'yxatdan o'tgansiz"
// 					: '❌ Вы уже зарегистрированы как водитель'
// 			)
// 			user.state = states.MAIN_MENU
// 			await user.save()
// 			return
// 		}

// 		// Car model ni tekshirish
// 		let carModelId = data.carId
// 		if (!carModelId && data.carModel) {
// 			console.log('🔍 Car model qidirilmoqda:', data.carModel)
// 			const car = await Car.findOne({
// 				$or: [{ name: data.carModel }, { nameRu: data.carModel }]
// 			})

// 			if (car) {
// 				carModelId = car._id
// 				console.log('✅ Car model topildi:', car.name)
// 			} else {
// 				// Yangi car model yaratish
// 				console.log('➕ Yangi car model yaratilmoqda:', data.carModel)
// 				const newCar = new Car({
// 					name: data.carModel,
// 					nameRu: data.carModel,
// 					isActive: true
// 				})
// 				await newCar.save()
// 				carModelId = newCar._id
// 				console.log('✅ Yangi car model yaratildi:', data.carModel)
// 			}
// 		}

// 		// Haydovchi ma'lumotlarini tayyorlash
// 		const driverData = {
// 			telegramId: user.telegramId,
// 			fullName: data.fullName,
// 			phone: data.phone,
// 			fromRegion: data.fromRegion,
// 			toRegion: data.toRegion,
// 			carModel: carModelId,
// 			carType: data.carType || null,
// 			maxPassengers: data.maxPassengers,
// 			serviceType: data.serviceType,
// 			workHours: data.workHours,
// 			departureTime: data.departureTime || "Yo'lovchi bilan kelishiladi",
// 			status: 'inactive',
// 			balance: 0,
// 			totalOrders: 0,
// 			registrationStep: 'completed',
// 			createdAt: new Date(),
// 			updatedAt: new Date()
// 		}

// 		console.log('📝 Driver yaratilmoqda:', driverData)

// 		// Driver yaratish
// 		const driver = new Driver(driverData)
// 		await driver.save()

// 		console.log('✅ Driver saqlandi. ID:', driver._id)

// 		// User rolini yangilash
// 		user.role = 'driver'
// 		user.state = states.MAIN_MENU
// 		await user.save()

// 		console.log('✅ User roli yangilandi')

// 		// Muvaffaqiyatli xabar
// 		const serviceNames = {
// 			road: user.language === 'uz' ? "Yo'l-yo'lakay" : 'Попутка',
// 			route: user.language === 'uz' ? "Yo'nalish" : 'Направление',
// 			parcel: user.language === 'uz' ? 'Pochta' : 'Посылка'
// 		}

// 		const services = data.serviceType.map(type => serviceNames[type] || type).join(', ')

// 		const carModelName = data.carModel || "Noma'lum"

// 		const successMessage =
// 			user.language === 'uz'
// 				? `✅ <b>Tabriklaymiz! Profilingiz muvaffaqiyatli yaratildi!</b>\n\n` +
// 				  `<b>Profil ma'lumotlari:</b>\n` +
// 				  `👤 <b>Ism:</b> ${data.fullName}\n` +
// 				  `📍 <b>Yo'nalish:</b> ${data.fromRegion} → ${data.toRegion}\n` +
// 				  `🚗 <b>Mashina:</b> ${carModelName}\n` +
// 				  `👥 <b>Sig'im:</b> ${data.maxPassengers} kishi\n` +
// 				  `🎯 <b>Xizmatlar:</b> ${services}\n` +
// 				  `🏪 <b>Ish vaqti:</b> ${data.workHours}\n` +
// 				  (data.departureTime ? `⏰ <b>Jo'nash vaqti:</b> ${data.departureTime}\n\n` : '\n') +
// 				  `✅ Profilingiz yaratildi, endi to'lov qilish orqali faollashtirishingiz mumkin.`
// 				: `✅ <b>Поздравляем! Ваш профиль успешно создан!</b>\n\n` +
// 				  `<b>Данные профиля:</b>\n` +
// 				  `👤 <b>Имя:</b> ${data.fullName}\n` +
// 				  `📍 <b>Направление:</b> ${data.fromRegion} → ${data.toRegion}\n` +
// 				  `🚗 <b>Машина:</b> ${carModelName}\n` +
// 				  `👥 <b>Вместимость:</b> ${data.maxPassengers} человек\n` +
// 				  `🎯 <b>Услуги:</b> ${services}\n` +
// 				  `🏪 <b>Время работы:</b> ${data.workHours}\n` +
// 				  (data.departureTime ? `⏰ <b>Время отправления:</b> ${data.departureTime}\n\n` : '\n') +
// 				  `✅ Ваш профиль создан, теперь вы можете активировать его, совершив оплату.`

// 		await ctx.reply(successMessage, {
// 			parse_mode: 'HTML',
// 			reply_markup: { remove_keyboard: true }
// 		})

// 		// Sessionni tozalash
// 		delete ctx.session.driverData
// 		console.log('✅ Session tozalandi')

// 		// To'lov menyusini ko'rsatish (2 soniyadan keyin)
// 		console.log("💰 To'lov sahifasi ko'rsatilmoqda...")
// 		setTimeout(async () => {
// 			await handleDriverPayment(ctx)
// 		}, 2000)

// 	} catch (error) {
// 		console.error('❌ Complete registration error:', error)
// 		console.error('❌ Error stack:', error.stack)

// 		// MongoDB xatoliklarini tekshirish
// 		if (error.name === 'ValidationError') {
// 			console.error('❌ Validation error details:', error.errors)
// 		}

// 		await ctx.reply(
// 			user.language === 'uz'
// 				? `❌ Profilni saqlashda xatolik yuz berdi.\n\n` +
// 						`Xato: ${error.message}\n\n` +
// 						`Iltimos, qayta urinib ko'ring.`
// 				: `❌ Ошибка при сохранении профиля.\n\n` +
// 						`Ошибка: ${error.message}\n\n` +
// 						`Пожалуйста, попробуйте еще раз.`
// 		)
// 	}

// 	console.log('🔵 ========== completeDriverRegistration END ==========')
// }
// ====================== NOFAOL HAYDOVCHI MENYUSI ======================
const showInactiveDriverMenu = async (ctx, driver) => {
	const user = ctx.user

	const populatedDriver = await Driver.findById(driver._id).populate('carModel').populate('carType')

	let carModelInfo = ''
	if (populatedDriver.carModel) {
		if (typeof populatedDriver.carModel === 'object' && populatedDriver.carModel.name) {
			carModelInfo =
				user.language === 'uz' ? populatedDriver.carModel.name : populatedDriver.carModel.nameRu
		} else {
			carModelInfo = populatedDriver.carModel
		}
	}

	let carTypeInfo = ''
	if (populatedDriver.carType) {
		carTypeInfo = `\n🚗 <b>Mashina turi:</b> ${
			user.language === 'uz' ? populatedDriver.carType.name : populatedDriver.carType.nameRu
		}`
	}

	const adminUsername = validateAndFormatAdminUsername()
	 const carNumberInfo = populatedDriver.carNumber 
        ? `\n🚘 <b>Mashina raqami:</b> ${populatedDriver.carNumber}` 
        : '';

	const message =
		user.language === 'uz'
			? `🚘 <b>Haydovchi profili (Nofaol)</b>\n\n` +
			  `<b>Sizning ma'lumotlaringiz:</b>\n` +
			  `👤 <b>Ism:</b> ${populatedDriver.fullName}\n` +
			  `🚗 <b>Mashina:</b> ${carModelInfo}${carTypeInfo}${carNumberInfo}\n` +
			  `📍 <b>Yo'nalish:</b> ${populatedDriver.fromRegion} → ${populatedDriver.toRegion}\n` +
			  `👥 <b>Sig'im:</b> ${populatedDriver.maxPassengers} kishi\n\n` +
			  (populatedDriver.status === 'inactive'
					? `💳 <b>Holat:</b> Profilingiz faol emas\n` +
					  `📞 <b>Sabab:</b> Oylik to'lov amalga oshirilmagan\n\n`
					: `✅ <b>Holat:</b> Profilingiz faol\n\n`) +
			  `✅ <b>Qanday faollashtirish:</b>\n` +
			  `1. "To'lov qilish" tugmasini bosing\n` +
			  `2. Admin bilan Telegram chat ochiladi\n` +
			  `3. Adminga "To'lov qilmoqchiman" deb yozing\n` +
			  `4. To'lov qiling va profilingiz faollashadi`
			: `🚘 <b>Профиль водителя (Неактивен)</b>\n\n` +
			  `<b>Ваши данные:</b>\n` +
			  `👤 <b>Имя:</b> ${populatedDriver.fullName}\n` +
			  `🚗 <b>Машина:</b> ${carModelInfo}${carTypeInfo}${carNumberInfo}\n` +
			  `📍 <b>Направление:</b> ${populatedDriver.fromRegion} → ${populatedDriver.toRegion}\n` +
			  `👥 <b>Вместимость:</b> ${populatedDriver.maxPassengers} человек\n\n` +
			  (populatedDriver.status === 'inactive'
					? `💳 <b>Статус:</b> Ваш профиль не активен\n` +
					  `📞 <b>Причина:</b> Ежемесячный платеж не произведен\n\n`
					: `✅ <b>Статус:</b> Ваш профиль активен\n\n`) +
			  `✅ <b>Как активировать:</b>\n` +
			  `1. Нажмите кнопку "Оплатить"\n` +
			  `2. Откроется чат в Telegram с администратором\n` +
			  `3. Напишите администратору "Хочу оплатить"\n` +
			  `4. Оплатите и ваш профиль активируется`

	const keyboard = {
		inline_keyboard: [
			[
				{
					text: user.language === 'uz' ? "💳 To'lov qilish" : '💳 Оплатить',
					callback_data: 'driver_payment'
				}
			],
			[
				{
					text: user.language === 'uz' ? '✏️ Profilni tahrirlash' : '✏️ Редактировать профиль',
					callback_data: 'driver_edit'
				}
			],
			[
				{
					text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
					callback_data: 'main_menu'
				}
			]
		]
	}

	await ctx.reply(message, {
		reply_markup: keyboard,
		parse_mode: 'HTML'
	})
}

// ====================== RO'YXATDAN O'TISH FUNKSIYALARI ======================
const startRegistration = async ctx => {
	const user = ctx.user
	console.log('startRegistration chaqirildi, user role:', user.role)

	// Sessionni tekshirish va yaratish
	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	// Haydovchi borligini tekshirish
	const existingDriver = await Driver.findOne({ telegramId: user.telegramId })

	if (existingDriver) {
		console.log('Mavjud driver topildi')
		if (existingDriver.status === 'active') {
			await showDriverMenu(ctx)
		} else {
			await showInactiveDriverMenu(ctx, existingDriver)
		}
		return
	}

	console.log('Yangi driver registration boshlanmoqda...')

	user.state = states.DRIVER_REG_FROM_REGION
	await user.save()

	const message =
		user.language === 'uz'
			? "🚘 Haydovchi sifatida ro'yxatdan o'tish\n\n📍 Qaysi viloyatdan jo'namoqchisiz?"
			: '🚘 Регистрация как водитель\n\n📍 Из какого региона выезжаете?'

	console.log('Driver registration boshlanmoqda...')
	await ctx.reply(message, keyboards.driverFromRegionsKeyboard(user.language))
}

// Chiqish viloyatini tanlash
const selectFromRegion = async (ctx, callbackData) => {
	const user = ctx.user
	const region = callbackData.replace('driver_from_', '')

	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	ctx.session.driverData.fromRegion = region

	user.state = states.DRIVER_REG_TO_REGION
	await user.save()

	const message =
		user.language === 'uz'
			? `📍 Chiqish: ${region}\n\nQaysi viloyatga borasiz?`
			: `📍 Отправление: ${region}\n\nВ какой регион едете?`

	await ctx.reply(message, keyboards.driverToRegionsKeyboard(user.language))
}

// Kirish viloyatini tanlash
const selectToRegion = async (ctx, callbackData) => {
	const user = ctx.user
	const region = callbackData.replace('driver_to_', '')

	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	ctx.session.driverData.toRegion = region

	user.state = states.DRIVER_REG_FULLNAME
	await user.save()

	const message =
		user.language === 'uz'
			? `📍 Kirish: ${region}\n\n👤 Ism-familyangizni kiriting:`
			: `📍 Прибытие: ${region}\n\n👤 Введите ваше имя и фамилию:`

	await ctx.reply(message)
}

// Ism-familyani saqlash
const saveFullName = async (ctx, text) => {
	const user = ctx.user

	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	if (text.length < 3) {
		const message =
			user.language === 'uz'
				? "❌ Ism-familya kamida 3 ta belgidan iborat bo'lishi kerak."
				: '❌ Имя и фамилия должны содержать не менее 3 символов.'

		await ctx.reply(message)
		return
	}

	ctx.session.driverData.fullName = text

	user.state = states.DRIVER_REG_PHONE
	await user.save()

	const message =
		user.language === 'uz'
			? '📞 Telefon raqamingizni yuboring (yoki +998XXXXXXXXX formatida yozing):'
			: '📞 Отправьте номер телефона (или напишите в формате +998XXXXXXXXX):'

	await ctx.reply(message, {
		reply_markup: {
			keyboard: [
				[
					{
						text:
							user.language === 'uz'
								? '📞 Telefon raqamini yuborish'
								: '📞 Отправить номер телефона',
						request_contact: true
					}
				]
			],
			resize_keyboard: true,
			one_time_keyboard: true
		}
	})
}

// Telefon raqamini saqlash
const savePhone = async (ctx, phone) => {
	const user = ctx.user

	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	let formattedPhone = phone.replace(/\s+/g, '')

	if (!formattedPhone.startsWith('+')) {
		if (formattedPhone.startsWith('998')) {
			formattedPhone = '+' + formattedPhone
		} else if (formattedPhone.startsWith('0')) {
			formattedPhone = '+998' + formattedPhone.substring(1)
		} else {
			formattedPhone = '+998' + formattedPhone
		}
	}

	const phoneRegex = /^\+998[0-9]{9}$/
	if (!phoneRegex.test(formattedPhone)) {
		const message =
			user.language === 'uz'
				? "❌ Telefon raqami noto'g'ri formatda. +998XXXXXXXXX formatida kiriting."
				: '❌ Неверный формат номера телефона. Введите в формате +998XXXXXXXXX.'

		await ctx.reply(message)
		return
	}

	ctx.session.driverData.phone = formattedPhone

	user.state = states.DRIVER_REG_SELECT_CAR
	await user.save()

	await showCarSelection(ctx)
}

// Mashinalarni tanlashni ko'rsatish
// const showCarSelection = async ctx => {
// 	const user = ctx.user

// 	const cars = await Car.find({ isActive: true }).sort({ name: 1 })

// 	if (cars.length === 0) {
// 		const message =
// 			user.language === 'uz'
// 				? "🚗 Mashina modellari topilmadi. Mashina modelini qo'lda kiriting:"
// 				: '🚗 Модели машин не найдены. Введите модель машины вручную:'

// 		user.state = states.DRIVER_REG_CAR_MODEL
// 		await user.save()

// 		await ctx.reply(message, {
// 			reply_markup: {
// 				remove_keyboard: true
// 			}
// 		})
// 		return
// 	}

// 	const message =
// 		user.language === 'uz' ? '🚗 Mashina modelini tanlang:' : '🚗 Выберите модель машины:'

// 	const keyboardButtons = []

// 	for (let i = 0; i < cars.length; i += 3) {
// 		const row = []

// 		for (let j = 0; j < 3; j++) {
// 			if (cars[i + j]) {
// 				const car = cars[i + j]
// 				const displayName = user.language === 'uz' ? car.name : car.nameRu
// 				row.push(Markup.button.callback(displayName, `car_select_${car._id}`))
// 			}
// 		}

// 		if (row.length > 0) {
// 			keyboardButtons.push(row)
// 		}
// 	}

// 	const keyboard = Markup.inlineKeyboard(keyboardButtons)

// 	await ctx.reply(message, keyboard)
// }

const selectCarType = async ctx => {
	const user = ctx.user

	const carTypes = await CarType.find({ isActive: true }).sort({ name: 1 })

	if (carTypes.length === 0) {
		// Agar mashina turlari bo'lmasa, mashina raqamini so'rash
		console.log('⚠️ No car types found, asking for car number directly')

		// Avval xabarni o'chirish
		try {
			await ctx.deleteMessage()
		} catch (error) {
			console.log('Delete message error:', error.message)
		}

		await askCarNumber(ctx)
		return
	}

	const carModelDisplay =
		user.language === 'uz'
			? ctx.session.driverData.carModel
			: ctx.session.driverData.carModelRu || ctx.session.driverData.carModel

	const message =
		user.language === 'uz'
			? `🚗 Mashinangiz modeli: ${carModelDisplay}\n\nMashina turini tanlang:`
			: `🚗 Модель вашей машины: ${carModelDisplay}\n\nВыберите тип машины:`

	const keyboardButtons = []

	for (let i = 0; i < carTypes.length; i += 3) {
		const row = []

		for (let j = 0; j < 3; j++) {
			if (carTypes[i + j]) {
				const carType = carTypes[i + j]
				const displayName = user.language === 'uz' ? carType.name : carType.nameRu
				row.push(Markup.button.callback(displayName, `car_type_${carType._id}`))
			}
		}

		if (row.length > 0) {
			keyboardButtons.push(row)
		}
	}

	keyboardButtons.push([
		Markup.button.callback(
			user.language === 'uz' ? "⏭ O'tkazib yuborish" : '⏭ Пропустить',
			'car_type_skip'
		)
	])

	const keyboard = Markup.inlineKeyboard(keyboardButtons)

	await ctx.reply(message, keyboard)
}

// // Mashina turini tanlash callback
// const selectCarTypeCallback = async (ctx, callbackData) => {
// 	const user = ctx.user

// 	ctx.session = ctx.session || {}
// 	ctx.session.driverData = ctx.session.driverData || {}

// 	if (callbackData === 'car_type_skip') {
// 		ctx.session.driverData.carType = null
// 		ctx.session.driverData.carTypeName = null
// 		ctx.session.driverData.carTypeNameRu = null

// 		user.state = states.DRIVER_REG_MAX_PASSENGERS
// 		await user.save()

// 		const message =
// 			user.language === 'uz'
// 				? '👥 Necha kishigacha olib ketasiz?'
// 				: '👥 Сколько человек вы можете взять?'

// 		await ctx.reply(message, keyboards.maxPassengersKeyboard(user.language))
// 		return
// 	}

// 	const carTypeId = callbackData.replace('car_type_', '')
// 	const carType = await CarType.findById(carTypeId)

// 	if (!carType) {
// 		await ctx.reply(
// 			user.language === 'uz' ? '❌ Mashina turi topilmadi' : '❌ Тип машины не найден'
// 		)
// 		return
// 	}

// 	ctx.session.driverData.carType = carType._id
// 	ctx.session.driverData.carTypeName = carType.name
// 	ctx.session.driverData.carTypeNameRu = carType.nameRu

// 	user.state = states.DRIVER_REG_MAX_PASSENGERS
// 	await user.save()

// 	const successMessage =
// 		user.language === 'uz'
// 			? `✅ Mashina turi tanlandi: ${carType.name}\n\n👥 Necha kishigacha olib ketasiz?`
// 			: `✅ Тип машины выбран: ${carType.nameRu}\n\n👥 Сколько человек вы можете взять?`

// 	await ctx.reply(successMessage, keyboards.maxPassengersKeyboard(user.language))
// }

// Maksimal yo'lovchilar sonini tanlash
const selectMaxPassengers = async (ctx, callbackData) => {
	const user = ctx.user

	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	const maxPassengers = parseInt(callbackData.replace('max_passengers_', ''))

	ctx.session.driverData.maxPassengers = maxPassengers

	user.state = states.DRIVER_REG_SERVICE_TYPE
	await user.save()

	const message =
		user.language === 'uz'
			? `👥 Maksimal yo'lovchilar soni: ${maxPassengers} kishi\n\n🎯 Qanday xizmat ko'rsatmoqchisiz? (bir nechtasini tanlash mumkin)`
			: `👥 Максимальное количество пассажиров: ${maxPassengers} человек\n\n🎯 Какие услуги вы предоставляете? (можно выбрать несколько)`

	await ctx.reply(message, keyboards.serviceTypeKeyboard(user.language, []))
}

// Xizmat turini tanlash
// const selectServiceType = async (ctx, callbackData) => {
// 	const user = ctx.user

// 	ctx.session = ctx.session || {}
// 	ctx.session.driverData = ctx.session.driverData || {}

// 	if (!ctx.session.driverData.serviceType) {
// 		ctx.session.driverData.serviceType = []
// 	}

// 	if (callbackData === 'service_done') {
// 		if (ctx.session.driverData.serviceType.length === 0) {
// 			const message =
// 				user.language === 'uz'
// 					? '❌ Kamida bitta xizmat turini tanlashingiz kerak.'
// 					: '❌ Вы должны выбрать хотя бы один тип услуги.'

// 			await ctx.reply(message)
// 			await ctx.reply(
// 				user.language === 'uz'
// 					? "🎯 Qanday xizmat ko'rsatmoqchisiz?"
// 					: '🎯 Какие услуги вы предоставляете?',
// 				keyboards.serviceTypeKeyboard(user.language, ctx.session.driverData.serviceType)
// 			)
// 			return
// 		}

// 		await showDateTimeSelection(ctx)
// 		return
// 	}

// 	const serviceType = callbackData.replace('service_', '')

// 	if (ctx.session.driverData.serviceType.includes(serviceType)) {
// 		ctx.session.driverData.serviceType = ctx.session.driverData.serviceType.filter(
// 			type => type !== serviceType
// 		)
// 	} else {
// 		ctx.session.driverData.serviceType.push(serviceType)
// 	}

// 	const serviceNames = {
// 		road: user.language === 'uz' ? "Yo'l-yo'lakay" : 'Попутка',
// 		route: user.language === 'uz' ? "Yo'nalish" : 'Направление',
// 		parcel: user.language === 'uz' ? 'Pochta' : 'Посылка'
// 	}

// 	let selectedServices = ''
// 	if (ctx.session.driverData.serviceType.length > 0) {
// 		selectedServices = ctx.session.driverData.serviceType.map(type => serviceNames[type]).join(', ')
// 	}

// 	const message =
// 		user.language === 'uz'
// 			? `🎯 Tanlangan xizmatlar: ${
// 					selectedServices || 'Hali tanlanmagan'
// 			  }\n\nQo'shimcha xizmat tanlash yoki "Tayyor" tugmasini bosing:`
// 			: `🎯 Выбранные услуги: ${
// 					selectedServices || 'Еще не выбрано'
// 			  }\n\nВыберите дополнительные услуги или нажмите "Готово":`

// 	await ctx.reply(
// 		message,
// 		keyboards.serviceTypeKeyboard(user.language, ctx.session.driverData.serviceType)
// 	)
// }

// Xizmat turini tanlash
const selectServiceType = async (ctx, callbackData) => {
	const user = ctx.user

	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	if (!ctx.session.driverData.serviceType) {
		ctx.session.driverData.serviceType = []
	}

	if (callbackData === 'service_done') {
		if (ctx.session.driverData.serviceType.length === 0) {
			const message =
				user.language === 'uz'
					? '❌ Kamida bitta xizmat turini tanlashingiz kerak.'
					: '❌ Вы должны выбрать хотя бы один тип услуги.'

			await ctx.reply(message)
			await ctx.reply(
				user.language === 'uz'
					? "🎯 Qanday xizmat ko'rsatmoqchisiz?"
					: '🎯 Какие услуги вы предоставляете?',
				keyboards.serviceTypeKeyboard(user.language, ctx.session.driverData.serviceType)
			)
			return
		}

		// Vaqt tanlashga o'tish
		await showWorkHoursSelection(ctx)
		return
	}

	const serviceType = callbackData.replace('service_', '')

	if (ctx.session.driverData.serviceType.includes(serviceType)) {
		ctx.session.driverData.serviceType = ctx.session.driverData.serviceType.filter(
			type => type !== serviceType
		)
	} else {
		ctx.session.driverData.serviceType.push(serviceType)
	}

	const serviceNames = {
		road: user.language === 'uz' ? "Yo'l-yo'lakay" : 'Попутка',
		route: user.language === 'uz' ? "Yo'nalish" : 'Направление',
		parcel: user.language === 'uz' ? 'Pochta' : 'Посылка'
	}

	let selectedServices = ''
	if (ctx.session.driverData.serviceType.length > 0) {
		selectedServices = ctx.session.driverData.serviceType.map(type => serviceNames[type]).join(', ')
	}

	const message =
		user.language === 'uz'
			? `🎯 Tanlangan xizmatlar: ${
					selectedServices || 'Hali tanlanmagan'
			  }\n\nQo'shimcha xizmat tanlash yoki "Tayyor" tugmasini bosing:`
			: `🎯 Выбранные услуги: ${
					selectedServices || 'Еще не выбрано'
			  }\n\nВыберите дополнительные услуги или нажмите "Готово":`

	await ctx.reply(
		message,
		keyboards.serviceTypeKeyboard(user.language, ctx.session.driverData.serviceType)
	)
}

// ====================== VAQT VA SANA TANLASH ======================
const generateDateKeyboard = (lang = 'uz') => {
    const days = []
    const today = new Date()

    for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)

        const dayName = date.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'ru-RU', { weekday: 'short' })
        const dateStr = date.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'ru-RU', {
            day: 'numeric',
            month: 'long'
        })

        const buttonText = `${dayName}, ${dateStr}`
        const callbackData = `date_${date.toISOString().split('T')[0]}`

        days.push([Markup.button.callback(buttonText, callbackData)])
    }

    return Markup.inlineKeyboard(days)
}

const generateTimeKeyboard = (lang = 'uz') => {
	const rows = []
	const times = []

	for (let hour = 5; hour < 24; hour++) {
		for (let minute = 0; minute < 60; minute += 30) {
			const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
			times.push(timeStr)
		}
	}

	for (let i = 0; i < times.length; i += 6) {
		const rowTimes = times.slice(i, i + 6)
		const row = rowTimes.map(time => Markup.button.callback(time, `time_${time}`))
		rows.push(row)
	}

	return Markup.inlineKeyboard(rows)
}
const showDateTimeSelection = async ctx => {
	const user = ctx.user

	user.state = states.DRIVER_REG_DATE_SELECTION
	await user.save()

	const message =
		user.language === 'uz'
			? "📅 Jo'nash sanasini tanlang (keyingi 7 kun):\n\n" +
			  "Yoki qo'lda sanani kiriting:\n" +
			  '📝 Format: <code>YYYY-MM-DD</code>\n' +
			  '✅ Masalan: <code>2024-12-25</code>\n' +
			  '✅ Masalan: <code>2024-12-31</code>'
			: '📅 Выберите дату отправления (следующие 7 дней):\n\n' +
			  'Или введите дату вручную:\n' +
			  '📝 Формат: <code>YYYY-MM-DD</code>\n' +
			  '✅ Например: <code>2024-12-25</code>\n' +
			  '✅ Например: <code>2024-12-31</code>'

	// Kalendar tugmalari - TO'G'RI FORMATDA OLISH
    const dateKeyboard = generateDateKeyboard(user.language)

	const keyboardButtons = dateKeyboard.reply_markup
		? [...dateKeyboard.reply_markup.inline_keyboard]
		: []

	// Qo'lda kiritish tugmasini qo'shish
	keyboardButtons.push([
		Markup.button.callback(
			user.language === 'uz' ? "✏️ Qo'lda kiritish" : '✏️ Ввести вручную',
			'date_manual_input'
		)
	])

	// Orqaga tugmasi
	keyboardButtons.push([
		Markup.button.callback(user.language === 'uz' ? '⬅️ Orqaga' : '⬅️ Назад', 'back_to_work_hours')
	])

	const keyboard = Markup.inlineKeyboard(keyboardButtons)

	await ctx.reply(message, keyboard)
}

const handleDateManualInput = async ctx => {
    const user = ctx.user

    user.state = states.DRIVER_REG_DATE_MANUAL
    await user.save()

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 30) // 30 kun ichida istalgan sana

    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const nextWeekStr = nextWeek.toISOString().split('T')[0]

    const message = user.language === 'uz'
        ? "✏️ Sanani quyidagi formatda kiriting:\n" +
          "📝 <code>YYYY-MM-DD</code>\n\n" +
          "✅ Masalan:\n" +
          `• Bugun: <code>${todayStr}</code>\n` +
          `• Ertaga: <code>${tomorrowStr}</code>\n` +
          `• Keyingi hafta: <code>${nextWeekStr}</code>\n\n` +
          "ℹ️ Faqat kelajakdagi sanalarni kiritishingiz mumkin (o'tgan kunlar yo'q)\n" +
          "ℹ️ Maksimal 30 kun ichidagi sanalar"
        : "✏️ Введите дату в формате:\n" +
          "📝 <code>YYYY-MM-DD</code>\n\n" +
          "✅ Например:\n" +
          `• Сегодня: <code>${todayStr}</code>\n` +
          `• Завтра: <code>${tomorrowStr}</code>\n` +
          `• Следующая неделя: <code>${nextWeekStr}</code>\n\n` +
          "ℹ️ Можно вводить только будущие даты (прошедшие дни нельзя)\n" +
          "ℹ️ Даты в пределах 30 дней"

    await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true }
    })
}

// ====================== QO'LDA KIRITILGAN SANANI SAQLASH ======================
const saveManualDateInput = async (ctx, text) => {
    const user = ctx.user

    console.log('📅 Qo\'lda sana kiritildi:', text)

    // Sana formatini tekshirish (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    
    if (!dateRegex.test(text)) {
        await ctx.reply(
            user.language === 'uz'
                ? "❌ Noto'g'ri sana formati! Iltimos, YYYY-MM-DD formatida kiriting.\nMasalan: 2024-12-25"
                : '❌ Неправильный формат даты! Пожалуйста, введите в формате YYYY-MM-DD.\nНапример: 2024-12-25'
        )
        return
    }

    // Sana obyektini yaratish
    const inputDate = new Date(text)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Faqat sanani solishtirish uchun
    
    const maxDate = new Date()
    maxDate.setDate(today.getDate() + 30) // Maksimal 30 kun

    // Sana noto'g'ri bo'lsa
    if (isNaN(inputDate.getTime())) {
        await ctx.reply(
            user.language === 'uz'
                ? "❌ Noto'g'ri sana! Iltimos, to'g'ri sanani kiriting."
                : '❌ Неправильная дата! Пожалуйста, введите правильную дату.'
        )
        return
    }

    // O'tgan sana bo'lmasligi kerak
    if (inputDate < today) {
        await ctx.reply(
            user.language === 'uz'
                ? "❌ O'tgan sanani kiritish mumkin emas! Faqat kelajakdagi sanalar."
                : '❌ Нельзя вводить прошедшие даты! Только будущие даты.'
        )
        return
    }

    // 30 kundan keyingi sana bo'lmasligi kerak
    if (inputDate > maxDate) {
        await ctx.reply(
            user.language === 'uz'
                ? `❌ Sana 30 kundan keyin bo'lishi mumkin emas! Iltimos, ${maxDate.toISOString().split('T')[0]} dan oldingi sanani kiriting.`
                : `❌ Дата не может быть позже чем через 30 дней! Пожалуйста, введите дату до ${maxDate.toISOString().split('T')[0]}.`
        )
        return
    }

    // Sessionga sana saqlash
    ctx.session = ctx.session || {}
    ctx.session.driverData = ctx.session.driverData || {}
    ctx.session.selectedDate = inputDate.toISOString().split('T')[0]

    console.log('✅ Sana sessionga saqlandi:', ctx.session.selectedDate)

    // Sana formatlash
    const formattedDate = inputDate.toLocaleDateString(user.language === 'uz' ? 'uz-UZ' : 'ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })

    // Vaqtni so'rash
    const successMessage = user.language === 'uz'
        ? `✅ Sana tanlandi: ${formattedDate}\n\n⏰ Endi jo'nash vaqtini kiriting (masalan: 14:30 yoki 08:00):`
        : `✅ Дата выбрана: ${formattedDate}\n\n⏰ Теперь введите время отправления (например: 14:30 или 08:00):`

    user.state = states.DRIVER_REG_TIME_INPUT
    await user.save()

    await ctx.reply(successMessage, {
        reply_markup: { remove_keyboard: true }
    })
}

// ====================== ORQAGA QAYTISH (ISH VAQTI TANLASHGA) ======================
const handleBackToWorkHours = async ctx => {
    const user = ctx.user
    
    console.log('⬅️ Orqaga qaytish: Ish vaqti tanlashga')
    
    user.state = states.DRIVER_REG_WORK_HOURS
    await user.save()
    
    // Work hours tanlash sahifasiga qaytish
    await showWorkHoursSelection(ctx)
}

// ====================== EXISTING selectDate FUNKSIYASINI YANGILASH ======================
const selectDate = async (ctx, callbackData) => {
    const user = ctx.user
    
    // Agar qo'lda kiritish tugmasi bosilsa
    if (callbackData === 'date_manual_input') {
        await handleDateManualInput(ctx)
        return
    }
    
    // Oddiy sana tanlash (callbackData format: date_2024-12-25)
    const dateStr = callbackData.replace('date_', '')

    console.log('📞 selectDate chaqirildi, callbackData:', callbackData)
    console.log('📅 Ajratilgan sana:', dateStr)

    ctx.session = ctx.session || {}
    ctx.session.driverData = ctx.session.driverData || {}

    // Sana sessionga saqlash
    ctx.session.selectedDate = dateStr
    console.log('✅ Session selectedDate ga saqlandi:', ctx.session.selectedDate)

    // Vaqtni so'rash
    await showTimeInput(ctx)
}

// generateTimeKeyboard o'rniga qo'lda vaqt kiritish uchun funksiya
const showTimeInput = async ctx => {
	const user = ctx.user

	console.log('⏰ showTimeInput chaqirildi')
	console.log('🔍 Session selectedDate:', ctx.session?.selectedDate)

	const dateStr = ctx.session.selectedDate
	if (!dateStr) {
		console.log('❌ Sessionda sana topilmadi')
		await ctx.reply(
			user.language === 'uz'
				? '❌ Sana tanlanmagan. Iltimos, qaytadan boshlang.'
				: '❌ Дата не выбрана. Пожалуйста, начните сначала.'
		)
		return
	}

	const date = new Date(dateStr)
	console.log('📅 Date object:', date)

	const formattedDate = date.toLocaleDateString(user.language === 'uz' ? 'uz-UZ' : 'ru-RU', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	})

	console.log('📅 Formatlangan sana:', formattedDate)

	const message =
		user.language === 'uz'
			? `📅 Tanlangan sana: ${formattedDate}\n\n⏰ Jo'nash vaqtini kiriting (masalan: 14:30 yoki 08:00):`
			: `📅 Выбранная дата: ${formattedDate}\n\n⏰ Введите время отправления (например: 14:30 или 08:00):`

	// State ni o'zgartirish
	user.state = states.DRIVER_REG_TIME_INPUT
	await user.save()

	console.log('✅ User state yangilandi:', user.state)

	await ctx.reply(message, {
		reply_markup: {
			remove_keyboard: true
		}
	})
}

// Va selectTime o'rniga saveTimeInput funksiyasi
// const saveTimeInput = async (ctx, text) => {
// 	const user = ctx.user

// 	ctx.session = ctx.session || {}
// 	ctx.session.driverData = ctx.session.driverData || {}

// 	const selectedDate = ctx.session.selectedDate
// 	const date = new Date(selectedDate)
// 	const formattedDate = date.toLocaleDateString(user.language === 'uz' ? 'uz-UZ' : 'ru-RU', {
// 		weekday: 'long',
// 		day: 'numeric',
// 		month: 'long'
// 	})

// 	// Vaqt formatini tekshirish (HH:mm)
// 	const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

// 	if (!timeRegex.test(text)) {
// 		await ctx.reply(
// 			user.language === 'uz'
// 				? "❌ Noto'g'ri vaqt formati! Iltimos, quyidagi formatda kiriting:\nMasalan: 08:00, 14:30, 22:15"
// 				: '❌ Неправильный формат времени! Пожалуйста, введите в формате:\nНапример: 08:00, 14:30, 22:15'
// 		)
// 		return
// 	}

// 	// Vaqtni saqlash
// 	ctx.session.driverData.departureTime = `${formattedDate}, ${text}`

// 	delete ctx.session.selectedDate

// 	await showConfirmation(ctx)
// }
const saveTimeInput = async (ctx, text) => {
	const user = ctx.user

	console.log('⏰ ========== saveTimeInput START ==========')
	console.log('📝 Kiritilgan vaqt:', text)
	console.log('👤 User state before:', user.state)
	console.log('🔍 Full session:', JSON.stringify(ctx.session, null, 2))

	// Sessionni tekshirish
	if (!ctx.session) {
		console.log("❌ Session yo'q")
		ctx.session = {}
	}

	if (!ctx.session.driverData) {
		console.log("❌ driverData yo'q, yangilash")
		ctx.session.driverData = {}
	}

	const selectedDate = ctx.session.selectedDate

	console.log('📅 Selected date from session:', selectedDate)

	if (!selectedDate) {
		console.log('❌ Sana topilmadi! Session:')
		console.log(JSON.stringify(ctx.session, null, 2))

		await ctx.reply(
			user.language === 'uz'
				? '❌ Sana tanlanmagan. Iltimos, qaytadan boshlang.'
				: '❌ Дата не выбрана. Пожалуйста, начните сначала.'
		)

		// Sana tanlash sahifasiga qaytish
		await showDateTimeSelection(ctx)
		return
	}

	// Oddiy vaqt tekshiruvi
	if (!text.includes(':')) {
		console.log("❌ Vaqt formatida : belgisi yo'q")
		await ctx.reply(
			user.language === 'uz'
				? "❌ Noto'g'ri vaqt formati! Iltimos, HH:mm formatida kiriting.\nMasalan: 14:30"
				: '❌ Неправильный формат времени! Пожалуйста, введите в формате HH:mm.\nНапример: 14:30'
		)
		return
	}

	// Sanani formatlash
	const date = new Date(selectedDate)
	const formattedDate = date.toLocaleDateString(user.language === 'uz' ? 'uz-UZ' : 'ru-RU', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	})

	console.log('📅 Formatlangan sana:', formattedDate)

	// departureTime ni saqlash
	ctx.session.driverData.departureTime = `${formattedDate}, ${text}`
	console.log('✅ departureTime saqlandi:', ctx.session.driverData.departureTime)

	// selectedDate sessionni tozalash
	delete ctx.session.selectedDate
	console.log("✅ selectedDate sessiondan o'chirildi")

	// User state ni o'zgartirish
	user.state = states.DRIVER_REG_CONFIRM
	await user.save()
	console.log('✅ User state yangilandi:', user.state)

	// Sessionni saqlash
	console.log('🔍 Final session before confirmation:')
	console.log(JSON.stringify(ctx.session, null, 2))

	// Tasdiqlash sahifasini ko'rsatish
	console.log('📤 showConfirmation chaqirilmoqda...')
	await showConfirmation(ctx)

	console.log('⏰ ========== saveTimeInput END ==========')
}

const showConfirmation = async ctx => {
	const user = ctx.user;

	console.log('✅ ========== showConfirmation START ==========');
	console.log('👤 User state:', user.state);
	console.log('🔍 Full session:', JSON.stringify(ctx.session, null, 2));

	if (!ctx.session || !ctx.session.driverData) {
		console.log("❌ Session yoki driverData yo'q");
		await ctx.reply(
			user.language === 'uz'
				? "❌ Ma'lumotlar topilmadi. Iltimos, qaytadan boshlang."
				: '❌ Данные не найдены. Пожалуйста, начните заново.'
		);
		user.state = states.MAIN_MENU;
		await user.save();
		return;
	}

	const data = ctx.session.driverData;

	console.log("📊 Barcha ma'lumotlar tekshirilmoqda:");
	console.log('1. fullName:', data.fullName || "YO'Q");
	console.log('2. phone:', data.phone || "YO'Q");
	console.log('3. fromRegion:', data.fromRegion || "YO'Q");
	console.log('4. toRegion:', data.toRegion || "YO'Q");
	console.log('5. carModel:', data.carModel || "YO'Q");
	console.log('6. carNumber:', data.carNumber || "YO'Q"); // Mashina raqami
	console.log('7. maxPassengers:', data.maxPassengers || "YO'Q");
	console.log('8. serviceType:', data.serviceType || "YO'Q");
	console.log('9. workHours:', data.workHours || "YO'Q");
	console.log('10. departureTime:', data.departureTime || "YO'Q");

	// Tasdiqlash xabari
	const serviceNames = {
		road: user.language === 'uz' ? "Yo'l-yo'lakay" : 'Попутка',
		route: user.language === 'uz' ? "Yo'nalish" : 'Направление',
		parcel: user.language === 'uz' ? 'Pochta' : 'Посылка'
	};

	const services = data.serviceType
		? data.serviceType.map(type => serviceNames[type] || type).join(', ')
		: 'Tanlanmagan';

	// Mashina raqamini ko'rsatish
	const carNumberInfo = data.carNumber ? `🚘 <b>Mashina raqami:</b> ${data.carNumber}\n` : '';

	const message =
		user.language === 'uz'
			? `📋 <b>Ma'lumotlaringizni tekshiring:</b>\n\n` +
			  `📍 <b>Chiqish:</b> ${data.fromRegion || 'Tanlanmagan'}\n` +
			  `📍 <b>Kirish:</b> ${data.toRegion || 'Tanlanmagan'}\n` +
			  `👤 <b>Ism-familiya:</b> ${data.fullName || 'Tanlanmagan'}\n` +
			  `📞 <b>Telefon:</b> ${data.phone || 'Tanlanmagan'}\n` +
			  `🚗 <b>Mashina:</b> ${data.carModel || 'Tanlanmagan'}\n` +
			  carNumberInfo + // Mashina raqami qo'shildi
			  `👥 <b>Sig'im:</b> ${data.maxPassengers || 'Tanlanmagan'} kishi\n` +
			  `🎯 <b>Xizmatlar:</b> ${services}\n` +
			  `🏪 <b>Ish vaqti:</b> ${data.workHours || 'Tanlanmagan'}\n` +
			  (data.departureTime ? `⏰ <b>Jo'nash vaqti:</b> ${data.departureTime}\n\n` : '\n') +
			  `<b>Barchasi to'g'rimi?</b>`
			: `📋 <b>Проверьте ваши данные:</b>\n\n` +
			  `📍 <b>Отправление:</b> ${data.fromRegion || 'Не выбрано'}\n` +
			  `📍 <b>Прибытие:</b> ${data.toRegion || 'Не выбрано'}\n` +
			  `👤 <b>Имя-фамилия:</b> ${data.fullName || 'Не выбрано'}\n` +
			  `📞 <b>Телефон:</b> ${data.phone || 'Не выбрано'}\n` +
			  `🚗 <b>Машина:</b> ${data.carModel || 'Не выбрано'}\n` +
			  carNumberInfo + // Mashina raqami qo'shildi
			  `👥 <b>Вместимость:</b> ${data.maxPassengers || 'Не выбрано'} человек\n` +
			  `🎯 <b>Услуги:</b> ${services}\n` +
			  `🏪 <b>Время работы:</b> ${data.workHours || 'Не выбрано'}\n` +
			  (data.departureTime ? `⏰ <b>Время отправления:</b> ${data.departureTime}\n\n` : '\n') +
			  `<b>Все верно?</b>`;

	// TASDIQLASH KLAVIATURASI
	const confirmKeyboard = {
		inline_keyboard: [
			[
				{
					text: user.language === 'uz' ? "✅ Ha, to'g'ri" : '✅ Да, верно',
					callback_data: 'confirm_driver_registration'
				},
				{
					text: user.language === 'uz' ? "❌ Yo'q, o'zgartirish" : '❌ Нет, изменить',
					callback_data: 'cancel_driver_registration'
				}
			]
		]
	};

	console.log('📤 Xabar yuborilmoqda...');

	try {
		await ctx.reply(message, {
			reply_markup: confirmKeyboard,
			parse_mode: 'HTML'
		});
		console.log('✅ Tasdiqlash xabari yuborildi');
	} catch (error) {
		console.error('❌ Xabar yuborishda xatolik:', error);
	}

	console.log('✅ ========== showConfirmation END ==========');
};

const editFullName = async ctx => {
	const user = ctx.user

	user.state = states.DRIVER_EDIT_FULLNAME
	await user.save()

	const message =
		user.language === 'uz'
			? '👤 Yangi ism-familiyangizni kiriting:'
			: '👤 Введите новое имя и фамилию:'

	await ctx.reply(message)
}

const editPhone = async ctx => {
	const user = ctx.user

	user.state = states.DRIVER_EDIT_PHONE
	await user.save()

	const message =
		user.language === 'uz'
			? '📞 Yangi telefon raqamingizni yuboring (yoki +998XXXXXXXXX formatida yozing):'
			: '📞 Отправьте новый номер телефона (или напишите в формате +998XXXXXXXXX):'

	await ctx.reply(message, {
		reply_markup: {
			keyboard: [
				[
					{
						text:
							user.language === 'uz'
								? '📞 Telefon raqamini yuborish'
								: '📞 Отправить номер телефона',
						request_contact: true
					}
				]
			],
			resize_keyboard: true,
			one_time_keyboard: true
		}
	})
}

const editCar = async ctx => {
	const user = ctx.user

	user.state = states.DRIVER_EDIT_CAR
	await user.save()

	const driver = await Driver.findOne({ telegramId: user.telegramId })

	if (driver && driver.carModel) {
		let currentCarName = ''
		if (typeof driver.carModel === 'object' && driver.carModel.name) {
			currentCarName = user.language === 'uz' ? driver.carModel.name : driver.carModel.nameRu
		} else {
			currentCarName = driver.carModel
		}

		const currentCarMessage =
			user.language === 'uz'
				? `🚗 Joriy mashina: ${currentCarName}\n\n`
				: `🚗 Текущая машина: ${currentCarName}\n\n`

		await ctx.reply(
			currentCarMessage +
				(user.language === 'uz'
					? 'Yangi mashina modelini tanlang:'
					: 'Выберите новую модель машины:')
		)
	} else {
		await ctx.reply(
			user.language === 'uz' ? '🚗 Mashina modelini tanlang:' : '🚗 Выберите модель машины:'
		)
	}

	await showCarSelection(ctx)
}

const editPassengers = async ctx => {
	const user = ctx.user

	const driver = await Driver.findOne({ telegramId: user.telegramId })

	if (driver) {
		const currentPassengers =
			user.language === 'uz'
				? `👥 Joriy yo'lovchilar soni: ${driver.maxPassengers} kishi\n\n`
				: `👥 Текущее количество пассажиров: ${driver.maxPassengers} человек\n\n`

		await ctx.reply(
			currentPassengers +
				(user.language === 'uz'
					? "Yangi maksimal yo'lovchilar sonini tanlang:"
					: 'Выберите новое максимальное количество пассажиров:'),
			keyboards.maxPassengersKeyboard(user.language)
		)

		user.state = states.DRIVER_EDIT_PASSENGERS
		await user.save()
	}
}

const editRoute = async ctx => {
	const user = ctx.user

	user.state = states.DRIVER_EDIT_ROUTE_FROM
	await user.save()

	const driver = await Driver.findOne({ telegramId: user.telegramId })

	if (driver) {
		const currentRoute =
			user.language === 'uz'
				? `📍 Joriy yo'nalish: ${driver.fromRegion} → ${driver.toRegion}\n\n`
				: `📍 Текущее направление: ${driver.fromRegion} → ${driver.toRegion}\n\n`

		await ctx.reply(
			currentRoute +
				(user.language === 'uz'
					? 'Yangi chiqish viloyatini tanlang:'
					: 'Выберите новый регион отправления:'),
			keyboards.driverFromRegionsKeyboard(user.language)
		)
	} else {
		await ctx.reply(
			user.language === 'uz' ? '📍 Chiqish viloyatini tanlang:' : '📍 Выберите регион отправления:',
			keyboards.driverFromRegionsKeyboard(user.language)
		)
	}
}

const editServices = async ctx => {
	const user = ctx.user

	const driver = await Driver.findOne({ telegramId: user.telegramId })

	if (driver) {
		const serviceNames = {
			road: user.language === 'uz' ? "Yo'l-yo'lakay" : 'Попутка',
			route: user.language === 'uz' ? "Yo'nalish" : 'Направление',
			parcel: user.language === 'uz' ? 'Pochta' : 'Посылка'
		}

		let currentServices = 'Hali tanlanmagan'
		if (driver.serviceType && driver.serviceType.length > 0) {
			currentServices = driver.serviceType.map(type => serviceNames[type]).join(', ')
		}

		const currentMessage =
			user.language === 'uz'
				? `🎯 Joriy xizmatlar: ${currentServices}\n\n`
				: `🎯 Текущие услуги: ${currentServices}\n\n`

		await ctx.reply(
			currentMessage +
				(user.language === 'uz'
					? 'Yangi xizmat turlarini tanlang (bir nechtasini tanlash mumkin):'
					: 'Выберите новые типы услуг (можно выбрать несколько):'),
			keyboards.serviceTypeKeyboard(user.language, driver.serviceType || [])
		)

		user.state = states.DRIVER_EDIT_SERVICES
		await user.save()
	}
}

// const editTime = async ctx => {
// 	const user = ctx.user

// 	user.state = states.DRIVER_EDIT_TIME_DATE
// 	await user.save()

// 	const driver = await Driver.findOne({ telegramId: user.telegramId })

// 	if (driver && driver.departureTime) {
// 		const currentTime =
// 			user.language === 'uz'
// 				? `⏰ Joriy jo'nash vaqti: ${driver.departureTime}\n\n`
// 				: `⏰ Текущее время отправления: ${driver.departureTime}\n\n`

// 		await ctx.reply(
// 			currentTime +
// 				(user.language === 'uz'
// 					? "Yangi jo'nash sanasini tanlang (keyingi 7 kun):"
// 					: 'Выберите новую дату отправления (следующие 7 дней):'),
// 			generateDateKeyboard(user.language)
// 		)
// 	} else {
// 		await ctx.reply(
// 			user.language === 'uz'
// 				? "📅 Jo'nash sanasini tanlang (keyingi 7 kun):"
// 				: '📅 Выберите дату отправления (следующие 7 дней):',
// 			generateDateKeyboard(user.language)
// 		)
// 	}
// }

const saveEditedFullName = async (ctx, text) => {
	const user = ctx.user

	if (text.length < 3) {
		await ctx.reply(
			user.language === 'uz'
				? "❌ Ism-familya kamida 3 ta belgidan iborat bo'lishi kerak."
				: '❌ Имя и фамилия должны содержать не менее 3 символов.'
		)
		return
	}

	const driver = await Driver.findOne({ telegramId: user.telegramId })
	if (driver) {
		driver.fullName = text
		await driver.save()

		await ctx.reply(
			user.language === 'uz'
				? `✅ Ism-familiya muvaffaqiyatli o'zgartirildi: ${text}`
				: `✅ Имя и фамилия успешно изменены: ${text}`
		)

		user.state = states.MAIN_MENU
		await user.save()

		await showDriverMenu(ctx)
	}
}

const saveEditedPhone = async (ctx, phone) => {
	const user = ctx.user

	let formattedPhone = phone.replace(/\s+/g, '')

	if (!formattedPhone.startsWith('+')) {
		if (formattedPhone.startsWith('998')) {
			formattedPhone = '+' + formattedPhone
		} else if (formattedPhone.startsWith('0')) {
			formattedPhone = '+998' + formattedPhone.substring(1)
		} else {
			formattedPhone = '+998' + formattedPhone
		}
	}

	const phoneRegex = /^\+998[0-9]{9}$/
	if (!phoneRegex.test(formattedPhone)) {
		await ctx.reply(
			user.language === 'uz'
				? "❌ Telefon raqami noto'g'ri formatda. +998XXXXXXXXX formatida kiriting."
				: '❌ Неверный формат номера телефона. Введите в формате +998XXXXXXXXX.'
		)
		return
	}

	const driver = await Driver.findOne({ telegramId: user.telegramId })
	if (driver) {
		driver.phone = formattedPhone
		await driver.save()

		await ctx.reply(
			user.language === 'uz'
				? `✅ Telefon raqami muvaffaqiyatli o'zgartirildi: ${formattedPhone}`
				: `✅ Номер телефона успешно изменен: ${formattedPhone}`
		)

		user.state = states.MAIN_MENU
		await user.save()

		await showDriverMenu(ctx)
	}
}

const saveEditedPassengers = async (ctx, callbackData) => {
	const user = ctx.user
	const maxPassengers = parseInt(callbackData.replace('max_passengers_', ''))

	const driver = await Driver.findOne({ telegramId: user.telegramId })
	if (driver) {
		driver.maxPassengers = maxPassengers
		await driver.save()

		await ctx.reply(
			user.language === 'uz'
				? `✅ Maksimal yo'lovchilar soni muvaffaqiyatli o'zgartirildi: ${maxPassengers} kishi`
				: `✅ Максимальное количество пассажиров успешно изменено: ${maxPassengers} человек`
		)

		user.state = states.MAIN_MENU
		await user.save()

		await showDriverMenu(ctx)
	}
}

const saveEditedRouteFrom = async (ctx, callbackData) => {
	const user = ctx.user
	const region = callbackData.replace('driver_from_', '')

	ctx.session = ctx.session || {}
	ctx.session.editedRoute = ctx.session.editedRoute || {}
	ctx.session.editedRoute.fromRegion = region

	user.state = states.DRIVER_EDIT_ROUTE_TO
	await user.save()

	await ctx.reply(
		user.language === 'uz'
			? `📍 Chiqish: ${region}\n\nYangi kirish viloyatini tanlang:`
			: `📍 Отправление: ${region}\n\nВыберите новый регион прибытия:`,
		keyboards.driverToRegionsKeyboard(user.language)
	)
}

const saveEditedRouteTo = async (ctx, callbackData) => {
	const user = ctx.user
	const region = callbackData.replace('driver_to_', '')

	const fromRegion = ctx.session?.editedRoute?.fromRegion

	if (!fromRegion) {
		await ctx.reply(
			user.language === 'uz'
				? '❌ Xatolik yuz berdi. Iltimos, qaytadan boshlang.'
				: '❌ Произошла ошибка. Пожалуйста, начните заново.'
		)
		return
	}

	const driver = await Driver.findOne({ telegramId: user.telegramId })
	if (driver) {
		driver.fromRegion = fromRegion
		driver.toRegion = region
		await driver.save()

		await ctx.reply(
			user.language === 'uz'
				? `✅ Yo'nalish muvaffaqiyatli o'zgartirildi: ${fromRegion} → ${region}`
				: `✅ Направление успешно изменено: ${fromRegion} → ${region}`
		)

		if (ctx.session.editedRoute) {
			delete ctx.session.editedRoute
		}

		user.state = states.MAIN_MENU
		await user.save()

		await showDriverMenu(ctx)
	}
}

const saveEditedServices = async (ctx, callbackData) => {
	const user = ctx.user

	ctx.session = ctx.session || {}
	ctx.session.editedServices = ctx.session.editedServices || []

	if (callbackData === 'service_done') {
		if (ctx.session.editedServices.length === 0) {
			await ctx.reply(
				user.language === 'uz'
					? '❌ Kamida bitta xizmat turini tanlashingiz kerak.'
					: '❌ Вы должны выбрать хотя бы один тип услуги.'
			)
			return
		}

		const driver = await Driver.findOne({ telegramId: user.telegramId })
		if (driver) {
			driver.serviceType = ctx.session.editedServices
			await driver.save()

			const serviceNames = {
				road: user.language === 'uz' ? "Yo'l-yo'lakay" : 'Попутка',
				route: user.language === 'uz' ? "Yo'nalish" : 'Направление',
				parcel: user.language === 'uz' ? 'Pochta' : 'Посылка'
			}

			const servicesText = ctx.session.editedServices.map(type => serviceNames[type]).join(', ')

			await ctx.reply(
				user.language === 'uz'
					? `✅ Xizmat turlari muvaffaqiyatli o'zgartirildi: ${servicesText}`
					: `✅ Типы услуг успешно изменены: ${servicesText}`
			)

			delete ctx.session.editedServices

			user.state = states.MAIN_MENU
			await user.save()

			await showDriverMenu(ctx)
		}
	} else {
		const serviceType = callbackData.replace('service_', '')

		if (ctx.session.editedServices.includes(serviceType)) {
			ctx.session.editedServices = ctx.session.editedServices.filter(type => type !== serviceType)
		} else {
			ctx.session.editedServices.push(serviceType)
		}

		const serviceNames = {
			road: user.language === 'uz' ? "Yo'l-yo'lakay" : 'Попутка',
			route: user.language === 'uz' ? "Yo'nalish" : 'Направление',
			parcel: user.language === 'uz' ? 'Pochta' : 'Посылка'
		}

		let selectedServices = ''
		if (ctx.session.editedServices.length > 0) {
			selectedServices = ctx.session.editedServices.map(type => serviceNames[type]).join(', ')
		}

		const message =
			user.language === 'uz'
				? `🎯 Tanlangan xizmatlar: ${
						selectedServices || 'Hali tanlanmagan'
				  }\n\nQo'shimcha xizmat tanlash yoki "Tayyor" tugmasini bosing:`
				: `🎯 Выбранные услуги: ${
						selectedServices || 'Еще не выбрано'
				  }\n\nВыберите дополнительные услуги или нажмите "Готово":`

		await ctx.reply(
			message,
			keyboards.serviceTypeKeyboard(user.language, ctx.session.editedServices)
		)
	}
}

// Mashinani saqlash (edit uchun)
const saveEditedCar = async (ctx, callbackData) => {
	const user = ctx.user
	const carId = callbackData.replace('car_select_', '')
	const car = await Car.findById(carId)

	if (!car) {
		await ctx.reply(
			user.language === 'uz' ? '❌ Mashina modeli topilmadi' : '❌ Модель машины не найдена'
		)
		await showCarSelection(ctx)
		return
	}

	const driver = await Driver.findOne({ telegramId: user.telegramId })
	if (driver) {
		driver.carModel = car._id
		await driver.save()

		await ctx.reply(
			user.language === 'uz'
				? `✅ Mashina modeli muvaffaqiyatli o'zgartirildi: ${car.name}`
				: `✅ Модель машины успешно изменена: ${car.nameRu}`
		)

		user.state = states.MAIN_MENU
		await user.save()

		await showDriverMenu(ctx)
	}
}

// Vaqtni saqlash (edit uchun)
// const saveEditedTime = async (ctx, callbackData) => {
// 	const user = ctx.user
// 	const timeStr = callbackData.replace('time_', '')

// 	ctx.session = ctx.session || {}
// 	const selectedDate = ctx.session.selectedDate

// 	if (!selectedDate) {
// 		await ctx.reply(
// 			user.language === 'uz'
// 				? '❌ Xatolik yuz berdi. Iltimos, qaytadan boshlang.'
// 				: '❌ Произошла ошибка. Пожалуйста, начните заново.'
// 		)
// 		return
// 	}

// 	const date = new Date(selectedDate)
// 	const formattedDate = date.toLocaleDateString(user.language === 'uz' ? 'uz-UZ' : 'ru-RU', {
// 		weekday: 'long',
// 		day: 'numeric',
// 		month: 'long'
// 	})

// 	const driver = await Driver.findOne({ telegramId: user.telegramId })
// 	if (driver) {
// 		driver.departureTime = `${formattedDate}, ${timeStr}`
// 		await driver.save()

// 		delete ctx.session.selectedDate

// 		await ctx.reply(
// 			user.language === 'uz'
// 				? `✅ Jo'nash vaqti muvaffaqiyatli o'zgartirildi: ${formattedDate}, ${timeStr}`
// 				: `✅ Время отправления успешно изменено: ${formattedDate}, ${timeStr}`
// 		)

// 		user.state = states.MAIN_MENU
// 		await user.save()

// 		await showDriverMenu(ctx)
// 	}
// }

// ====================== VAQTNI SAQLASH (EDIT uchun - CALLBACK bilan) ======================
const saveEditedTime = async (ctx, callbackData) => {
    const user = ctx.user
    const timeStr = callbackData.replace('time_', '')

    ctx.session = ctx.session || {}
    const selectedDate = ctx.session.selectedDate

    if (!selectedDate) {
        await ctx.reply(
            user.language === 'uz'
                ? '❌ Xatolik yuz berdi. Iltimos, qaytadan boshlang.'
                : '❌ Произошла ошибка. Пожалуйста, начните сначала.'
        )
        return
    }

    const date = new Date(selectedDate)
    const formattedDate = date.toLocaleDateString(user.language === 'uz' ? 'uz-UZ' : 'ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })

    const fullDateTime = `${formattedDate}, ${timeStr}`

    const driver = await Driver.findOne({ telegramId: user.telegramId })
    if (driver) {
        driver.departureTime = fullDateTime
        await driver.save()

        delete ctx.session.selectedDate

        await ctx.reply(
            user.language === 'uz'
                ? `✅ Jo'nash vaqti muvaffaqiyatli o'zgartirildi: ${fullDateTime}`
                : `✅ Время отправления успешно изменено: ${fullDateTime}`
        )

        user.state = states.MAIN_MENU
        await user.save()

        await showDriverMenu(ctx)
    }
}
// ====================== VAQTNIKI QO'LDA KIRITISH (EDIT) ======================
const editTimeManual = async ctx => {
    const user = ctx.user

    user.state = states.DRIVER_EDIT_TIME_MANUAL
    await user.save()

    const driver = await Driver.findOne({ telegramId: user.telegramId })

    if (driver && driver.departureTime) {
        const currentTime =
            user.language === 'uz'
                ? `⏰ Joriy jo'nash vaqti: ${driver.departureTime}\n\n`
                : `⏰ Текущее время отправления: ${driver.departureTime}\n\n`

        await ctx.reply(
            currentTime +
                (user.language === 'uz'
                    ? "✏️ Yangi jo'nash vaqtini quyidagi formatda kiriting:\nMisol: 14:30\nMisol: 08:00\n\n" +
                      "📝 Sana avtomatik ravishda bugungi kunga o'rnatiladi"
                    : '✏️ Введите новое время отправления в формате:\nПример: 14:30\nПример: 08:00\n\n' +
                      '📝 Дата будет автоматически установлена на сегодня'),
            {
                reply_markup: {
                    remove_keyboard: true
                }
            }
        )
    } else {
        await ctx.reply(
            user.language === 'uz'
                ? "✏️ Jo'nash vaqtini quyidagi formatda kiriting:\nMisol: 14:30\nMisol: 08:00\n\n" +
                  "📝 Sana avtomatik ravishda bugungi kunga o'rnatiladi"
                : '✏️ Введите время отправления в формате:\nПример: 14:30\nПример: 08:00\n\n' +
                  '📝 Дата будет автоматически установлена на сегодня',
            {
                reply_markup: {
                    remove_keyboard: true
                }
            }
        )
    }
}

// ====================== O'ZGARTIRILGAN EDIT_TIME FUNKSIYASI ======================
const editTime = async ctx => {
    const user = ctx.user

    // Tugmalar bilan xabar yuborish
    const message = user.language === 'uz'
        ? `⏰ Jo'nash vaqtini o'zgartirish\n\n` +
          `Qanday usulda o'zgartirmoqchisiz?`
        : `⏰ Изменение времени отправления\n\n` +
          `Как вы хотите изменить время?`

    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: user.language === 'uz' ? '📅 Sanani tanlash' : '📅 Выбрать дату',
                    callback_data: 'edit_time_select_date'
                }
            ],
            [
                {
                    text: user.language === 'uz' ? '✏️ Qo\'lda kiritish' : '✏️ Ввести вручную',
                    callback_data: 'edit_time_manual'
                }
            ],
            [
                {
                    text: user.language === 'uz' ? '⬅️ Orqaga' : '⬅️ Назад',
                    callback_data: 'driver_edit'
                }
            ]
        ]
    }

    await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
    })
}

// ====================== VAQTNI QO'LDA SAQLASH (EDIT) ======================
const saveEditedTimeManual = async (ctx, text) => {
    const user = ctx.user

    // Vaqt formatini tekshirish (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

    if (!timeRegex.test(text)) {
        await ctx.reply(
            user.language === 'uz'
                ? "❌ Noto'g'ri vaqt formati! Iltimos, HH:mm formatida kiriting.\nMasalan: 14:30"
                : '❌ Неправильный формат времени! Пожалуйста, введите в формате HH:mm.\nНапример: 14:30'
        )
        return
    }

    // Bugungi sana bilan vaqtni birlashtirish
    const today = new Date()
    const formattedDate = today.toLocaleDateString(user.language === 'uz' ? 'uz-UZ' : 'ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })

    const fullDateTime = `${formattedDate}, ${text}`

    const driver = await Driver.findOne({ telegramId: user.telegramId })
    if (driver) {
        driver.departureTime = fullDateTime
        await driver.save()

        await ctx.reply(
            user.language === 'uz'
                ? `✅ Jo'nash vaqti muvaffaqiyatli o'zgartirildi:\n${fullDateTime}`
                : `✅ Время отправления успешно изменено:\n${fullDateTime}`
        )

        user.state = states.MAIN_MENU
        await user.save()

        await showDriverMenu(ctx)
    }
}

// ====================== VAQT TANLASHGA QAYTISH (EDIT) ======================
const editTimeSelectDate = async ctx => {
    const user = ctx.user

    user.state = states.DRIVER_EDIT_TIME_DATE
    await user.save()

    const driver = await Driver.findOne({ telegramId: user.telegramId })

    if (driver && driver.departureTime) {
        const currentTime =
            user.language === 'uz'
                ? `⏰ Joriy jo'nash vaqti: ${driver.departureTime}\n\n`
                : `⏰ Текущее время отправления: ${driver.departureTime}\n\n`

        await ctx.reply(
            currentTime +
                (user.language === 'uz'
                    ? "Yangi jo'nash sanasini tanlang (keyingi 7 kun):"
                    : 'Выберите новую дату отправления (следующие 7 дней):'),
            generateDateKeyboard(user.language)
        )
    } else {
        await ctx.reply(
            user.language === 'uz'
                ? "📅 Jo'nash sanasini tanlang (keyingi 7 kun):"
                : '📅 Выберите дату отправления (следующие 7 дней):',
            generateDateKeyboard(user.language)
        )
    }
}

// ====================== VAQT EDIT HANDLERLARINI QAYTA ISHLASH ======================
// Driver edit menyusiga qo'shimcha tugma qo'shish
const showDriverEditMenu = async ctx => {
    const user = ctx.user

    const driver = await Driver.findOne({ telegramId: user.telegramId })

    if (!driver) {
        await ctx.reply(user.language === 'uz' ? '❌ Profil topilmadi' : '❌ Профиль не найден')
        return
    }

    const message =
        user.language === 'uz'
            ? `✏️ <b>Profil tahrirlash</b>\n\n` + `Qaysi ma'lumotni tahrirlamoqchisiz?`
            : `✏️ <b>Редактирование профиля</b>\n\n` + `Какую информацию вы хотите редактировать?`

    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: user.language === 'uz' ? '👤 Ism-familiya' : '👤 Имя-фамилия',
                    callback_data: 'edit_fullname'
                }
            ],
            [
                {
                    text: user.language === 'uz' ? '📞 Telefon raqam' : '📞 Номер телефона',
                    callback_data: 'edit_phone'
                },
                {
                    text: user.language === 'uz' ? '🚗 Mashina' : '🚗 Машина',
                    callback_data: 'edit_car'
                }
            ],
            [
                {
                    text: user.language === 'uz' ? "👥 Yo'lovchilar soni" : '👥 Количество пассажиров',
                    callback_data: 'edit_passengers'
                },
                {
                    text: user.language === 'uz' ? "📍 Yo'nalish" : '📍 Направление',
                    callback_data: 'edit_route'
                }
            ],
            [
                {
                    text: user.language === 'uz' ? '🎯 Xizmat turlari' : '🎯 Типы услуг',
                    callback_data: 'edit_services'
                }
            ],
            [
                {
                    text: user.language === 'uz' ? "⏰ Jo'nash vaqti" : '⏰ Время отправления',
                    callback_data: 'edit_time'
                }
            ],
            [
                {
                    text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
                    callback_data: 'main_menu'
                },
                {
                    text: user.language === 'uz' ? '❌ Bekor qilish' : '❌ Отмена',
                    callback_data: 'driver_info'
                }
            ]
        ]
    }

    await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
    })
}

// ====================== HAYDOVCHI BUYURTMALARI ======================
const showDriverOrders = async ctx => {
	const user = ctx.user

	try {
		const driver = await Driver.findOne({ telegramId: user.telegramId })
		if (!driver) {
			await ctx.reply(
				user.language === 'uz'
					? '❌ Haydovchi profili topilmadi.'
					: '❌ Профиль водителя не найден.'
			)
			return
		}

		// Driverga biriktirilgan buyurtmalarni olish
		const orders = await Order.find({ driverId: driver._id }).sort({ createdAt: -1 }).limit(10)

		if (orders.length === 0) {
			await ctx.reply(
				user.language === 'uz'
					? "📭 Hozircha sizga biriktirilgan buyurtmalar yo'q."
					: '📭 У вас пока нет назначенных заказов.'
			)
			return
		}

		let message =
			user.language === 'uz'
				? '🚕 Sizga biriktirilgan buyurtmalar:\n\n'
				: '🚕 Ваши назначенные заказы:\n\n'

		orders.forEach((order, index) => {
			const statusText = {
				pending: '⏳ Kutilmoqda',
				searching: '🔍 Qidirilmoqda',
				found: '✅ Qabul qilingan',
				cancelled: '❌ Bekor qilingan',
				completed: '✅ Yakunlangan'
			}

			const status =
				user.language === 'uz' ? statusText[order.status] || order.status : order.status

			message += `${index + 1}. ID: ${order._id}\n`
			message += `   📍 ${order.fromRegion} → ${order.toRegion}\n`
			message += `   👥 ${order.passengerCount} kishi\n`
			message += `   📊 ${status}\n`
			message += `   📅 ${new Date(order.createdAt).toLocaleDateString('uz-UZ')}\n\n`
		})

		await ctx.reply(message)

		// Buyurtma statuslarini o'zgartirish tugmalari
		const keyboard = {
			inline_keyboard: [
				[
					{
						text: user.language === 'uz' ? '✅ Buyurtmani yakunlash' : '✅ Завершить заказ',
						callback_data: 'complete_order'
					}
				],
				[
					{
						text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
						callback_data: 'main_menu'
					}
				]
			]
		}

		await ctx.reply(
			user.language === 'uz'
				? "Buyurtma holatini o'zgartirish uchun tugmalardan foydalaning:"
				: 'Используйте кнопки для изменения статуса заказа:',
			{ reply_markup: keyboard }
		)
	} catch (error) {
		console.error('Show driver orders error:', error)
		await ctx.reply(
			user.language === 'uz'
				? "❌ Buyurtmalarni ko'rsatishda xatolik yuz berdi."
				: '❌ Ошибка при отображении заказов.'
		)
	}
}
const showDriverMenu = async ctx => {
	const user = ctx.user

	const driver = await Driver.findOne({ telegramId: user.telegramId })
		.populate('carModel')
		.populate('carType')

	if (!driver) {
		await ctx.reply(
			user.language === 'uz'
				? "❌ Profil topilmadi. Iltimos, qaytadan ro'yxatdan o'ting."
				: '❌ Профиль не найден. Пожалуйста, зарегистрируйтесь заново.'
		)
		return
	}

	// Driverning faol buyurtmalari soni
	const activeOrdersCount = await Order.countDocuments({
		driverId: driver._id,
		status: { $in: ['found', 'searching'] }
	})

	let carModelInfo = ''
	if (driver.carModel) {
		if (typeof driver.carModel === 'object' && driver.carModel.name) {
			carModelInfo = user.language === 'uz' ? driver.carModel.name : driver.carModel.nameRu
		} else {
			carModelInfo = driver.carModel
		}
	}

	let carTypeInfo = ''
	if (driver.carType) {
		carTypeInfo = `\n🚗 Mashina turi: ${
			user.language === 'uz' ? driver.carType.name : driver.carType.nameRu
		}`
	}

	// Mashina raqami ma'lumotini qo'shing - TO'G'RI JOYLASHGAN
	const carNumberInfo = driver.carNumber ? `\n🚘 Mashina raqami: ${driver.carNumber}` : ''

	const message =
		user.language === 'uz'
			? `🚘 <b>Haydovchi menyusi</b>\n\n` +
			  `👤 <b>Ism:</b> ${driver.fullName}\n` +
			  `🚗 <b>Mashina:</b> ${carModelInfo}` +
			  carTypeInfo +
			  carNumberInfo + // Mashina raqami bu yerda ko'rsatiladi
			  `\n📍 <b>Yo'nalish:</b> ${driver.fromRegion} → ${driver.toRegion}\n` +
			  `👥 <b>Maksimal yo'lovchilar:</b> ${driver.maxPassengers} kishi` +
			  (activeOrdersCount > 0 ? `\n📋 <b>Faol buyurtmalar:</b> ${activeOrdersCount} ta` : '')
			: `🚘 <b>Меню водителя</b>\n\n` +
			  `👤 <b>Имя:</b> ${driver.fullName}\n` +
			  `🚗 <b>Машина:</b> ${carModelInfo}` +
			  carTypeInfo +
			  carNumberInfo + // Mashina raqami bu yerda ko'rsatiladi
			  `\n📍 <b>Направление:</b> ${driver.fromRegion} → ${driver.toRegion}\n` +
			  `👥 <b>Максимум пассажиров:</b> ${driver.maxPassengers} человек` +
			  (activeOrdersCount > 0 ? `\n📋 <b>Активные заказы:</b> ${activeOrdersCount}` : '')

	const keyboard = {
		inline_keyboard: [
			[
				{
					text: user.language === 'uz' ? '✏️ Profilni tahrirlash' : '✏️ Редактировать профиль',
					callback_data: 'driver_edit'
				}
			]
		]
	}

	await ctx.reply(message, {
		reply_markup: keyboard,
		parse_mode: 'HTML' // HTML format uchun qo'shildi
	})
}
// ====================== BUYURTMA BERISH TIZIMI ======================

// Buyurtmani saqlash va haydovchilarni qidirish
// const createOrderAndFindDrivers = async (ctx, orderData) => {
// 	const user = ctx.user

// 	try {
// 		// Buyurtmani yaratish
// 		const order = new Order({
// 			passengerId: user.telegramId,
// 			fromRegion: orderData.fromRegion,
// 			toRegion: orderData.toRegion,
// 			passengerCount: orderData.passengerCount,
// 			hasPackage: orderData.hasPackage || false,
// 			comment: orderData.comment || '',
// 			status: 'searching',
// 			createdAt: new Date()
// 		})

// 		await order.save()

// 		// Yo'nalish bo'yicha faol haydovchilarni qidirish
// 		const drivers = await Driver.find({
// 			status: 'active',
// 			fromRegion: order.fromRegion,
// 			toRegion: order.toRegion,
// 			maxPassengers: { $gte: order.passengerCount },
// 			serviceType: order.hasPackage ? { $in: ['parcel'] } : { $in: ['road', 'route'] }
// 		})
// 		.limit(10)
// 		.populate('carModel')
// 		.populate('carType')

// 		if (drivers.length === 0) {
// 			// Haydovchi topilmasa
// 			await ctx.reply(
// 				user.language === 'uz'
// 					? `❌ Sizning yo'nalishingizda haydovchilar topilmadi.\n\n` +
// 					  `📍 ${order.fromRegion} → ${order.toRegion}\n` +
// 					  `👥 ${order.passengerCount} kishi\n\n` +
// 					  `Birozdan so'ng qayta urinib ko'ring yoki boshqa yo'nalish tanlang.`
// 					: `❌ В вашем направлении не найдено водителей.\n\n` +
// 					  `📍 ${order.fromRegion} → ${order.toRegion}\n` +
// 					  `👥 ${order.passengerCount} человек\n\n` +
// 					  `Попробуйте позже или выберите другое направление.`
// 			)
// 			return
// 		}

// 		// Buyurtma qabul qilingan xabari
// 		const orderMessage = user.language === 'uz'
// 			? `✅ Buyurtma qabul qilindi!\n\n` +
// 			  `📍 Chiqish: ${order.fromRegion}\n` +
// 			  `📍 Kirish: ${order.toRegion}\n` +
// 			  `👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
// 			  `📦 Pochta: ${order.hasPackage ? 'Ha' : "Yo'q"}\n` +
// 			  `📝 Tavsif: ${order.comment || "Yo'q"}\n\n` +
// 			  `Buyurtmangiz qabul qilindi va haydovchilar bilan bog'laning.\n` +
// 			  `✅ Topilgan haydovchilar:`
// 			: `✅ Заказ принят!\n\n` +
// 			  `📍 Отправление: ${order.fromRegion}\n` +
// 			  `📍 Прибытие: ${order.toRegion}\n` +
// 			  `👥 Количество пассажиров: ${order.passengerCount} человек\n` +
// 			  `📦 Посылка: ${order.hasPackage ? 'Да' : 'Нет'}\n` +
// 			  `📝 Описание: ${order.comment || 'Нет'}\n\n` +
// 			  `Ваш заказ принят и связан с водителями.\n` +
// 			  `✅ Найденные водители:`

// 		// Inline keyboard yaratish (haydovchilar ro'yxati)
// 		const driverButtons = drivers.map((driver, index) => {
// 			const carModelName = driver.carModel && typeof driver.carModel === 'object'
// 				? (user.language === 'uz' ? driver.carModel.name : driver.carModel.nameRu)
// 				: driver.carModel

// 			const buttonText = user.language === 'uz'
// 				? `${index + 1}. ${driver.fullName} || ${dirver.carModel}`
// 				: `${index + 1}. ${driver.fullName} || ${carModelName}`

// 			return [{
// 				text: buttonText,
// 				callback_data: `select_driver_${driver._id}_${order._id}`
// 			}]
// 		})

// 		// Asosiy menyu tugmasi
// 		driverButtons.push([{
// 			text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
// 			callback_data: 'main_menu'
// 		}])

// 		await ctx.reply(orderMessage, {
// 			reply_markup: {
// 				inline_keyboard: driverButtons
// 			},
// 			parse_mode: 'HTML'
// 		})

// 	} catch (error) {
// 		console.error('Create order error:', error)
// 		await ctx.reply(
// 			user.language === 'uz'
// 				? '❌ Buyurtma yaratishda xatolik yuz berdi.'
// 				: '❌ Ошибка при создании заказа.'
// 		)
// 	}
// }

// Buyurtmani saqlash va haydovchilarni qidirish
const createOrderAndFindDrivers = async (ctx, orderData) => {
	const user = ctx.user

	try {
		// Buyurtmani yaratish
		const order = new Order({
			passengerId: user.telegramId,
			fromRegion: orderData.fromRegion,
			toRegion: orderData.toRegion,
			passengerCount: orderData.passengerCount,
			hasPackage: orderData.hasPackage || false,
			comment: orderData.comment || '',
			status: 'searching',
			createdAt: new Date()
		})

		await order.save()

		// Yo'nalish bo'yicha faol haydovchilarni qidirish
		const drivers = await Driver.find({
			status: 'active',
			fromRegion: order.fromRegion,
			toRegion: order.toRegion,
			maxPassengers: { $gte: order.passengerCount },
			serviceType: order.hasPackage ? { $in: ['parcel'] } : { $in: ['road', 'route'] }
		})
			.limit(10)
			.populate('carModel')
			.populate('carType')

		if (drivers.length === 0) {
			// Haydovchi topilmasa
			await ctx.reply(
				user.language === 'uz'
					? `❌ Sizning yo'nalishingizda haydovchilar topilmadi.\n\n` +
							`📍 ${order.fromRegion} → ${order.toRegion}\n` +
							`👥 ${order.passengerCount} kishi\n\n` +
							`Birozdan so'ng qayta urinib ko'ring yoki boshqa yo'nalish tanlang.`
					: `❌ В вашем направлении не найдено водителей.\n\n` +
							`📍 ${order.fromRegion} → ${order.toRegion}\n` +
							`👥 ${order.passengerCount} человек\n\n` +
							`Попробуйте позже или выберите другое направление.`
			)
			return
		}

		// Buyurtma qabul qilingan xabari
		const orderMessage =
			user.language === 'uz'
				? `✅ Buyurtma qabul qilindi!\n\n` +
				  `📍 Chiqish: ${order.fromRegion}\n` +
				  `📍 Kirish: ${order.toRegion}\n` +
				  `👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
				  `📦 Pochta: ${order.hasPackage ? 'Ha' : "Yo'q"}\n` +
				  `📝 Tavsif: ${order.comment || "Yo'q"}\n\n` +
				  `Buyurtmangiz qabul qilindi va haydovchilar bilan bog'laning.\n` +
				  `✅ Topilgan haydovchilar:`
				: `✅ Заказ принят!\n\n` +
				  `📍 Отправление: ${order.fromRegion}\n` +
				  `📍 Прибытие: ${order.toRegion}\n` +
				  `👥 Количество пассажиров: ${order.passengerCount} человек\n` +
				  `📦 Посылка: ${order.hasPackage ? 'Да' : 'Нет'}\n` +
				  `📝 Описание: ${order.comment || 'Нет'}\n\n` +
				  `Ваш заказ принят и связан с водителями.\n` +
				  `✅ Найденные водители:`

		// Inline keyboard yaratish (haydovchilar ro'yxati)
		const driverButtons = drivers.map((driver, index) => {
			const carModelName =
				driver.carModel && typeof driver.carModel === 'object'
					? user.language === 'uz'
						? driver.carModel.name
						: driver.carModel.nameRu
					: driver.carModel

			// XATOLIK Tuzatilgan qism: "dirver" o'rniga "driver"
			const buttonText =
				user.language === 'uz'
					? `${index + 1}. ${driver.fullName} || ${driver.carModel}`
					: `${index + 1}. ${driver.fullName} || ${carModelName}`

			return [
				{
					text: buttonText,
					callback_data: `select_driver_${driver._id}_${order._id}`
				}
			]
		})

		// Asosiy menyu tugmasi
		driverButtons.push([
			{
				text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
				callback_data: 'main_menu'
			}
		])

		await ctx.reply(orderMessage, {
			reply_markup: {
				inline_keyboard: driverButtons
			},
			parse_mode: 'HTML'
		})
	} catch (error) {
		console.error('Create order error:', error)
		await ctx.reply(
			user.language === 'uz'
				? '❌ Buyurtma yaratishda xatolik yuz berdi.'
				: '❌ Ошибка при создании заказа.'
		)
	}
}

// Haydovchini tanlash
// const selectDriver = async (ctx, callbackData) => {
// 	const user = ctx.user

// 	try {
// 		// Callback datani ajratish
// 		const parts = callbackData.split('_')
// 		const driverId = parts[2]
// 		const orderId = parts[3]

// 		// Haydovchi va buyurtmani topish
// 		const driver = await Driver.findById(driverId).populate('carModel').populate('carType')
// 		const order = await Order.findById(orderId)

// 		if (!driver || !order) {
// 			await ctx.reply(
// 				user.language === 'uz' ? "❌ Ma'lumotlar topilmadi." : '❌ Данные не найдены.'
// 			)
// 			return
// 		}

// 		// Buyurtmani yangilash
// 		order.driverId = driver._id
// 		order.status = 'selected'
// 		await order.save()

// 		// Haydovchi ma'lumotlari
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

// 		// Yo'lovchiga batafsil xabar
// 		const driverInfoMessage =
// 			user.language === 'uz'
// 				? `✅ Haydovchi tanlandi!\n\n` +
// 				  `👤 Ism: ${driver.fullName}\n` +
// 				  `🚗 Mashina: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
// 				  `👥 Sig'im: ${driver.maxPassengers} kishi\n` +
// 				  `📞 Telefon: ${driver.phone}\n` +
// 				  `Haydovchi bilan bog'laning va jo'nash vaqtini kelishing.`
// 				: `✅ Водитель выбран!\n\n` +
// 				  `👤 Имя: ${driver.fullName}\n` +
// 				  `🚗 Машина: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
// 				  `👥 Вместимость: ${driver.maxPassengers} человек\n` +
// 				  `📞 Телефон: ${driver.phone}\n` +
// 				  `Свяжитесь с водителем и договоритесь о времени отправления.`

// 		// Yo'lovchi uchun keyboard (buyurtma berish tugmasi)
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

// 		// await ctx.reply(driverInfoMessage, {
// 		// 	reply_markup: passengerKeyboard,
// 		// 	parse_mode: 'HTML'
// 		// })

// 		// Haydovchiga xabar berish
// 		const orderForDriverMessage =
// 			user.language === 'uz'
// 				? `🚖 Sizga yangi buyurtma biriktirildi!\n\n` +
// 				  `📍 Chiqish: ${order.fromRegion}\n` +
// 				  `📍 Kirish: ${order.toRegion}\n` +
// 				  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
// 				  `📦 Pochta: ${order.hasPackage ? 'Ha' : "Yo'q"}\n` +
// 				  `📝 Tavsif: ${order.comment || "Yo'q"}\n\n` +
// 				  `📞 Telefon: ${user.phone || 'Korsatilmagan'}\n\n` +
// 				  `Buyurtmani qabul qilish uchun yo'lovchi bilan bog'laning.`
// 				: `🚖 Вам назначен новый заказ!\n\n` +
// 				  `📍 Отправление: ${order.fromRegion}\n` +
// 				  `📍 Прибытие: ${order.toRegion}\n` +
// 				  `👥 Пассажиры: ${order.passengerCount} человек\n` +
// 				  `📦 Посылка: ${order.hasPackage ? 'Да' : 'Нет'}\n` +
// 				  `📝 Описание: ${order.comment || 'Нет'}\n\n` +
// 				  `📞 Телефон: ${user.phone || 'Не указан'}\n\n` +
// 				  `Свяжитесь с пассажиром для подтверждения заказа.`

// 		// Haydovchi uchun keyboard
// 		const driverKeyboard = {
// 			inline_keyboard: [
// 				[
// 					{
// 						text: user.language === 'uz' ? '✅ Qabul qilish' : '✅ Принять',
// 						callback_data: `driver_accept_${order._id}`
// 					}
// 				],
// 				[
// 					{
// 						text: user.language === 'uz' ? '❌ Rad etish' : '❌ Отклонить',
// 						callback_data: `driver_reject_${order._id}`
// 					}
// 				]
// 			]
// 		}

// 		await ctx.telegram.sendMessage(driver.telegramId, orderForDriverMessage, {
// 			reply_markup: driverKeyboard,
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
// }

// driver.js faylida, selectDriver funksiyasini yangilang:

const selectDriver = async (ctx, callbackData) => {
    const user = ctx.user
    
    console.log('🚕 ========== selectDriver START ==========')
    console.log('📞 Callback data:', callbackData)
    
    try {
        // Callback datani ajratish - yangi format uchun
        const parts = callbackData.split('_')
        
        if (parts.length < 4) {
            console.log('❌ Noto\'g\'ri callback format:', callbackData)
            await ctx.reply(
                user.language === 'uz' ? "❌ Noto'g'ri format." : '❌ Неправильный формат.'
            )
            return
        }
        
        // 'sel_drv_${driverId}_${orderId}' formatidan ajratish
        const driverId = parts[2]
        const orderId = parts[3]
        
        console.log('👤 Driver ID:', driverId)
        console.log('📋 Order ID:', orderId)
        
        // Haydovchi va buyurtmani topish
        const driver = await Driver.findById(driverId)
            .populate('carModel')
            .populate('carType')
            .exec()
            
        const order = await Order.findById(orderId).exec()
        
        if (!driver) {
            console.log('❌ Driver topilmadi, ID:', driverId)
            await ctx.reply(
                user.language === 'uz' ? '❌ Haydovchi topilmadi.' : '❌ Водитель не найден.'
            )
            return
        }
        
        if (!order) {
            console.log('❌ Order topilmadi, ID:', orderId)
            await ctx.reply(
                user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.'
            )
            return
        }
        
        console.log('✅ Driver topildi:', driver.fullName)
        console.log('✅ Order topildi:', order._id)
        
        // Buyurtmani yangilash
        order.driverId = driver._id
        order.status = 'selected'
        await order.save()
        
        console.log('✅ Buyurtma yangilandi, status: selected')
        
        // Yo'lovchi ma'lumotlarini olish
        const passenger = await User.findOne({ telegramId: order.userId }).exec()
        
        if (!passenger) {
            console.log('❌ Passenger topilmadi, userId:', order.userId)
        }
        
        // Haydovchi ma'lumotlari
        const carModelName = driver.carModel && typeof driver.carModel === 'object'
            ? user.language === 'uz' 
                ? driver.carModel.name 
                : driver.carModel.nameRu
            : driver.carModel
        
        const carTypeName = driver.carType
            ? user.language === 'uz' 
                ? driver.carType.name 
                : driver.carType.nameRu
            : ''
        
        // ============ YO'LOVCHIGA XABAR ============
        const driverInfoMessage = user.language === 'uz'
            ? `✅ Haydovchi tanlandi!\n\n` +
              `👤 **Haydovchi ma'lumotlari:**\n` +
              `• Ism: ${driver.fullName}\n` +
              `• Mashina: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
              `• Sig'im: ${driver.maxPassengers} kishi\n` +
              `• Telefon: ${driver.phone}\n\n` +
              `📍 **Yo'nalish:** ${order.fromRegion} → ${order.toRegion}\n` +
              `👥 **Yo'lovchilar:** ${order.passengerCount} kishi\n` +
              `${order.hasParcel ? `📦 **Pochta:** Ha\n` : ''}` +
              `${order.parcelDescription ? `📝 **Tavsif:** ${order.parcelDescription}\n` : ''}\n` +
              `📞 Endi haydovchi bilan bog'laning va jo'nash vaqtini kelishing.`
            : `✅ Водитель выбран!\n\n` +
              `👤 **Информация о водителе:**\n` +
              `• Имя: ${driver.fullName}\n` +
              `• Машина: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
              `• Вместимость: ${driver.maxPassengers} человек\n` +
              `• Телефон: ${driver.phone}\n\n` +
              `📍 **Направление:** ${order.fromRegion} → ${order.toRegion}\n` +
              `👥 **Пассажиры:** ${order.passengerCount} человек\n` +
              `${order.hasParcel ? `📦 **Посылка:** Да\n` : ''}` +
              `${order.parcelDescription ? `📝 **Описание:** ${order.parcelDescription}\n` : ''}\n` +
              `📞 Теперь свяжитесь с водителем и договоритесь о времени отправления.`
        
        // Yo'lovchi uchun keyboard
        const passengerKeyboard = {
            inline_keyboard: [
                [
                    {
                        text: user.language === 'uz' ? '✅ Buyurtmani tasdiqlash' : '✅ Подтвердить заказ',
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
        
        try {
            await ctx.reply(driverInfoMessage, {
                reply_markup: passengerKeyboard,
                parse_mode: 'HTML'
            })
            console.log('✅ Yo\'lovchiga xabar yuborildi')
        } catch (replyError) {
            console.error('❌ Yo\'lovchiga xabar yuborishda xatolik:', replyError)
        }
        
        // ============ HAYDOVCHIGA XABAR ============
        const passengerName = passenger?.fullName || passenger?.username || 'Nomalum'
        const passengerPhone = passenger?.phone || 'Korsatilmagan'
        
        const orderForDriverMessage = user.language === 'uz'
            ? `🚖 Sizga yangi buyurtma biriktirildi!\n\n` +
              `👤 **Yo'lovchi ma'lumotlari:**\n` +
              `• Ism: ${passengerName}\n` +
              `• Telefon: ${passengerPhone}\n\n` +
              `📍 **Yo'nalish:** ${order.fromRegion} → ${order.toRegion}\n` +
              `👥 **Yo'lovchilar:** ${order.passengerCount} kishi\n` +
              `${order.hasParcel ? `📦 **Pochta:** Ha\n` : ''}` +
              `${order.parcelDescription ? `📝 **Tavsif:** ${order.parcelDescription}\n` : ''}\n` +
              `💰 **Buyurtma raqami:** ${order._id}\n\n` +
              `✅ Buyurtmani qabul qilish uchun pastdagi tugmani bosing.`
            : `🚖 Вам назначен новый заказ!\n\n` +
              `👤 **Информация о пассажире:**\n` +
              `• Имя: ${passengerName}\n` +
              `• Телефон: ${passengerPhone}\n\n` +
              `📍 **Направление:** ${order.fromRegion} → ${order.toRegion}\n` +
              `👥 **Пассажиры:** ${order.passengerCount} человек\n` +
              `${order.hasParcel ? `📦 **Посылка:** Да\n` : ''}` +
              `${order.parcelDescription ? `📝 **Описание:** ${order.parcelDescription}\n` : ''}\n` +
              `💰 **Номер заказа:** ${order._id}\n\n` +
              `✅ Нажмите кнопку ниже, чтобы принять заказ.`
        
        // Haydovchi uchun keyboard
        const driverKeyboard = {
            inline_keyboard: [
                [
                    {
                        text: user.language === 'uz' ? '✅ Qabul qilish' : '✅ Принять',
                        callback_data: `driver_accept_${order._id}`
                    }
                ],
                [
                    {
                        text: user.language === 'uz' ? '❌ Rad etish' : '❌ Отклонить',
                        callback_data: `driver_reject_${order._id}`
                    }
                ]
            ]
        }
        
        try {
            await ctx.telegram.sendMessage(driver.telegramId, orderForDriverMessage, {
                reply_markup: driverKeyboard,
                parse_mode: 'HTML'
            })
            console.log('✅ Haydovchiga xabar yuborildi, chatId:', driver.telegramId)
        } catch (telegramError) {
            console.error('❌ Haydovchiga xabar yuborishda xatolik:', telegramError)
            
            // Yo'lovchiga xatolik haqida xabar
            await ctx.reply(
                user.language === 'uz'
                    ? `⚠️ Haydovchiga xabar yuborishda muammo yuz berdi. Iltimos, haydovchini shaxsan chaqiring:\n📞 ${driver.phone}`
                    : `⚠️ Проблема с отправкой сообщения водителю. Пожалуйста, свяжитесь с водителем лично:\n📞 ${driver.phone}`
            )
        }
        
        // Sessionni tozalash
        if (ctx.session) {
            delete ctx.session.orderData
        }
        
        console.log('🚕 ========== selectDriver END ==========')
        
    } catch (error) {
        console.error('❌ selectDriver xatosi:', error)
        console.error('❌ Xato stack:', error.stack)
        
        await ctx.reply(
            user.language === 'uz'
                ? '❌ Haydovchi tanlashda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.'
                : '❌ Ошибка при выборе водителя. Пожалуйста, попробуйте еще раз.'
        )
    }
}
// const confirmOrder = async (ctx, callbackData) => {
// 	const user = ctx.user
// 	const orderId = callbackData.split('_')[2]

// 	try {
// 		const order = await Order.findById(orderId).populate('driverId')

// 		if (!order) {
// 			await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
// 			return
// 		}

// 		if (order.userId !== user.telegramId) {
// 			await ctx.reply(
// 				user.language === 'uz'
// 					? '❌ Siz bu buyurtmani tasdiqlay olmaysiz.'
// 					: '❌ Вы не можете подтвердить этот заказ.'
// 			)
// 			return
// 		}

// 		order.status = 'confirmed'
// 		await order.save()

// 		await ctx.reply(
// 			user.language === 'uz'
// 				? "✅ Buyurtma rasmiy tasdiqlandi! Haydovchi bilan bog'laning."
// 				: '✅ Заказ официально подтвержден! Свяжитесь с водителем.'
// 		)

// 		if (order.driverId) {
// 			await ctx.telegram.sendMessage(
// 				order.driverId.telegramId,
// 				user.language === 'uz'
// 					? "✅ Yo'lovchi buyurtmani tasdiqladi! Endi siz jo'nash vaqtini kelishingiz mumkin."
// 					: '✅ Пассажир подтвердил заказ! Теперь вы можете договориться о времени отправления.'
// 			)
// 		}
// 	} catch (error) {
// 		console.error('Confirm order error:', error)
// 		await ctx.reply(
// 			user.language === 'uz'
// 				? '❌ Buyurtma tasdiqlashda xatolik yuz berdi.'
// 				: '❌ Ошибка при подтверждении заказа.'
// 		)
// 	}
// }

const confirmOrder = async (ctx, callbackData) => {
	const user = ctx.user
	const orderId = callbackData.split('_')[2]

	console.log('✅ confirmOrder: orderId=', orderId)

	try {
		const order = await Order.findById(orderId).populate('driverId').exec()

		if (!order) {
			console.log('❌ Order topilmadi')
			await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
			return
		}

		// Xatolikni aniqlash: order.userId ni tekshirish
		console.log('🔍 Order userId:', order.userId)
		console.log('🔍 User telegramId:', user.telegramId)

		// User ID ni string ga o'girib tekshirish
		if (order.userId.toString() !== user.telegramId.toString()) {
			console.log('❌ User ID mos kelmadi')
			await ctx.reply(
				user.language === 'uz'
					? '❌ Siz bu buyurtmani tasdiqlay olmaysiz.'
					: '❌ Вы не можете подтвердить этот заказ.'
			)
			return
		}

		order.status = 'confirmed'
		await order.save()

		console.log('✅ Order confirmed, new status:', order.status)

		await ctx.reply(
			user.language === 'uz'
				? '✅ Buyurtma rasmiy tasdiqlandi!'
				: '✅ Заказ официально подтвержден!'
		)

		// Agar haydovchi bor bo'lsa, unga xabar yuborish
		if (order.driverId) {
			console.log('📤 Driverga xabar yuborilmoqda:', order.driverId.telegramId)

			try {
				await ctx.telegram.sendMessage(
					order.driverId.telegramId,
					user.language === 'uz'
						? "✅ Yo'lovchi buyurtmani tasdiqladi!"
						: '✅ Пассажир подтвердил заказ!'
				)
				console.log('✅ Driverga xabar yuborildi')
			} catch (telegramError) {
				console.error('❌ Driverga xabar yuborishda xatolik:', telegramError)
			}
		}
	} catch (error) {
		console.error('❌ Confirm order error:', error)
		console.error('❌ Error stack:', error.stack)

		await ctx.reply(
			user.language === 'uz'
				? '❌ Buyurtma tasdiqlashda xatolik yuz berdi.'
				: '❌ Ошибка при подтверждении заказа.'
		)
	}
}
// Buyurtmani bekor qilish
const cancelOrder = async (ctx, callbackData) => {
	const user = ctx.user

	try {
		const orderId = callbackData.split('_')[2]
		const order = await Order.findById(orderId).populate('driverId')

		if (!order) {
			await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
			return
		}

		// Faqat buyurtma egalari bekor qilishi mumkin
		if (order.passengerId !== user.telegramId) {
			await ctx.reply(
				user.language === 'uz'
					? '❌ Siz bu buyurtmani bekor qila olmaysiz.'
					: '❌ Вы не можете отменить этот заказ.'
			)
			return
		}

		// Buyurtma statusini o'zgartirish
		order.status = 'cancelled'
		await order.save()

		// Yo'lovchiga xabar
		await ctx.reply(user.language === 'uz' ? '❌ Buyurtma bekor qilindi.' : '❌ Заказ отменен.')

		// Haydovchiga xabar (agar mavjud bo'lsa)
		if (order.driverId) {
			await ctx.telegram.sendMessage(
				order.driverId.telegramId,
				user.language === 'uz'
					? "❌ Yo'lovchi buyurtmani bekor qildi."
					: '❌ Пассажир отменил заказ.'
			)
		}
	} catch (error) {
		console.error('Cancel order error:', error)
		await ctx.reply(
			user.language === 'uz'
				? '❌ Buyurtma bekor qilishda xatolik yuz berdi.'
				: '❌ Ошибка при отмене заказа.'
		)
	}
}

// Haydovchi buyurtmani qabul qilishi
// const driverAcceptOrder = async (ctx, callbackData) => {
// 	const user = ctx.user

// 	try {
// 		const orderId = callbackData.split('_')[2]
// 		const order = await Order.findById(orderId).populate('driverId')

// 		if (!order) {
// 			await ctx.reply(
// 				user.language === 'uz'
// 					? '❌ Buyurtma topilmadi.'
// 					: '❌ Заказ не найден.'
// 			)
// 			return
// 		}

// 		// Faqat haydovchi qabul qilishi mumkin
// 		if (!order.driverId || order.driverId.telegramId !== user.telegramId) {
// 			await ctx.reply(
// 				user.language === 'uz'
// 					? '❌ Siz bu buyurtmani qabul qila olmaysiz.'
// 					: '❌ Вы не можете принять этот заказ.'
// 			)
// 			return
// 		}

// 		// Buyurtma statusini o'zgartirish
// 		order.status = 'accepted'
// 		await order.save()

// 		// Haydovchiga xabar
// 		await ctx.reply(
// 			user.language === 'uz'
// 				? '✅ Buyurtmani qabul qildingiz! Yo\'lovchi bilan bog\'laning.'
// 				: '✅ Вы приняли заказ! Свяжитесь с пассажиром.'
// 		)

// 		// Yo'lovchiga xabar
// 		await ctx.telegram.sendMessage(
// 			order.passengerId,
// 			user.language === 'uz'
// 				? '✅ Haydovchi buyurtmangizni qabul qildi! Tez orada siz bilan bog\'lanadi.'
// 				: '✅ Водитель принял ваш заказ! Скоро свяжется с вами.'
// 		)

// 	} catch (error) {
// 		console.error('Driver accept order error:', error)
// 		await ctx.reply(
// 			user.language === 'uz'
// 				? '❌ Buyurtma qabul qilishda xatolik yuz berdi.'
// 				: '❌ Ошибка при принятии заказа.'
// 		)
// 	}
// }

// ============ HAYDOVCHI BUYURTMANI QABUL QILISHI ============
// const  driverAcceptOrder = async (ctx, callbackData) => {
// 	const user = ctx.user
// 	const orderId = callbackData.split('_')[2]

// 	try {
// 		const order = await Order.findById(orderId)
// 			.populate('driverId')
// 			.populate('userId', 'username fullName phone') // Yo'lovchi ma'lumotlarini qo'shing

// 		if (!order) {
// 			await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
// 			return
// 		}

// 		if (!order.driverId || order.driverId.telegramId !== user.telegramId) {
// 			await ctx.reply(
// 				user.language === 'uz'
// 					? '❌ Siz bu buyurtmani qabul qila olmaysiz.'
// 					: '❌ Вы не можете принять этот заказ.'
// 			)
// 			return
// 		}

// 		// Statusni yangilash
// 		order.status = 'accepted'
// 		await order.save()

// 		// Haydovchi statistikasini yangilash
// 		order.driverId.totalOrders = (order.driverId.totalOrders || 0) + 1
// 		await order.driverId.save()

// 		// Yo'lovchi ma'lumotlarini olish
// 		const passenger = await User.findOne({ telegramId: order.userId })

// 		// ============ HAYDOVCHIGA YO'LOVCHI MA'LUMOTLARI ============
// 		const passengerInfoMessage = user.language === 'uz'
// 			? `✅ Buyurtmani qabul qildingiz!\n\n` +
// 			  `📋 Buyurtma ma'lumotlari:\n` +
// 			  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
// 			  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
// 			  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
// 			  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n\n` : '\n'}` +
// 			  `👤 Yo'lovchi ma'lumotlari:\n` +
// 			  `• Ism: ${passenger?.fullName || 'Nomalum'}\n` +
// 			  `• Username: @${order.username || passenger?.username || 'Nomalum'}\n` +
// 			  `• Telefon: ${passenger?.phone || 'Korsatilmagan'}\n\n` +
// 			  `📞 Endi yo'lovchi bilan bog'lanishingiz mumkin!`
// 			: `✅ Вы приняли заказ!\n\n` +
// 			  `📋 Информация о заказе:\n` +
// 			  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
// 			  `👥 Пассажиры: ${order.passengerCount} человек\n` +
// 			  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
// 			  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n\n` : '\n'}` +
// 			  `👤 Информация о пассажире:\n` +
// 			  `• Имя: ${passenger?.fullName || 'Неизвестно'}\n` +
// 			  `• Username: @${order.username || passenger?.username || 'Неизвестно'}\n` +
// 			  `• Телефон: ${passenger?.phone || 'Не указан'}\n\n` +
// 			  `📞 Теперь вы можете связаться с пассажиром!`

// 		// Haydovchiga xabar
// 		await ctx.reply(passengerInfoMessage, { parse_mode: 'HTML' })

// 		// ============ YO'LOVCHIGA HAYDOVCHI MA'LUMOTLARI ============
// 		const carModelName = order.driverId.carModel && typeof order.driverId.carModel === 'object'
// 			? user.language === 'uz'
// 				? order.driverId.carModel.name
// 				: order.driverId.carModel.nameRu
// 			: order.driverId.carModel

// 		const carTypeName = order.driverId.carType
// 			? user.language === 'uz'
// 				? order.driverId.carType.name
// 				: order.driverId.carType.nameRu
// 			: ''

// 		const driverInfoForPassenger = user.language === 'uz'
// 			? `✅ Haydovchi buyurtmangizni qabul qildi!\n\n` +
// 			  `👤 Haydovchi ma'lumotlari:\n` +
// 			  `• Ism: ${order.driverId.fullName}\n` +
// 			  `• Mashina: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
// 			  `• Telefon: ${order.driverId.phone}\n` +
// 			  `• Reyting: ${order.driverId.rating || '5.0'}/5.0\n\n` +
// 			  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
// 			  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n\n` +
// 			  `📞 Endi haydovchi bilan bog'laning va jo'nash vaqtini kelishing!`
// 			: `✅ Водитель принял ваш заказ!\n\n` +
// 			  `👤 Информация о водителе:\n` +
// 			  `• Имя: ${order.driverId.fullName}\n` +
// 			  `• Машина: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
// 			  `• Телефон: ${order.driverId.phone}\n` +
// 			  `• Рейтинг: ${order.driverId.rating || '5.0'}/5.0\n\n` +
// 			  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
// 			  `👥 Пассажиры: ${order.passengerCount} человек\n\n` +
// 			  `📞 Теперь свяжитесь с водителем и договоритесь о времени отправления!`

// 		// Yo'lovchiga xabar
// 		await ctx.telegram.sendMessage(order.userId, driverInfoForPassenger, {
// 			parse_mode: 'HTML'
// 		})

// 	} catch (error) {
// 		console.error('Driver accept order error:', error)
// 		await ctx.reply(
// 			user.language === 'uz'
// 				? '❌ Buyurtma qabul qilishda xatolik yuz berdi.'
// 				: '❌ Ошибка при принятии заказа.'
// 		)
// 	}
// }

// ============ HAYDOVCHI BUYURTMANI QABUL QILISHI ============
const driverAcceptOrder = async (ctx, callbackData) => {
	const user = ctx.user
	const orderId = callbackData.split('_')[2]

	try {
		console.log(`🚕 driver_accept: orderId=${orderId}`)

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

		// Yo'lovchi ma'lumotlarini olish
		const passenger = await User.findOne({ telegramId: order.userId })
		console.log(`👤 Passenger found:`, passenger)

		// Statusni yangilash
		order.status = 'accepted'
		await order.save()

		// Haydovchi statistikasini yangilash
		order.driverId.totalOrders = (order.driverId.totalOrders || 0) + 1
		await order.driverId.save()

		// ============ HAYDOVCHIGA YO'LOVCHI MA'LUMOTLARI ============
		const passengerName = passenger?.fullName || passenger?.firstName || 'Nomalum'
		const passengerUsername = passenger?.username ? '@' + passenger.username : "Yo'q"
		const passengerPhone = passenger?.phone || 'Korsatilmagan'

		const passengerInfoMessage =
			user.language === 'uz'
				? `✅ Buyurtmani qabul qildingiz!\n\n` +
				  `📋 **Buyurtma ma'lumotlari:**\n` +
				  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
				  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
				  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n\n` : '\n'}` +
				  `👤 **Yo'lovchi ma'lumotlari:**\n` +
				  `• Ism: ${passengerName}\n` +
				  `• Username: ${passengerUsername}\n` +
				  `• Telefon: ${passengerPhone}\n\n` +
				  `📞 Endi yo'lovchi bilan bog'lanishingiz mumkin!\n` +
				  `💬 Telegramda yozish: ${
						passengerUsername !== "Yo'q" ? passengerUsername : "Yo'lovchi username'i yo'q"
				  }`
				: `✅ Вы приняли заказ!\n\n` +
				  `📋 **Информация о заказе:**\n` +
				  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
				  `👥 Пассажиры: ${order.passengerCount} человек\n` +
				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
				  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n\n` : '\n'}` +
				  `👤 **Информация о пассажире:**\n` +
				  `• Имя: ${passengerName}\n` +
				  `• Username: ${passengerUsername}\n` +
				  `• Телефон: ${passengerPhone}\n\n` +
				  `📞 Теперь вы можете связаться с пассажиром!\n` +
				  `💬 Написать в Telegram: ${
						passengerUsername !== "Yo'q" ? passengerUsername : 'У пассажира нет username'
				  }`

		// Haydovchiga xabar
		await ctx.reply(passengerInfoMessage, {
			parse_mode: 'HTML',
			disable_web_page_preview: true
		})

		// ============ YO'LOVCHIGA HAYDOVCHI MA'LUMOTLARI ============
		const carModelName =
			order.driverId.carModel && typeof order.driverId.carModel === 'object'
				? user.language === 'uz'
					? order.driverId.carModel.name
					: order.driverId.carModel.nameRu
				: order.driverId.carModel

		const driverInfoForPassenger =
			user.language === 'uz'
				? `✅ Haydovchi buyurtmangizni qabul qildi!\n\n` +
				  `👤 **Haydovchi ma'lumotlari:**\n` +
				  `• Ism: ${order.driverId.fullName}\n` +
				  `• Username: @${order.driverId.username || 'Nomalum'}\n` +
				  `• Telefon: ${order.driverId.phone}\n` +
				  `• Mashina: ${carModelName}\n` +
				  `📋 **Buyurtma ma'lumotlari:**\n` +
				  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
				  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n\n` +
				  `📞 Endi haydovchi bilan bog'laning!\n` +
				  `💬 Telegramda yozish: @${order.driverId.username || "Username yo'q"}\n` +
				  `📲 Qo'ng'iroq qilish: ${order.driverId.phone}`
				: `✅ Водитель принял ваш заказ!\n\n` +
				  `👤 **Информация о водителе:**\n` +
				  `• Имя: ${order.driverId.fullName}\n` +
				  `• Username: @${order.driverId.username || 'Неизвестно'}\n` +
				  `• Телефон: ${order.driverId.phone}\n` +
				  `• Машина: ${carModelName}\n` +
				  `📋 **Информация о заказе:**\n` +
				  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
				  `👥 Пассажиры: ${order.passengerCount} человек\n` +
				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n\n` +
				  `📞 Теперь свяжитесь с водителем!\n` +
				  `💬 Написать в Telegram: @${order.driverId.username || 'Нет username'}\n` +
				  `📲 Позвонить: ${order.driverId.phone}`

		// Yo'lovchiga xabar
		await ctx.telegram.sendMessage(order.userId, driverInfoForPassenger, {
			parse_mode: 'HTML',
			disable_web_page_preview: true
		})

		console.log(`✅ Haydovchi va yo'lovchi ma'lumotlari muvaffaqiyatli yuborildi`)
	} catch (error) {
		console.error('Driver accept order error:', error)
		await ctx.reply(
			user.language === 'uz'
				? '❌ Buyurtma qabul qilishda xatolik yuz berdi.'
				: '❌ Ошибка при принятии заказа.'
		)
	}
}

// Haydovchi buyurtmani rad etishi
const driverRejectOrder = async (ctx, callbackData) => {
	const user = ctx.user

	try {
		const orderId = callbackData.split('_')[2]
		const order = await Order.findById(orderId).populate('driverId')

		if (!order) {
			await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
			return
		}

		// Faqat haydovchi rad etishi mumkin
		if (!order.driverId || order.driverId.telegramId !== user.telegramId) {
			await ctx.reply(
				user.language === 'uz'
					? '❌ Siz bu buyurtmani rad eta olmaysiz.'
					: '❌ Вы не можете отклонить этот заказ.'
			)
			return
		}

		// Buyurtma statusini o'zgartirish
		order.status = 'rejected'
		order.driverId = null
		await order.save()

		// Haydovchiga xabar
		await ctx.reply(
			user.language === 'uz' ? '❌ Buyurtmani rad etdingiz.' : '❌ Вы отклонили заказ.'
		)

		// Yo'lovchiga xabar
		await ctx.telegram.sendMessage(
			order.passengerId,
			user.language === 'uz'
				? '❌ Haydovchi buyurtmangizni rad etdi. Boshqa haydovchi tanlang.'
				: '❌ Водитель отклонил ваш заказ. Выберите другого водителя.'
		)
	} catch (error) {
		console.error('Driver reject order error:', error)
		await ctx.reply(
			user.language === 'uz'
				? '❌ Buyurtma rad etishda xatolik yuz berdi.'
				: '❌ Ошибка при отклонении заказа.'
		)
	}
}

const selectWorkHoursCallback = async (ctx, callbackData) => {
	const user = ctx.user

	console.log('🕒 selectWorkHoursCallback chaqirildi, callbackData:', callbackData)

	// Avval callback queryga javob berish
	try {
		await ctx.answerCbQuery()
	} catch (error) {
		console.log('⚠️ answerCbQuery error:', error.message)
	}

	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	console.log('🔍 Session driverData:', JSON.stringify(ctx.session.driverData, null, 2))

	if (callbackData === 'work_custom' || callbackData === 'work_custom_enter') {
		// Qo'lda kiritish
		user.state = states.DRIVER_REG_WORK_HOURS_CUSTOM
		await user.save()

		console.log('✅ User state yangilandi:', user.state)

		if (callbackData === 'work_custom') {
			const message =
				user.language === 'uz'
					? "⏰ Mashhur vaqtlardan tanlang yoki qo'lda kiriting: 23:00 - 12:00"
					: '⏰ Выберите популярное время или введите вручную: 23:00 - 12:00'

			try {
				const keyboard = keyboards.customWorkHoursKeyboard(user.language)
				await ctx.reply(message, keyboard)
			} catch (error) {
				console.error('❌ Keyboard yuborishda xatolik:', error)
			}
			return
		} else {
			const message =
				user.language === 'uz'
					? '✏️ Ish vaqtini quyidagi formatda kiriting:\nMisol: 08:00 - 20:00\nMisol: 22:00 - 06:00'
					: '✏️ Введите время работы в формате:\nПример: 08:00 - 20:00\nПример: 22:00 - 06:00'

			await ctx.reply(message)
		}
		return
	}

	// Callback datani parse qilish
	let workHours = ''
	if (callbackData === 'work_1000_1800') {
		workHours = '10:00 - 18:00'
	} else if (callbackData === 'work_1800_0200') {
		workHours = '18:00 - 02:00'
	} else if (callbackData === 'work_0200_1000') {
		workHours = '02:00 - 10:00'
	} else if (callbackData.startsWith('work_custom_')) {
		const times = callbackData.replace('work_custom_', '').split('_')
		if (times.length === 2) {
			workHours = `${times[0]} - ${times[1]}`
		}
	}

	console.log('📝 Parsed work hours:', workHours)

	// Tanlanli vaqtni saqlash
	if (workHours) {
		ctx.session.driverData.workHours = workHours

		console.log('✅ Ish vaqti sessionga saqlandi:', ctx.session.driverData.workHours)

		// Keyingi qadamga o'tish (sana va vaqt tanlash)
		await showDateTimeSelection(ctx)
	} else {
		console.error('❌ Work hours not parsed properly')
		await ctx.reply(
			user.language === 'uz'
				? "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
				: '❌ Произошла ошибка. Пожалуйста, попробуйте еще раз.'
		)
	}
}
// Maxsus ish vaqtini saqlash
const saveCustomWorkHours = async (ctx, text) => {
	const user = ctx.user

	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	// Formatni tekshirish (00:00 - 00:00 formatida)
	const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s*-\s*([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/

	if (!timeRegex.test(text)) {
		const message =
			user.language === 'uz'
				? "❌ Noto'g'ri format! Iltimos, quyidagi formatda kiriting:\n" +
				  'Misol: 08:00 - 20:00\n' +
				  'Misol: 22:00 - 06:00'
				: '❌ Неправильный формат! Пожалуйста, введите в формате:\n' +
				  'Пример: 08:00 - 20:00\n' +
				  'Пример: 22:00 - 06:00'

		await ctx.reply(message)
		return
	}

	// Vaqtni tozalash (oraliqdagi bo'shliqlarni olib tashlash)
	ctx.session.driverData.workHours = text.replace(/\s+/g, ' ').trim()

	console.log('✅ Maxsus ish vaqti saqlandi:', ctx.session.driverData.workHours)

	// Keyingi qadamga o'tish (sana va vaqt tanlash)
	await showDateTimeSelection(ctx)
}

// ====================== CONFIRM CALLBACK HANDLER ======================
const handleConfirmCallback = async ctx => {
	const user = ctx.user

	console.log('✅ Confirm callback received, user state:', user.state)

	try {
		if (user.state === states.DRIVER_REG_CONFIRM) {
			console.log('🔵 Profil saqlanmoqda...')
			await saveProfileWithPayment(ctx)
		} else {
			console.log("❌ Noto'g'ri state uchun confirm:", user.state)
			await ctx.reply(user.language === 'uz' ? "❌ Noto'g'ri amal." : '❌ Неправильное действие.')
		}
	} catch (error) {
		console.error('Confirm callback error:', error)
		await ctx.reply(
			user.language === 'uz'
				? "❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
				: '❌ Произошла ошибка. Пожалуйста, попробуйте еще раз.'
		)
	}
}

// ====================== ISH VAQTI TANLASH ======================
const showWorkHoursSelection = async (ctx) => {
    const user = ctx.user;

    const message = user.language === 'uz' 
        ? "🏪 Ish vaqtini tanlang:\n\n" +
          "1️⃣ 10:00 - 18:00 (Kunduzi)\n" +
          "2️⃣ 18:00 - 02:00 (Kechasi)\n" +
          "3️⃣ 02:00 - 10:00 (Tungi)\n" +
          "4️⃣ Boshqa vaqt (qo'lda kiriting)"
        : "🏪 Выберите время работы:\n\n" +
          "1️⃣ 10:00 - 18:00 (Днем)\n" +
          "2️⃣ 18:00 - 02:00 (Ночью)\n" +
          "3️⃣ 02:00 - 10:00 (Ночной-Утренний)\n" +
          "4️⃣ Другое время (ввести вручную)";

    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: user.language === 'uz' ? '🕙 10:00 - 18:00' : '🕙 10:00 - 18:00',
                    callback_data: 'work_1000_1800'
                }
            ],
            [
                {
                    text: user.language === 'uz' ? '🌙 18:00 - 02:00' : '🌙 18:00 - 02:00',
                    callback_data: 'work_1800_0200'
                }
            ],
            [
                {
                    text: user.language === 'uz' ? '🌅 02:00 - 10:00' : '🌅 02:00 - 10:00',
                    callback_data: 'work_0200_1000'
                }
            ],
            [
                {
                    text: user.language === 'uz' ? '✏️ Boshqa vaqt' : '✏️ Другое время',
                    callback_data: 'work_custom'
                }
            ]
        ]
    };

    user.state = states.DRIVER_REG_WORK_HOURS;
    await user.save();

    await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
    });
};

const completeDriverRegistration = async ctx => {
	const user = ctx.user

	console.log('🔵 ========== completeDriverRegistration START ==========')
	console.log('👤 User ID:', user.telegramId)

	if (!ctx.session || !ctx.session.driverData) {
		console.log("❌ Session yoki driverData yo'q")
		await ctx.reply(
			user.language === 'uz'
				? "❌ Ma'lumotlar topilmadi. Iltimos, qayta boshlang."
				: '❌ Данные не найдены. Пожалуйста, начните заново.'
		)
		user.state = states.MAIN_MENU
		await user.save()
		return
	}

	const data = ctx.session.driverData

	try {
		// Avval mavjud haydovchini tekshirish
		const existingDriver = await Driver.findOne({ telegramId: user.telegramId })

		if (existingDriver) {
			console.log('⚠️ Mavjud driver topildi:', existingDriver._id)
			await ctx.reply(
				user.language === 'uz'
					? "❌ Siz allaqachon haydovchi sifatida ro'yxatdan o'tgansiz"
					: '❌ Вы уже зарегистрированы как водитель'
			)
			user.state = states.MAIN_MENU
			await user.save()
			return
		}

		// Car model ni tekshirish
		let carModelId = data.carId
		if (!carModelId && data.carModel) {
			console.log('🔍 Car model qidirilmoqda:', data.carModel)
			const car = await Car.findOne({
				$or: [{ name: data.carModel }, { nameRu: data.carModel }]
			})

			if (car) {
				carModelId = car._id
				console.log('✅ Car model topildi:', car.name)
			} else {
				// Yangi car model yaratish
				console.log('➕ Yangi car model yaratilmoqda:', data.carModel)
				const newCar = new Car({
					name: data.carModel,
					nameRu: data.carModel,
					isActive: true
				})
				await newCar.save()
				carModelId = newCar._id
				console.log('✅ Yangi car model yaratildi:', data.carModel)
			}
		}

		// Haydovchi ma'lumotlarini tayyorlash (carNumber qo'shing)
		const driverData = {
			telegramId: user.telegramId,
			fullName: data.fullName,
			phone: data.phone,
			fromRegion: data.fromRegion,
			toRegion: data.toRegion,
			carModel: carModelId,
			carNumber: data.carNumber,
			carType: data.carType || null,
			maxPassengers: data.maxPassengers,
			serviceType: data.serviceType,
			workHours: data.workHours,
			departureTime: data.departureTime || "Yo'lovchi bilan kelishiladi",
			status: 'active',
			balance: 10000,
			totalOrders: 0,
			registrationStep: 'completed',
			createdAt: new Date(),
			updatedAt: new Date()
		}

		console.log('📝 Driver yaratilmoqda:', driverData)

		// Driver yaratish
		const driver = new Driver(driverData)
		await driver.save()

		console.log('✅ Driver saqlandi. ID:', driver._id)

		// User rolini yangilash
		user.role = 'driver'
		user.state = states.MAIN_MENU
		await user.save()

		console.log('✅ User roli yangilandi')

		// Muvaffaqiyatli xabar
		const serviceNames = {
			road: user.language === 'uz' ? "Yo'l-yo'lakay" : 'Попутка',
			route: user.language === 'uz' ? "Yo'nalish" : 'Направление',
			parcel: user.language === 'uz' ? 'Pochta' : 'Посылка'
		}

		const services = data.serviceType.map(type => serviceNames[type] || type).join(', ')

		const carModelName = data.carModel || "Noma'lum"

		// Mashina raqamini muvaffaqiyatli xabarda ko'rsatish
		const successMessage =
			user.language === 'uz'
				? `✅ <b>Tabriklaymiz! Profilingiz muvaffaqiyatli yaratildi!</b>\n\n` +
				  `<b>Profil ma'lumotlari:</b>\n` +
				  `👤 <b>Ism:</b> ${data.fullName}\n` +
				  `📍 <b>Yo'nalish:</b> ${data.fromRegion} → ${data.toRegion}\n` +
				  `🚗 <b>Mashina:</b> ${carModelName}\n` +
				  (data.carNumber ? `🚘 <b>Mashina raqami:</b> ${data.carNumber}\n` : '') +
				  (data.carTypeName ? `🏷️ <b>Mashina turi:</b> ${data.carTypeName}\n` : '') +
				  `👥 <b>Sig'im:</b> ${data.maxPassengers} kishi\n` +
				  `🎯 <b>Xizmatlar:</b> ${services}\n` +
				  `🏪 <b>Ish vaqti:</b> ${data.workHours}\n` +
				  (data.departureTime ? `⏰ <b>Jo'nash vaqti:</b> ${data.departureTime}\n\n` : '\n') +
				  `✅ Profilingiz faollashtirildi. Endi buyurtma qabul qilishni boshlashingiz mumkin!`
				: `✅ <b>Поздравляем! Ваш профиль успешно создан!</b>\n\n` +
				  `<b>Данные профиля:</b>\n` +
				  `👤 <b>Имя:</b> ${data.fullName}\n` +
				  `📍 <b>Направление:</b> ${data.fromRegion} → ${data.toRegion}\n` +
				  `🚗 <b>Машина:</b> ${carModelName}\n` +
				  (data.carNumber ? `🚘 <b>Номер машины:</b> ${data.carNumber}\n` : '') +
				  (data.carTypeNameRu ? `🏷️ <b>Тип машины:</b> ${data.carTypeNameRu}\n` : '') +
				  `👥 <b>Вместимость:</b> ${data.maxPassengers} человек\n` +
				  `🎯 <b>Услуги:</b> ${services}\n` +
				  `🏪 <b>Время работы:</b> ${data.workHours}\n` +
				  (data.departureTime ? `⏰ <b>Время отправления:</b> ${data.departureTime}\n\n` : '\n') +
				  `✅ Ваш профиль активирован. Теперь вы можете начать принимать заказы!`

		await ctx.reply(successMessage, {
			parse_mode: 'HTML',
			reply_markup: { remove_keyboard: true }
		})

		// Sessionni tozalash
		delete ctx.session.driverData
		console.log('✅ Session tozalandi')
	} catch (error) {
		console.error('❌ Complete registration error:', error)
		console.error('❌ Error stack:', error.stack)

		// MongoDB xatoliklarini tekshirish
		if (error.name === 'ValidationError') {
			console.error('❌ Validation error details:', error.errors)
		}

		await ctx.reply(
			user.language === 'uz'
				? `❌ Profilni saqlashda xatolik yuz berdi.\n\n` +
						`Xato: ${error.message}\n\n` +
						`Iltimos, qayta urinib ko'ring.`
				: `❌ Ошибка при сохранении профиля.\n\n` +
						`Ошибка: ${error.message}\n\n` +
						`Пожалуйста, попробуйте еще раз.`
		)
	}

	console.log('🔵 ========== completeDriverRegistration END ==========')
}
// Mashina raqamini so'rash funksiyasi
const showCarNumberInput = async (ctx) => {
    const user = ctx.user;
    
    console.log('🚘 ========== showCarNumberInput START ==========');
    
    // Sessionni tekshirish
    if (!ctx.session || !ctx.session.driverData) {
        console.log("❌ Session yoki driverData yo'q");
        await ctx.reply(
            user.language === 'uz'
                ? "❌ Ma'lumotlar topilmadi. Iltimos, qayta boshlang."
                : '❌ Данные не найдены. Пожалуйста, начните заново.'
        );
        return;
    }
    
    const data = ctx.session.driverData;
    
    // Car model ma'lumotini olish
    let carModelDisplay = '';
    if (data.carModel) {
        carModelDisplay = user.language === 'uz' 
            ? data.carModel 
            : data.carModelRu || data.carModel;
    }
    
    // Car type ma'lumotini olish
    let carTypeDisplay = '';
    if (data.carTypeName) {
        carTypeDisplay = user.language === 'uz'
            ? data.carTypeName
            : data.carTypeNameRu || data.carTypeName;
    }
    
    // Mashina ma'lumotlari
    let carInfo = '';
    if (carModelDisplay) {
        carInfo = `🚗 <b>Mashina:</b> ${carModelDisplay}`;
        if (carTypeDisplay) {
            carInfo += ` (${carTypeDisplay})`;
        }
        carInfo += '\n\n';
    }
    
    const message = user.language === 'uz'
        ? `${carInfo}` +
          `🚘 <b>Mashina raqamingizni kiriting:</b>\n\n` +
          `📝 <b>Format:</b> <code>01A123AB</code>, <code>01D777DB</code>\n` +
          `⚠️ O'zbekiston davlat raqami formatida bo'lishi kerak\n\n` +
          `<b>Masalan:</b>\n` +
          `• <code>01A123AB</code>\n` +
          `• <code>10B777DC</code>\n` +
          `• <code>30D123CE</code>\n\n` +
          `<b>Qoidalar:</b>\n` +
          `1. 2 ta raqam (01-99 - viloyat kodi)\n` +
          `2. 1 ta lotin harfi (A-Z)\n` +
          `3. 3 ta raqam (001-999)\n` +
          `4. 2 ta lotin harfi (A-Z)\n\n` +
          `Iltimos, mashina raqamingizni yuqoridagi formatda kiriting:`
        : `${carInfo}` +
          `🚘 <b>Введите номер машины:</b>\n\n` +
          `📝 <b>Формат:</b> <code>01A123AB</code>, <code>01D777DB</code>\n` +
          `⚠️ Должен быть в формате узбекских госномеров\n\n` +
          `<b>Например:</b>\n` +
          `• <code>01A123AB</code>\n` +
          `• <code>10B777DC</code>\n` +
          `• <code>30D123CE</code>\n\n` +
          `<b>Правила:</b>\n` +
          `1. 2 цифры (01-99 - код региона)\n` +
          `2. 1 латинская буква (A-Z)\n` +
          `3. 3 цифры (001-999)\n` +
          `4. 2 латинские буквы (A-Z)\n\n` +
          `Пожалуйста, введите номер машины в указанном формате:`;
    
    // State ni o'zgartirish
    user.state = states.DRIVER_REG_CAR_NUMBER;
    await user.save();
    
    console.log('✅ User state yangilandi:', user.state);
    
    // Xabarni yuborish
    await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: {
            remove_keyboard: true
        }
    });
    
    console.log('🚘 ========== showCarNumberInput END ==========');
};
const saveCarNumber = async (ctx, text) => {
	const user = ctx.user

	console.log('🔵 ========== saveCarNumber START ==========')
	console.log('📝 Received text:', text)

	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	// Mashina raqamini tozalash
	const cleanedText = text.trim().toUpperCase()
	console.log('🧹 Cleaned text:', cleanedText)

	// Format tekshiruvi - faqat 01A123AA formatini qabul qilamiz
	const carNumberRegex = /^[0-9]{2}[A-Z]{1}[0-9]{3}[A-Z]{2}$/

	if (!carNumberRegex.test(cleanedText)) {
		console.log('❌ Invalid car number format:', cleanedText)
		const message =
			user.language === 'uz'
				? "❌ Noto'g'ri mashina raqami formati!\n\n" +
				  "✅ To'g'ri format: **01A123AA**\n" +
				  '📝 Iltimos, 2 raqam + 1 harf + 3 raqam + 2 harf formatida kiriting.\n' +
				  '✅ Masalan:\n' +
				  '• 01A123AA\n' +
				  '• 10B456CC\n' +
				  '• 77C789DD\n\n' +
				  '📋 Qayta kiriting:'
				: '❌ Неправильный формат номера машины!\n\n' +
				  '✅ Правильный формат: **01A123AA**\n' +
				  '📝 Пожалуйста, введите в формате: 2 цифры + 1 буква + 3 цифры + 2 буквы.\n' +
				  '✅ Например:\n' +
				  '• 01A123AA\n' +
				  '• 10B456CC\n' +
				  '• 77C789DD\n\n' +
				  '📋 Введите еще раз:'

		await ctx.reply(message, { parse_mode: 'Markdown' })
		return
	}

	// Mashina raqamini sessionga saqlash
	ctx.session.driverData.carNumber = cleanedText
	console.log('✅ Car number saved to session:', ctx.session.driverData.carNumber)

	// Keyingi qadamga o'tish - yo'lovchilar soni
	user.state = states.DRIVER_REG_MAX_PASSENGERS
	await user.save()

	console.log('✅ User state updated to:', user.state)

	// Car model ma'lumotlari
	const carModelDisplay =
		user.language === 'uz'
			? ctx.session.driverData.carModel
			: ctx.session.driverData.carModelRu || ctx.session.driverData.carModel

	const carTypeDisplay = ctx.session.driverData.carTypeName
		? user.language === 'uz'
			? ctx.session.driverData.carTypeName
			: ctx.session.driverData.carTypeNameRu || ctx.session.driverData.carTypeName
		: ''

	const successMessage =
		user.language === 'uz'
			? `✅ Mashina ma'lumotlari saqlandi:\n\n` +
			  `🚗 Model: ${carModelDisplay}\n` +
			  (carTypeDisplay ? `🏷️ Turi: ${carTypeDisplay}\n` : '') +
			  `🔢 Raqam: ${cleanedText}\n\n` +
			  `👥 Necha kishigacha olib ketasiz?`
			: `✅ Информация о машине сохранена:\n\n` +
			  `🚗 Модель: ${carModelDisplay}\n` +
			  (carTypeDisplay ? `🏷️ Тип: ${carTypeDisplay}\n` : '') +
			  `🔢 Номер: ${cleanedText}\n\n` +
			  `👥 Сколько человек вы можете взять?`

	await ctx.reply(successMessage, keyboards.maxPassengersKeyboard(user.language))

	console.log('🔵 ========== saveCarNumber END ==========')
}
const selectCarTypeCallback = async (ctx, callbackData) => {
	const user = ctx.user

	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	console.log('🏷️ Car type callback:', callbackData)

	if (callbackData === 'car_type_skip') {
		ctx.session.driverData.carType = null
		ctx.session.driverData.carTypeName = null
		ctx.session.driverData.carTypeNameRu = null
		console.log('⏭️ Car type skipped')
	} else {
		const carTypeId = callbackData.replace('car_type_', '')
		const carType = await CarType.findById(carTypeId)

		if (!carType) {
			await ctx.reply(
				user.language === 'uz' ? '❌ Mashina turi topilmadi' : '❌ Тип машины не найден'
			)
			return
		}

		ctx.session.driverData.carType = carType._id
		ctx.session.driverData.carTypeName = carType.name
		ctx.session.driverData.carTypeNameRu = carType.nameRu
		console.log('✅ Car type selected:', carType.name)
	}

	// Avval xabarni o'chirish
	try {
		await ctx.deleteMessage()
	} catch (error) {
		console.log('Delete message error:', error.message)
	}

	// Car model ma'lumotlarini olish
	const carModelDisplay =
		user.language === 'uz'
			? ctx.session.driverData.carModel
			: ctx.session.driverData.carModelRu || ctx.session.driverData.carModel

	const successMessage =
		user.language === 'uz'
			? `✅ Mashina turi tanlandi: ${
					ctx.session.driverData.carTypeName || 'Tanlanmadi'
			  }\n\n🚗 Mashinangiz: ${carModelDisplay}\n\n🔢 Endi mashina raqamingizni kiriting:`
			: `✅ Тип машины выбран: ${
					ctx.session.driverData.carTypeNameRu || 'Не выбрано'
			  }\n\n🚗 Ваша машина: ${carModelDisplay}\n\n🔢 Теперь введите номер машины:`

	// MASHINA RAQAMINI SO'RASH - BU QATOR MUHIM!
	console.log('📤 Calling askCarNumber...')
	await askCarNumber(ctx)
}
const askCarNumber = async ctx => {
	const user = ctx.user

	console.log('🚗 ========== askCarNumber START ==========')
	console.log('👤 User ID:', user.telegramId)
	console.log('📊 Current state:', user.state)

	// State ni o'zgartirish
	user.state = states.DRIVER_REG_CAR_NUMBER
	await user.save()

	console.log('✅ User state updated to:', user.state)

	// Car model ma'lumotlari
	const carModelDisplay = ctx.session?.driverData?.carModel
		? user.language === 'uz'
			? ctx.session.driverData.carModel
			: ctx.session.driverData.carModelRu || ctx.session.driverData.carModel
		: ''

	const carTypeDisplay = ctx.session?.driverData?.carTypeName
		? user.language === 'uz'
			? `🏷️ ${ctx.session.driverData.carTypeName}\n`
			: `🏷️ ${ctx.session.driverData.carTypeNameRu || ctx.session.driverData.carTypeName}\n`
		: ''

	const message =
		user.language === 'uz'
			? `🚗 Mashina ma\'lumotlari:\n` +
			  `Model: ${carModelDisplay}\n` +
			  carTypeDisplay +
			  `\n🔢 Mashina raqamingizni kiriting:\n\n` +
			  '📝 Format: **01A123AA** yoki **10B456CC**\n' +
			  '✅ Masalan: 01A123AA, 10B456CC, 77C789DD\n\n' +
			  "ℹ️ Iltimos, to'g'ri formatda kiriting: 2 raqam + 1 harf + 3 raqam + 2 harf"
			: `🚗 Информация о машине:\n` +
			  `Модель: ${carModelDisplay}\n` +
			  carTypeDisplay +
			  `\n🔢 Введите номер машины:\n\n` +
			  '📝 Формат: **01A123AA** или **10B456CC**\n' +
			  '✅ Например: 01A123AA, 10B456CC, 77C789DD\n\n' +
			  'ℹ️ Пожалуйста, введите в правильном формате: 2 цифры + 1 буква + 3 цифры + 2 буквы'

	await ctx.reply(message, {
		parse_mode: 'Markdown',
		reply_markup: { remove_keyboard: true }
	})

	console.log('🚗 ========== askCarNumber END ==========')
}
// const selectCarCallback = async (ctx, callbackData) => {
//     const user = ctx.user;

//     ctx.session = ctx.session || {};
//     ctx.session.driverData = ctx.session.driverData || {};

//     const carId = callbackData.replace('car_select_', '');
//     const car = await Car.findById(carId);

//     if (!car) {
//         await ctx.reply(
//             user.language === 'uz' ? '❌ Mashina modeli topilmadi' : '❌ Модель машины не найдена'
//         );
//         await showCarSelection(ctx);
//         return;
//     }

//     ctx.session.driverData.carId = car._id;
//     ctx.session.driverData.carModel = car.name;
//     ctx.session.driverData.carModelRu = car.nameRu;

//     // Mashina turini so'rash
//     user.state = states.DRIVER_REG_CAR_TYPE;
//     await user.save();

//     const successMessage =
//         user.language === 'uz'
//             ? `✅ Mashina modeli tanlandi: ${car.name}`
//             : `✅ Модель машины выбрана: ${car.nameRu}`;

//     await ctx.reply(successMessage);

//     await selectCarType(ctx);
// };

// Car modelni qo'lda kiritganda
// const saveCarModel = async (ctx, text) => {
//     const user = ctx.user;

//     ctx.session = ctx.session || {};
//     ctx.session.driverData = ctx.session.driverData || {};

//     if (text.length < 2) {
//         const message =
//             user.language === 'uz'
//                 ? "❌ Mashina modeli kamida 2 ta belgidan iborat bo'lishi kerak."
//                 : '❌ Модель машины должна содержать не менее 2 символов.';

//         await ctx.reply(message);
//         return;
//     }

//     ctx.session.driverData.carModel = text;

//     // Mashina turini so'rash
//     user.state = states.DRIVER_REG_CAR_TYPE;
//     await user.save();

//     await selectCarType(ctx);
// };

// const showDriverEditMenu = async ctx => {
// 	const user = ctx.user

// 	const driver = await Driver.findOne({ telegramId: user.telegramId })

// 	if (!driver) {
// 		await ctx.reply(user.language === 'uz' ? '❌ Profil topilmadi' : '❌ Профиль не найден')
// 		return
// 	}

// 	const message =
// 		user.language === 'uz'
// 			? `✏️ <b>Profil tahrirlash</b>\n\n` + `Qaysi ma'lumotni tahrirlamoqchisiz?`
// 			: `✏️ <b>Редактирование профиля</b>\n\n` + `Какую информацию вы хотите редактировать?`

// 	const keyboard = {
// 		inline_keyboard: [
// 			[
// 				{
// 					text: user.language === 'uz' ? '👤 Ism-familiya' : '👤 Имя-фамилия',
// 					callback_data: 'edit_fullname'
// 				}
// 			],
// 			[
// 				{
// 					text: user.language === 'uz' ? '📞 Telefon raqam' : '📞 Номер телефона',
// 					callback_data: 'edit_phone'
// 				},
// 				{
// 					text: user.language === 'uz' ? '🚗 Mashina' : '🚗 Машина',
// 					callback_data: 'edit_car'
// 				}
// 			],
// 			[
// 				{
// 					text: user.language === 'uz' ? "👥 Yo'lovchilar soni" : '👥 Количество пассажиров',
// 					callback_data: 'edit_passengers'
// 				},
// 				{
// 					text: user.language === 'uz' ? "📍 Yo'nalish" : '📍 Направление',
// 					callback_data: 'edit_route'
// 				}
// 			],
// 			[
// 				{
// 					text: user.language === 'uz' ? '🎯 Xizmat turlari' : '🎯 Типы услуг',
// 					callback_data: 'edit_services'
// 				}
// 			],
// 			[
// 				{
// 					text: user.language === 'uz' ? "⏰ Jo'nash vaqti" : '⏰ Время отправления',
// 					callback_data: 'edit_time'
// 				}
// 			],
// 			[
// 				{
// 					text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
// 					callback_data: 'main_menu'
// 				},
// 				{
// 					text: user.language === 'uz' ? '❌ Bekor qilish' : '❌ Отмена',
// 					callback_data: 'driver_info'
// 				}
// 			]
// 		]
// 	}

// 	await ctx.reply(message, {
// 		reply_markup: keyboard,
// 		parse_mode: 'HTML'
// 	})
// }

// ====================== MASHINA MODELINI TANLASH (PAGINATION bilan) ======================
let currentCarPage = {} // {userId: pageNumber}

const showCarSelection = async ctx => {
    const user = ctx.user
    
    // Page ni 0 ga reset qilish
    if (!currentCarPage[user.telegramId]) {
        currentCarPage[user.telegramId] = 0
    }
    
    const page = currentCarPage[user.telegramId] || 0
    const limit = 5 // Har sahifada 5 ta mashina
    
    const cars = await Car.find({ isActive: true })
        .sort({ name: 1 })
        .skip(page * limit)
        .limit(limit)
    
    const totalCars = await Car.countDocuments({ isActive: true })
    const totalPages = Math.ceil(totalCars / limit)
    
    if (cars.length === 0) {
        const message = user.language === 'uz' 
            ? "🚗 Mashina modellari topilmadi. Mashina modelini qo'lda kiriting:"
            : '🚗 Модели машин не найдены. Введите модель машины вручную:'
        
        user.state = states.DRIVER_REG_CAR_MODEL
        await user.save()
        
        await ctx.reply(message, {
            reply_markup: { remove_keyboard: true }
        })
        return
    }
    
    const message = user.language === 'uz' 
        ? `🚗 Mashina modelini tanlang (${page + 1}/${totalPages}):`
        : `🚗 Выберите модель машины (${page + 1}/${totalPages}):`
    
    const keyboardButtons = []
    
    // Mashina tugmalari
    cars.forEach(car => {
        const displayName = user.language === 'uz' ? car.name : car.nameRu
        keyboardButtons.push([Markup.button.callback(displayName, `car_select_${car._id}`)])
    })
    
    // Pagination tugmalari
    const paginationButtons = []
    
    // Faqat orqaga tugmasi (agar birinchi sahifa bo'lmasa)
    if (page > 0) {
        paginationButtons.push(Markup.button.callback('⬅️', `car_page_${page - 1}`))
    }
    
    // Qo'lda kiritish tugmasi
    paginationButtons.push(Markup.button.callback(
        user.language === 'uz' ? '✏️ Qo\'lda kiritish' : '✏️ Ввести вручную', 
        'car_manual_input'
    ))
    
    // Faqat keyingi tugmasi (agar oxirgi sahifa bo'lmasa)
    if (page < totalPages - 1) {
        paginationButtons.push(Markup.button.callback('➡️', `car_page_${page + 1}`))
    }
    
    if (paginationButtons.length > 0) {
        keyboardButtons.push(paginationButtons)
    }
    
    // Orqaga tugmasi (registratsiyani qayta boshlash)
    keyboardButtons.push([
        Markup.button.callback(
            user.language === 'uz' ? '⬅️ Orqaga' : '⬅️ Назад', 
            'back_to_registration'
        )
    ])
    
    const keyboard = Markup.inlineKeyboard(keyboardButtons)
    
    try {
        // Avvalgi xabarni o'chirish
        if (ctx.callbackQuery?.message?.message_id) {
            await ctx.deleteMessage()
        }
    } catch (error) {
        console.log('Delete message error:', error.message)
    }
    
    await ctx.reply(message, keyboard)
}

// Pagination sahifasini o'zgartirish
// const handleCarPageChange = async (ctx, callbackData) => {
//     const user = ctx.user
//     const page = parseInt(callbackData.replace('car_page_', ''))
    
//     currentCarPage[user.telegramId] = page
//     await showCarSelection(ctx)
// }

// Mashinani tanlash callback
const selectCarCallback = async (ctx, callbackData) => {
    const user = ctx.user;
    
    ctx.session = ctx.session || {};
    ctx.session.driverData = ctx.session.driverData || {};
    
    const carId = callbackData.replace('car_select_', '');
    const car = await Car.findById(carId);
    
    if (!car) {
        await ctx.reply(
            user.language === 'uz' ? '❌ Mashina modeli topilmadi' : '❌ Модель машины не найдена'
        );
        await showCarSelection(ctx);
        return;
    }
    
    ctx.session.driverData.carId = car._id;
    ctx.session.driverData.carModel = car.name;
    ctx.session.driverData.carModelRu = car.nameRu;
    
    // Avval xabarni o'chirish
    try {
        await ctx.deleteMessage();
    } catch (error) {
        console.log('Delete message error:', error.message);
    }
    
    // Sessionni tozalash
    if (currentCarPage[user.telegramId]) {
        delete currentCarPage[user.telegramId];
    }
    
    const successMessage = user.language === 'uz'
        ? `✅ Mashina modeli tanlandi: ${car.name}\n\n`
        : `✅ Модель машины выбрана: ${car.nameRu}\n\n`;
    
    await ctx.reply(successMessage);
    
    // Mashina turini so'rash
    user.state = states.DRIVER_REG_CAR_TYPE;
    await user.save();
    
    await selectCarType(ctx);
}

// ====================== PAGINATION VA QO'LDA KIRITISH HANDLERLARI ======================

// Mashina modelini qo'lda kiritish oynasini ko'rsatish
const showManualCarInput = async ctx => {
    const user = ctx.user
    
    console.log('✏️ Manual car input requested')
    
    // Avval xabarni o'chirish
    try {
        if (ctx.callbackQuery?.message?.message_id) {
            await ctx.deleteMessage()
        }
    } catch (error) {
        console.log('Delete message error:', error.message)
    }
    
    const message = user.language === 'uz'
        ? "✏️ Mashina modelini kiriting:\n\n" +
          "Masalan:\n" +
          "• Cobalt\n" +
          "• Nexia 3\n" +
          "• Gentra\n" +
          "• Malibu\n" +
          "• Lacetti"
        : "✏️ Введите модель машины:\n\n" +
          "Например:\n" +
          "• Кобальт\n" +
          "• Нексия 3\n" +
          "• Гентра\n" +
          "• Малибу\n" +
          "• Лачетти"
    
    user.state = states.DRIVER_REG_CAR_MODEL
    await user.save()
    
    await ctx.reply(message, {
        reply_markup: { remove_keyboard: true }
    })
}

// Mashina sahifasini o'zgartirish
const handleCarPageChange = async (ctx, callbackData) => {
    const user = ctx.user
    const page = parseInt(callbackData.replace('car_page_', ''))
    
    console.log(`📄 Car page change to: ${page}`)
    
    currentCarPage[user.telegramId] = page
    await showCarSelection(ctx)
}

// Orqaga qaytish - mashina tanlashga
const handleBackToCarSelection = async ctx => {
    const user = ctx.user
    
    console.log('⬅️ Back to car selection')
    
    user.state = states.DRIVER_REG_SELECT_CAR
    await user.save()
    
    // Sessiondan mashina ma'lumotlarini tozalash
    if (ctx.session?.driverData) {
        delete ctx.session.driverData.carId
        delete ctx.session.driverData.carModel
        delete ctx.session.driverData.carModelRu
    }
    
    // currentCarPage ni reset qilish
    if (currentCarPage[user.telegramId]) {
        currentCarPage[user.telegramId] = 0
    }
    
    await showCarSelection(ctx)
}

// Orqaga qaytish - registratsiya boshiga
const handleBackToRegistration = async ctx => {
    const user = ctx.user
    
    console.log('⬅️ Back to registration start')
    
    // Registratsiyani qayta boshlash
    user.state = states.DRIVER_REG_FROM_REGION
    await user.save()
    
    // Sessionni tozalash
    if (ctx.session?.driverData) {
        ctx.session.driverData = {}
    }
    
    if (currentCarPage[user.telegramId]) {
        delete currentCarPage[user.telegramId]
    }
    
    const message = user.language === 'uz'
        ? "🚘 Haydovchi sifatida ro'yxatdan o'tish\n\n📍 Qaysi viloyatdan jo'namoqchisiz?"
        : '🚘 Регистрация как водитель\n\n📍 Из какого региона выезжаете?'
    
    await ctx.reply(message, keyboards.driverFromRegionsKeyboard(user.language))
}

// Car modelni qo'lda kiritganda
const saveCarModel = async (ctx, text) => {
    const user = ctx.user;
    
    ctx.session = ctx.session || {};
    ctx.session.driverData = ctx.session.driverData || {};
    
    if (text.length < 2) {
        const message = user.language === 'uz'
            ? "❌ Mashina modeli kamida 2 ta belgidan iborat bo'lishi kerak."
            : '❌ Модель машины должна содержать не менее 2 символов.';
        
        await ctx.reply(message);
        return;
    }
    
    ctx.session.driverData.carModel = text;
    ctx.session.driverData.carModelRu = text;
    
    const successMessage = user.language === 'uz'
        ? `✅ Mashina modeli saqlandi: ${text}`
        : `✅ Модель машины сохранена: ${text}`;
    
    await ctx.reply(successMessage);
    
    // Mashina turini so'rash
    user.state = states.DRIVER_REG_CAR_TYPE;
    await user.save();
    
    await selectCarType(ctx);
}

// Mashina turini so'rash (barcha mashina turlari uchun)
// const selectCarType = async ctx => {
//     const user = ctx.user
    
//     const carTypes = await CarType.find({ isActive: true }).sort({ name: 1 })
    
//     // Avval xabarni o'chirish
//     try {
//         await ctx.deleteMessage()
//     } catch (error) {
//         console.log('Delete message error:', error.message)
//     }
    
//     if (carTypes.length === 0) {
//         // Agar mashina turlari bo'lmasa, to'g'ridan-to'g'ri mashina raqamini so'rash
//         console.log('⚠️ No car types found, asking for car number directly')
//         await askCarNumber(ctx)
//         return
//     }
    
//     const carModelDisplay = user.language === 'uz'
//         ? ctx.session.driverData.carModel
//         : ctx.session.driverData.carModelRu || ctx.session.driverData.carModel
    
//     const message = user.language === 'uz'
//         ? `🚗 Mashinangiz modeli: ${carModelDisplay}\n\nMashina turini tanlang:`
//         : `🚗 Модель вашей машины: ${carModelDisplay}\n\nВыберите тип машины:`
    
//     const keyboardButtons = []
    
//     // Mashina turi tugmalari (3 ta qatorda)
//     for (let i = 0; i < carTypes.length; i += 3) {
//         const row = []
        
//         for (let j = 0; j < 3; j++) {
//             if (carTypes[i + j]) {
//                 const carType = carTypes[i + j]
//                 const displayName = user.language === 'uz' ? carType.name : carType.nameRu
//                 row.push(Markup.button.callback(displayName, `car_type_${carType._id}`))
//             }
//         }
        
//         if (row.length > 0) {
//             keyboardButtons.push(row)
//         }
//     }
    
//     // O'tkazib yuborish va qo'lda kiritish tugmalari
//     keyboardButtons.push([
//         Markup.button.callback(
//             user.language === 'uz' ? "⏭ O'tkazib yuborish" : '⏭ Пропустить', 
//             'car_type_skip'
//         )
//     ])
    
//     // Orqaga tugmasi
//     keyboardButtons.push([
//         Markup.button.callback(
//             user.language === 'uz' ? '⬅️ Orqaga' : '⬅️ Назад', 
//             'back_to_car_selection'
//         )
//     ])
    
//     const keyboard = Markup.inlineKeyboard(keyboardButtons)
    
//     await ctx.reply(message, keyboard)
// }

// Orqaga qaytish handlerlari
// const handleBackToCarSelection = async ctx => {
//     const user = ctx.user
    
//     user.state = states.DRIVER_REG_SELECT_CAR
//     await user.save()
    
//     // Sessiondan mashina ma'lumotlarini tozalash
//     if (ctx.session?.driverData) {
//         delete ctx.session.driverData.carId
//         delete ctx.session.driverData.carModel
//         delete ctx.session.driverData.carModelRu
//     }
    
//     await showCarSelection(ctx)
// }

// const handleBackToRegistration = async ctx => {
//     const user = ctx.user
    
//     // Registratsiyani qayta boshlash
//     user.state = states.DRIVER_REG_FROM_REGION
//     await user.save()
    
//     // Sessionni tozalash
//     if (ctx.session?.driverData) {
//         ctx.session.driverData = {}
//     }
    
//     if (currentCarPage[user.telegramId]) {
//         delete currentCarPage[user.telegramId]
//     }
    
//     const message = user.language === 'uz'
//         ? "🚘 Haydovchi sifatida ro'yxatdan o'tish\n\n📍 Qaysi viloyatdan jo'namoqchisiz?"
//         : '🚘 Регистрация как водитель\n\n📍 Из какого региона выезжаете?'
    
//     await ctx.reply(message, keyboards.driverFromRegionsKeyboard(user.language))
// }


module.exports = {
    handleCarPageChange,
    showManualCarInput,
    saveCarModel,
    selectCarType,
    handleBackToCarSelection,
    handleBackToRegistration,
	startRegistration,
	showDriverOrders,
	selectFromRegion,
	selectToRegion,
	saveFullName,
	savePhone,
	handleConfirmCallback,
	selectCarTypeCallback,
	selectMaxPassengers,
	selectServiceType,
	showCarSelection,
	selectCarCallback,
	selectDate,
	showDateTimeSelection,
	generateDateKeyboard,
	generateTimeKeyboard,
	showConfirmation,
	saveProfile: saveProfileWithPayment,
	showDriverMenu,
	showInactiveDriverMenu,
	handleDriverPayment,
	createSimplePaymentKeyboard,
	getSimplePaymentMessage,
	validateAndFormatAdminUsername,
	createAdminChatLink,
	showDriverEditMenu,
	editFullName,
	editPhone,
	editCar,
	editPassengers,
	editRoute,
	editServices,
	editTime,
	saveEditedFullName,
	saveEditedPhone,
	saveEditedPassengers,
	saveEditedRouteFrom,
	saveEditedRouteTo,
	saveEditedServices,
	saveEditedCar,
	saveEditedTime,
	createOrderAndFindDrivers,
	selectDriver,
	confirmOrder,
	cancelOrder,
	driverAcceptOrder,
	driverRejectOrder,
	selectWorkHoursCallback,
	saveCustomWorkHours,
	showTimeInput,
	saveTimeInput,
	completeDriverRegistration,
	showCarNumberInput,
	saveCarNumber,
	askCarNumber,
editTimeSelectDate,
saveManualDateInput 
}