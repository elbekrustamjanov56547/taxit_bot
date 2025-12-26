const Driver = require('../models/Driver')
const User = require('../models/User')
const Order = require('../models/Order')
const Car = require('../models/Car')
const CarType = require('../models/CarType')
const states = require('../utils/states')
const keyboards = require('../keyboards/main')
const { Markup } = require('telegraf')

// ====================== ADMIN BILAN BOG'LANISH FUNKSIYALARI ======================

// Admin bilan bog'lanish keyboardini yaratish
const createAdminContactKeyboard = (userLanguage = 'uz') => {
	const adminUsername = process.env.ADMIN_TELEGRAM_USERNAME || '@TaxiAdmin'
	const adminUsernameClean = adminUsername.replace('@', '')

	return {
		inline_keyboard: [
			[
				{
					text:
						userLanguage === 'uz' ? "📩 Admin bilan chatga o'tish" : '📩 Перейти в чат с админом',
					url: `https://t.me/${adminUsernameClean}`
				}
			],
			[
				{
					text: userLanguage === 'uz' ? '❌ Bekor qilish' : '❌ Отмена',
					callback_data: 'cancel_admin_contact'
				}
			]
		]
	}
}

// Haydovchi uchun admin bilan bog'lanish xabarini ko'rsatish
const showAdminContactForDriver = async (ctx, driver = null) => {
	const user = ctx.user
	const adminUsername = process.env.ADMIN_TELEGRAM_USERNAME || '@TaxiAdmin'

	let message = ''

	if (driver) {
		// Nofaol haydovchi uchun xabar
		message =
			user.language === 'uz'
				? `💳 Sizning obunangiz faol emas\n\n` +
				  `📍 Yo'nalish: ${driver.fromRegion} → ${driver.toRegion}\n` +
				  `🚗 Mashina: ${driver.carModel}\n` +
				  `👥 Maksimal yo'lovchilar: ${driver.maxPassengers} kishi\n\n` +
				  `Xizmatlardan foydalanish uchun admin bilan bog'laning\n\n` +
				  `👤 Admin: ${adminUsername}`
				: `💳 Ваша подписка не активна\n\n` +
				  `📍 Направление: ${driver.fromRegion} → ${driver.toRegion}\n` +
				  `🚗 Машина: ${driver.carModel}\n` +
				  `👥 Максимум пассажиров: ${driver.maxPassengers} человек\n\n` +
				  `Для использования услуг свяжитесь с администратором\n\n` +
				  `👤 Админ: ${adminUsername}`
	} else {
		// Umumiy admin bilan bog'lanish xabari
		message =
			user.language === 'uz'
				? `💳 Xizmatlardan foydalanish uchun to'lov qilishingiz kerak\n\n` +
				  `To'lov va boshqa savollar uchun admin bilan bog'laning\n\n` +
				  `👤 Admin: ${adminUsername}`
				: `💳 Для использования услуг необходимо оплатить\n\n` +
				  `По вопросам оплаты и другим вопросам свяжитесь с администратором\n\n` +
				  `👤 Админ: ${adminUsername}`
	}

	await ctx.reply(message, {
		reply_markup: createAdminContactKeyboard(user.language)
	})
}

// Haydovchi to'lov tugmasini bosganda
// const handleDriverPaymentRequest = async (ctx, driver) => {
// 	const user = ctx.user

// 	// Agar haydovchi faol bo'lsa, to'lov kerak emas
// 	if (driver && driver.status === 'active') {
// 		await showDriverMenu(ctx)
// 		return
// 	}

// 	// Admin bilan bog'lanish xabarini ko'rsatish
// 	await showAdminContactForDriver(ctx, driver)
// }

// Haydovchi to'lov tugmasini bosganda
const handleDriverPaymentRequest = async (ctx, driver) => {
    const user = ctx.user;

    // Agar haydovchi faol bo'lsa, to'lov kerak emas
    if (driver && driver.status === 'active') {
        await showDriverMenu(ctx);
        return;
    }

    // Admin bilan bog'lanish xabarini ko'rsatish
    await showAdminContactForDriver(ctx, driver);
};

// ====================== RO'YXATDAN O'TISH BOSQICHLARI ======================

// Ro'yxatdan o'tishni boshlash
const startRegistration = async ctx => {
	const user = ctx.user

	// Sessionni tekshirish va yaratish
	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	// Haydovchi borligini tekshirish
	const existingDriver = await Driver.findOne({ telegramId: user.telegramId })

	if (existingDriver) {
		// Profil mavjud
		if (existingDriver.status === 'active') {
			await showDriverMenu(ctx)
		} else {
			await showInactiveDriverMenu(ctx, existingDriver)
		}
	} else {
		// Yangi ro'yxatdan o'tish
		user.state = states.DRIVER_REG_FROM_REGION
		await user.save()

		const message =
			user.language === 'uz'
				? "🚘 Haydovchi sifatida ro'yxatdan o'tish\n\n📍 Qaysi viloyatdan jo'namoqchisiz?"
				: '🚘 Регистрация как водитель\n\n📍 Из какого региона выезжаете?'

		await ctx.reply(message, keyboards.driverFromRegionsKeyboard(user.language))
	}
}

// Chiqish viloyatini tanlash
const selectFromRegion = async (ctx, callbackData) => {
	const user = ctx.user
	const region = callbackData.replace('driver_from_', '')

	// Sessionni tekshirish va yaratish
	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	// Session ga saqlash
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

	// Sessionni tekshirish
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

	// Sessionni tekshirish
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

	// Sessionni tekshirish
	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	// Telefon raqamini formatlash
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

	// Telefon raqamini tekshirish
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

	// Mashina modelini tanlashga o'tish
	user.state = states.DRIVER_REG_SELECT_CAR
	await user.save()

	// MongoDB-dan mashinalarni olish va callback formatida chiqarish
	await showCarSelection(ctx)
}

// Mashinalarni tanlashni ko'rsatish
const showCarSelection = async ctx => {
	const user = ctx.user

	// MongoDB-dan mashina modellarini olish
	const cars = await Car.find({ isActive: true }).sort({ name: 1 })

	if (cars.length === 0) {
		// Agar mashina modellari bo'lmasa, qo'lda kiritish imkoniyati
		const message =
			user.language === 'uz'
				? "🚗 Mashina modellari topilmadi. Mashina modelini qo'lda kiriting:"
				: '🚗 Модели машин не найдены. Введите модель машины вручную:'

		user.state = states.DRIVER_REG_CAR_MODEL
		await user.save()

		await ctx.reply(message, {
			reply_markup: {
				remove_keyboard: true
			}
		})
		return
	}

	const message =
		user.language === 'uz' ? '🚗 Mashina modelini tanlang:' : '🚗 Выберите модель машины:'

	// Mashina modellari keyboardi
	const keyboardButtons = []

	// Mashina modellarini guruhlash (3x3 formatda)
	for (let i = 0; i < cars.length; i += 3) {
		const row = []

		// Har bir qator uchun maksimal 3 ta tugma
		for (let j = 0; j < 3; j++) {
			if (cars[i + j]) {
				const car = cars[i + j]
				const displayName = user.language === 'uz' ? car.name : car.nameRu
				row.push(Markup.button.callback(displayName, `car_select_${car._id}`))
			}
		}

		if (row.length > 0) {
			keyboardButtons.push(row)
		}
	}

	const keyboard = Markup.inlineKeyboard(keyboardButtons)

	await ctx.reply(message, keyboard)
}

// Mashina modelini tanlash callback
const selectCarCallback = async (ctx, callbackData) => {
	const user = ctx.user

	// Sessionni to'g'ri yaratish
	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	// Mashina modelini ID bo'yicha tanlash
	const carId = callbackData.replace('car_select_', '')
	const car = await Car.findById(carId)

	if (!car) {
		await ctx.reply(
			user.language === 'uz' ? '❌ Mashina modeli topilmadi' : '❌ Модель машины не найдена'
		)
		// Qayta tanlash imkoniyati
		await showCarSelection(ctx)
		return
	}

	// Sessionga saqlash (ID va nomi)
	ctx.session.driverData.carId = car._id
	ctx.session.driverData.carModel = car.name
	ctx.session.driverData.carModelRu = car.nameRu

	user.state = states.DRIVER_REG_CAR_TYPE
	await user.save()

	const successMessage =
		user.language === 'uz'
			? `✅ Mashina modeli tanlandi: ${car.name}`
			: `✅ Модель машины выбрана: ${car.nameRu}`

	await ctx.reply(successMessage)

	// Mashina turini tanlashga o'tish
	await selectCarType(ctx)
}

// Mashina modelini qo'lda kiritish
const saveCarModel = async (ctx, text) => {
	const user = ctx.user

	// Sessionni tekshirish
	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	if (text.length < 2) {
		const message =
			user.language === 'uz'
				? "❌ Mashina modeli kamida 2 ta belgidan iborat bo'lishi kerak."
				: '❌ Модель машины должна содержать не менее 2 символов.'

		await ctx.reply(message)
		return
	}

	// Qo'lda kiritilgan modelni saqlash
	ctx.session.driverData.carModel = text
	// Qo'lda kiritilgani uchun carId yo'q

	// Mashina turini tanlashga o'tish
	user.state = states.DRIVER_REG_CAR_TYPE
	await user.save()

	await selectCarType(ctx)
}

// Mashina turini tanlash (MongoDB dan keladi)
const selectCarType = async ctx => {
	const user = ctx.user

	// MongoDB dan mashina turlarini olish
	const carTypes = await CarType.find({ isActive: true }).sort({ name: 1 })

	if (carTypes.length === 0) {
		// Agar mashina turlari bo'lmasa, to'g'ridan-to'g'ri sig'im tanlashga o'tish
		user.state = states.DRIVER_REG_MAX_PASSENGERS
		await user.save()

		const carModelDisplay =
			user.language === 'uz'
				? ctx.session.driverData.carModel
				: ctx.session.driverData.carModelRu || ctx.session.driverData.carModel

		const message =
			user.language === 'uz'
				? `🚗 Mashinangiz modeli: ${carModelDisplay}\n\n👥 Necha kishigacha olib ketasiz?`
				: `🚗 Модель вашей машины: ${carModelDisplay}\n\n👥 Сколько человек вы можете взять?`

		await ctx.reply(message, keyboards.maxPassengersKeyboard(user.language))
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

	// Mashina turlari keyboardi
	const keyboardButtons = []

	// 3x3 formatda tugmalar
	for (let i = 0; i < carTypes.length; i += 3) {
		const row = []

		// Har bir qator uchun maksimal 3 ta tugma
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

	// "O'tkazib yuborish" tugmasi
	keyboardButtons.push([
		Markup.button.callback(
			user.language === 'uz' ? "⏭ O'tkazib yuborish" : '⏭ Пропустить',
			'car_type_skip'
		)
	])

	const keyboard = Markup.inlineKeyboard(keyboardButtons)

	await ctx.reply(message, keyboard)
}

// Mashina turini tanlash callback
const selectCarTypeCallback = async (ctx, callbackData) => {
	const user = ctx.user

	// Sessionni to'g'ri yaratish
	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	if (callbackData === 'car_type_skip') {
		// O'tkazib yuborish
		ctx.session.driverData.carType = null
		ctx.session.driverData.carTypeName = null
		ctx.session.driverData.carTypeNameRu = null

		user.state = states.DRIVER_REG_MAX_PASSENGERS
		await user.save()

		const message =
			user.language === 'uz'
				? '👥 Necha kishigacha olib ketasiz?'
				: '👥 Сколько человек вы можете взять?'

		await ctx.reply(message, keyboards.maxPassengersKeyboard(user.language))
		return
	}

	// Mashina turini ID bo'yicha tanlash
	const carTypeId = callbackData.replace('car_type_', '')
	const carType = await CarType.findById(carTypeId)

	if (!carType) {
		await ctx.reply(
			user.language === 'uz' ? '❌ Mashina turi topilmadi' : '❌ Тип машины не найден'
		)
		return
	}

	// Sessionga saqlash
	ctx.session.driverData.carType = carType._id
	ctx.session.driverData.carTypeName = carType.name
	ctx.session.driverData.carTypeNameRu = carType.nameRu

	user.state = states.DRIVER_REG_MAX_PASSENGERS
	await user.save()

	const successMessage =
		user.language === 'uz'
			? `✅ Mashina turi tanlandi: ${carType.name}\n\n👥 Necha kishigacha olib ketasiz?`
			: `✅ Тип машины выбран: ${carType.nameRu}\n\n👥 Сколько человек вы можете взять?`

	await ctx.reply(successMessage, keyboards.maxPassengersKeyboard(user.language))
}

// Maksimal yo'lovchilar sonini tanlash
const selectMaxPassengers = async (ctx, callbackData) => {
	const user = ctx.user

	// Sessionni tekshirish
	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	const maxPassengers = parseInt(callbackData.replace('max_passengers_', ''))

	// Sessionga saqlash
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
const selectServiceType = async (ctx, callbackData) => {
	const user = ctx.user

	// Sessionni tekshirish
	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	// ServiceType array ni yaratish
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
			// Qayta xizmat tanlash keyboard chiqaramiz
			await ctx.reply(
				user.language === 'uz'
					? "🎯 Qanday xizmat ko'rsatmoqchisiz?"
					: '🎯 Какие услуги вы предоставляете?',
				keyboards.serviceTypeKeyboard(user.language, ctx.session.driverData.serviceType)
			)
			return
		}

		// Vaqt va sana tanlash oynasini chiqaramiz
		await showDateTimeSelection(ctx)
		return
	}

	const serviceType = callbackData.replace('service_', '')

	// Xizmatni toggle qilish (qo'shish/olib tashlash)
	if (ctx.session.driverData.serviceType.includes(serviceType)) {
		// Agar allaqachon tanlangan bo'lsa, o'chirish
		ctx.session.driverData.serviceType = ctx.session.driverData.serviceType.filter(
			type => type !== serviceType
		)
	} else {
		// Yangi tanlash
		ctx.session.driverData.serviceType.push(serviceType)
	}

	// Xizmat turlarini ko'rsatish
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

	// Yangilangan keyboard bilan xabar yuboramiz
	await ctx.reply(
		message,
		keyboards.serviceTypeKeyboard(user.language, ctx.session.driverData.serviceType)
	)
}

// ====================== VAQT VA SANA TANLASH ======================

// Sana tanlash uchun keyboard yaratish
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

// Vaqt tanlash uchun keyboard yaratish
const generateTimeKeyboard = (lang = 'uz') => {
	const rows = []
	const times = []

	// Soat 5:00 dan 23:00 gacha har yarim soatda
	for (let hour = 5; hour < 24; hour++) {
		for (let minute = 0; minute < 60; minute += 30) {
			const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
			times.push(timeStr)
		}
	}

	// 6x6 matritsada chiqarish
	for (let i = 0; i < times.length; i += 6) {
		const rowTimes = times.slice(i, i + 6)
		const row = rowTimes.map(time => Markup.button.callback(time, `time_${time}`))
		rows.push(row)
	}

	return Markup.inlineKeyboard(rows)
}

// Vaqt va sana tanlash oynasini ko'rsatish
const showDateTimeSelection = async ctx => {
	const user = ctx.user

	user.state = states.DRIVER_REG_DATE_SELECTION
	await user.save()

	const message =
		user.language === 'uz'
			? "📅 Jo'nash sanasini tanlang (keyingi 7 kun):"
			: '📅 Выберите дату отправления (следующие 7 дней):'

	// Kunlar keyboardini chiqaramiz
	await ctx.reply(message, generateDateKeyboard(user.language))
}

// Sana tanlash
const selectDate = async (ctx, callbackData) => {
	const user = ctx.user
	const dateStr = callbackData.replace('date_', '')

	// Sessionni tekshirish
	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	ctx.session.selectedDate = dateStr

	user.state = states.DRIVER_REG_TIME_SELECTION
	await user.save()

	const date = new Date(dateStr)
	const formattedDate = date.toLocaleDateString(user.language === 'uz' ? 'uz-UZ' : 'ru-RU', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	})

	const message =
		user.language === 'uz'
			? `📅 Tanlangan sana: ${formattedDate}\n\n⏰ Jo'nash vaqtini tanlang:`
			: `📅 Выбранная дата: ${formattedDate}\n\n⏰ Выберите время отправления:`

	// Vaqtlar keyboardini chiqaramiz
	await ctx.reply(message, generateTimeKeyboard(user.language))
}

// Vaqt tanlash
const selectTime = async (ctx, callbackData) => {
	const user = ctx.user
	const timeStr = callbackData.replace('time_', '')

	// Sessionni tekshirish
	ctx.session = ctx.session || {}
	ctx.session.driverData = ctx.session.driverData || {}

	// Sanani formatlash
	const selectedDate = ctx.session.selectedDate
	const date = new Date(selectedDate)
	const formattedDate = date.toLocaleDateString(user.language === 'uz' ? 'uz-UZ' : 'ru-RU', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	})

	// DepartureTime ni saqlash
	ctx.session.driverData.departureTime = `${formattedDate}, ${timeStr}`

	// Sessiondan selectedDate ni o'chiramiz
	delete ctx.session.selectedDate

	// Tasdiqlash oynasini ko'rsatish
	await showConfirmation(ctx)
}

// ====================== TASDIQLASH VA PROFIL SAQLASH ======================

// Tasdiqlash oynasini ko'rsatish
const showConfirmation = async ctx => {
	const user = ctx.user

	// Sessionni tekshirish
	if (!ctx.session || !ctx.session.driverData) {
		await ctx.reply("❌ Ma'lumotlar topilmadi. Iltimos, qaytadan boshlang.")
		user.state = states.MAIN_MENU
		await user.save()
		return
	}

	const data = ctx.session.driverData

	// Ma'lumotlarni tekshirish
	if (
		!data.fromRegion ||
		!data.toRegion ||
		!data.fullName ||
		!data.phone ||
		!data.carModel ||
		!data.maxPassengers ||
		!data.serviceType ||
		data.serviceType.length === 0 ||
		!data.departureTime
	) {
		await ctx.reply("❌ Barcha maydonlar to'ldirilmagan. Iltimos, qaytadan boshlang.")
		user.state = states.MAIN_MENU
		await user.save()
		return
	}

	const serviceNames = {
		road: user.language === 'uz' ? "Yo'l-yo'lakay" : 'Попутка',
		route: user.language === 'uz' ? "Yo'nalish" : 'Направление',
		parcel: user.language === 'uz' ? 'Pochta' : 'Посылка'
	}

	const services = data.serviceType.map(type => serviceNames[type]).join(', ')

	// Mashina turi ma'lumoti
	const carTypeInfo = data.carTypeName
		? `\n🚗 Mashina turi: ${user.language === 'uz' ? data.carTypeName : data.carTypeNameRu}`
		: ''

	// Mashina modelini display qilish
	const carModelDisplay = user.language === 'uz' ? data.carModel : data.carModelRu || data.carModel

	const message =
		user.language === 'uz'
			? `📋 Ma'lumotlaringizni tekshiring:\n\n` +
			  `📍 Chiqish: ${data.fromRegion}\n` +
			  `📍 Kirish: ${data.toRegion}\n` +
			  `👤 Ism-familiya: ${data.fullName}\n` +
			  `📞 Telefon: ${data.phone}\n` +
			  `🚗 Mashina: ${carModelDisplay}` +
			  carTypeInfo +
			  `\n👥 Maksimal yo'lovchilar: ${data.maxPassengers} kishi\n` +
			  `🎯 Xizmatlar: ${services}\n` +
			  `⏰ Jo'nash vaqti: ${data.departureTime}\n\n` +
			  `Barchasi to'g'rimi?`
			: `📋 Проверьте ваши данные:\n\n` +
			  `📍 Отправление: ${data.fromRegion}\n` +
			  `📍 Прибытие: ${data.toRegion}\n` +
			  `👤 Имя-фамилия: ${data.fullName}\n` +
			  `📞 Телефон: ${data.phone}\n` +
			  `🚗 Машина: ${carModelDisplay}` +
			  carTypeInfo +
			  `\n👥 Максимум пассажиров: ${data.maxPassengers} человек\n` +
			  `🎯 Услуги: ${services}\n` +
			  `⏰ Время отправления: ${data.departureTime}\n\n` +
			  `Все верно?`

	user.state = states.DRIVER_REG_CONFIRM
	await user.save()

	await ctx.reply(message, keyboards.confirmKeyboard(user.language))
}

// Profilni saqlash funksiyasini yangilaymiz (admin bilan bog'lanish xabarini qo'shamiz)
// const saveProfile = async ctx => {
// 	const user = ctx.user

// 	// Sessionni tekshirish
// 	if (!ctx.session || !ctx.session.driverData) {
// 		await ctx.reply("❌ Ma'lumotlar topilmadi. Iltimos, qaytadan boshlang.")
// 		user.state = states.MAIN_MENU
// 		await user.save()
// 		return
// 	}

// 	const data = ctx.session.driverData

// 	try {
// 		// Haydovchi yaratish
// 		const driverData = {
// 			telegramId: user.telegramId,
// 			fullName: data.fullName,
// 			phone: data.phone,
// 			fromRegion: data.fromRegion,
// 			toRegion: data.toRegion,
// 			carModel: data.carId || data.carModel,
// 			carType: data.carType || null,
// 			maxPassengers: data.maxPassengers || 4,
// 			serviceType: data.serviceType,
// 			departureTime: data.departureTime,
// 			status: 'inactive',
// 			balance: 0,
// 			rating: 5.0,
// 			totalOrders: 0,
// 			createdAt: new Date()
// 		}

// 		const driver = new Driver(driverData)
// 		await driver.save()

// 		// User rolini yangilash
// 		user.role = 'driver'
// 		user.state = states.MAIN_MENU
// 		await user.save()

// 		// To'lov haqida xabar
// 		const carTypeMessage = data.carTypeName
// 			? `\n🚗 Mashina turi: ${user.language === 'uz' ? data.carTypeName : data.carTypeNameRu}`
// 			: ''

// 		const carModelDisplay =
// 			user.language === 'uz' ? data.carModel : data.carModelRu || data.carModel

// 		// Admin username ni olish
// 		const adminUsername = process.env.ADMIN_TELEGRAM_USERNAME || '@TaxiAdmin'
// 		const adminUsernameClean = adminUsername.replace('@', '')

// 		const message =
// 			user.language === 'uz'
// 				? `✅ Profilingiz saqlandi!\n` +
// 				  `🚗 Mashina: ${carModelDisplay}` +
// 				  carTypeMessage +
// 				  `\n👥 Maksimal yo'lovchilar: ${data.maxPassengers || 4} kishi` +
// 				  `\n\n💰 Xizmatni faollashtirish uchun oylik to'lov qilishingiz kerak:\n` +
// 				  "💳 100,000 so'm / oy\n\n" +
// 				  `To'lov qilish uchun admin bilan bog'laning\n\n` +
// 				  `👤 Admin: ${adminUsername}`
// 				: `✅ Ваш профиль сохранен!\n` +
// 				  `🚗 Машина: ${carModelDisplay}` +
// 				  carTypeMessage +
// 				  `\n👥 Максимум пассажиров: ${data.maxPassengers || 4} человек` +
// 				  `\n\n💰 Для активации услуги необходимо оплатить ежемесячный платеж:\n` +
// 				  '💳 100,000 сум / месяц\n\n' +
// 				  `Для оплаты свяжитесь с администратором\n\n` +
// 				  `👤 Админ: ${adminUsername}`

// 		// Admin bilan bog'lanish tugmasi bilan xabar yuboramiz
// 		await ctx.reply(message, {
// 			reply_markup: {
// 				inline_keyboard: [
// 					[
// 						{
// 							text:
// 								user.language === 'uz'
// 									? "📩 Admin bilan chatga o'tish"
// 									: '📩 Перейти в чат с админом',
// 							url: `https://t.me/${adminUsernameClean}`
// 						}
// 					],
// 					[
// 						{
// 							text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
// 							callback_data: 'main_menu'
// 						}
// 					]
// 				]
// 			}
// 		})

// 		// Session ni tozalash
// 		delete ctx.session.driverData
// 	} catch (error) {
// 		console.error('Save profile error:', error)
// 		console.error('Error details:', error.stack)

// 		const message =
// 			user.language === 'uz'
// 				? "❌ Profilni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
// 				: '❌ Ошибка при сохранении профиля. Пожалуйста, попробуйте еще раз.'

// 		await ctx.reply(message)
// 	}
// }

// Profilni saqlash funksiyasini yangilaymiz (admin bilan bog'lanish xabarini qo'shamiz)
const saveProfile = async ctx => {
    const user = ctx.user;

    // Sessionni tekshirish
    if (!ctx.session || !ctx.session.driverData) {
        await ctx.reply("❌ Ma'lumotlar topilmadi. Iltimos, qaytadan boshlang.");
        user.state = states.MAIN_MENU;
        await user.save();
        return;
    }

    const data = ctx.session.driverData;

    try {
        // Haydovchi yaratish
        const driverData = {
            telegramId: user.telegramId,
            fullName: data.fullName,
            phone: data.phone,
            fromRegion: data.fromRegion,
            toRegion: data.toRegion,
            carModel: data.carId || data.carModel,
            carType: data.carType || null,
            maxPassengers: data.maxPassengers || 4,
            serviceType: data.serviceType,
            departureTime: data.departureTime,
            status: 'inactive',
            balance: 0,
            rating: 5.0,
            totalOrders: 0,
            createdAt: new Date()
        };

        const driver = new Driver(driverData);
        await driver.save();

        // User rolini yangilash
        user.role = 'driver';
        user.state = states.MAIN_MENU;
        await user.save();

        // To'lov haqida xabar
        const adminUsername = process.env.ADMIN_TELEGRAM_USERNAME || '@TaxiAdmin';
        const adminUsernameClean = adminUsername.replace('@', '');

        const message =
            user.language === 'uz'
                ? `✅ Profilingiz saqlandi!\n\n` +
                  `💰 Xizmatni faollashtirish uchun oylik to'lov qilishingiz kerak:\n` +
                  "💳 100,000 so'm / oy\n\n" +
                  `To'lov qilish uchun admin bilan bog'laning\n\n` +
                  `👤 Admin: ${adminUsername}`
                : `✅ Ваш профиль сохранен!\n\n` +
                  `💰 Для активации услуги необходимо оплатить ежемесячный платеж:\n` +
                  '💳 100,000 сум / месяц\n\n' +
                  `Для оплаты свяжитесь с администратором\n\n` +
                  `👤 Админ: ${adminUsername}`;

        // Admin bilan bog'lanish tugmasi bilan xabar yuboramiz
        await ctx.reply(message, {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: user.language === 'uz' ? "📩 Admin bilan chatga o'tish" : '📩 Перейти в чат с админом',
                            url: `https://t.me/${adminUsernameClean}`
                        }
                    ],
                    [
                        {
                            text: user.language === 'uz' ? "💳 To'lov qilish" : '💳 Оплатить',
                            callback_data: 'driver_payment'
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
        });

        // Session ni tozalash
        delete ctx.session.driverData;
    } catch (error) {
        console.error('Save profile error:', error);
        console.error('Error details:', error.stack);

        const message =
            user.language === 'uz'
                ? "❌ Profilni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
                : '❌ Ошибка при сохранении профиля. Пожалуйста, попробуйте еще раз.';

        await ctx.reply(message);
    }
};

// ====================== HAYDOVCHI MENYU ======================

// Haydovchi menusi
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

	// Mashina modelini aniqlash
	let carModelInfo = ''
	if (driver.carModel) {
		if (typeof driver.carModel === 'object' && driver.carModel.name) {
			// Agar Car modeliga reference bo'lsa
			carModelInfo = user.language === 'uz' ? driver.carModel.name : driver.carModel.nameRu
		} else {
			// Agar string bo'lsa
			carModelInfo = driver.carModel
		}
	}

	// Mashina turini aniqlash
	let carTypeInfo = ''
	if (driver.carType) {
		carTypeInfo = `\n🚗 Mashina turi: ${
			user.language === 'uz' ? driver.carType.name : driver.carType.nameRu
		}`
	}

	const message =
		user.language === 'uz'
			? `🚘 Haydovchi menyusi\n\n` +
			  `👤 ${driver.fullName}\n` +
			  `🚗 Mashina: ${carModelInfo}` +
			  carTypeInfo +
			  `\n📍 Yo'nalish: ${driver.fromRegion} → ${driver.toRegion}\n` +
			  `👥 Maksimal yo'lovchilar: ${driver.maxPassengers} kishi\n` +
			  `📊 Reyting: ${driver.rating}/5.0\n` +
			  `📦 Buyurtmalar: ${driver.totalOrders}\n` +
			  `💰 Balans: ${driver.balance} so'm\n` +
			  `⏰ Obuna: ${
					driver.paidUntil ? new Date(driver.paidUntil).toLocaleDateString('uz-UZ') : "Yo'q"
			  }\n` +
			  `🔔 Holat: ${driver.status === 'active' ? 'Faol' : 'Nofaol'}`
			: `🚘 Меню водителя\n\n` +
			  `👤 ${driver.fullName}\n` +
			  `🚗 Машина: ${carModelInfo}` +
			  carTypeInfo +
			  `\n📍 Направление: ${driver.fromRegion} → ${driver.toRegion}\n` +
			  `👥 Максимум пассажиров: ${driver.maxPassengers} человек\n` +
			  `📊 Рейтинг: ${driver.rating}/5.0\n` +
			  `📦 Заказы: ${driver.totalOrders}\n` +
			  `💰 Баланс: ${driver.balance} сум\n` +
			  `⏰ Подписка: ${
					driver.paidUntil ? new Date(driver.paidUntil).toLocaleDateString('ru-RU') : 'Нет'
			  }\n` +
			  `🔔 Статус: ${driver.status === 'active' ? 'Активен' : 'Неактивен'}`

	const keyboard = {
		inline_keyboard: [
			[
				{
					text: user.language === 'uz' ? '✏️ Profilni tahrirlash' : '✏️ Редактировать профиль',
					callback_data: 'driver_edit'
				}
			],
			[
				{
					text: user.language === 'uz' ? "💳 To'lov qilish" : '💳 Оплатить',
					callback_data: 'driver_payment'
				},
				{
					text: user.language === 'uz' ? '📊 Statistika' : '📊 Статистика',
					callback_data: 'driver_stats'
				}
			],
			[
				{
					text:
						user.language === 'uz'
							? `🔔 ${driver.status === 'active' ? 'Nofaollashtirish' : 'Faollashtirish'}`
							: `🔔 ${driver.status === 'active' ? 'Деактивировать' : 'Активировать'}`,
					callback_data: 'driver_toggle_status'
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

	await ctx.reply(message, { reply_markup: keyboard })
}

// Nofaol haydovchi menusi
// const showInactiveDriverMenu = async (ctx, driver) => {
// 	const user = ctx.user

// 	// Driver ni populate qilamiz
// 	const populatedDriver = await Driver.findById(driver._id).populate('carModel').populate('carType')

// 	// Mashina modelini aniqlash
// 	let carModelInfo = ''
// 	if (populatedDriver.carModel) {
// 		if (typeof populatedDriver.carModel === 'object' && populatedDriver.carModel.name) {
// 			// Agar Car modeliga reference bo'lsa
// 			carModelInfo =
// 				user.language === 'uz' ? populatedDriver.carModel.name : populatedDriver.carModel.nameRu
// 		} else {
// 			// Agar string bo'lsa
// 			carModelInfo = populatedDriver.carModel
// 		}
// 	}

// 	// Mashina turini aniqlash
// 	let carTypeInfo = ''
// 	if (populatedDriver.carType) {
// 		carTypeInfo = `\n🚗 Mashina turi: ${
// 			user.language === 'uz' ? populatedDriver.carType.name : populatedDriver.carType.nameRu
// 		}`
// 	}

// 	const message =
// 		user.language === 'uz'
// 			? `🚘 Haydovchi profili (Nofaol)\n\n` +
// 			  `Sizning profilingiz faol emas. Buyurtma olish uchun to'lov qiling.\n\n` +
// 			  `👤 ${populatedDriver.fullName}\n` +
// 			  `🚗 Mashina: ${carModelInfo}` +
// 			  carTypeInfo +
// 			  `\n📍 ${populatedDriver.fromRegion} → ${populatedDriver.toRegion}\n` +
// 			  `👥 Maksimal yo'lovchilar: ${populatedDriver.maxPassengers} kishi\n\n` +
// 			  `💰 Oylik to'lov: 100,000 so'm`
// 			: `🚘 Профиль водителя (Неактивен)\n\n` +
// 			  `Ваш профиль не активен. Оплатите, чтобы получать заказы.\n\n` +
// 			  `👤 ${populatedDriver.fullName}\n` +
// 			  `🚗 ${carModelInfo}` +
// 			  carTypeInfo +
// 			  `\n📍 ${populatedDriver.fromRegion} → ${populatedDriver.toRegion}\n` +
// 			  `👥 Максимум пассажиров: ${populatedDriver.maxPassengers} человек\n\n` +
// 			  `💰 Ежемесячный платеж: 100,000 сум`

// 	const keyboard = {
// 		inline_keyboard: [
// 			[
// 				{
// 					text: user.language === 'uz' ? "💳 To'lov qilish" : '💳 Оплатить',
// 					callback_data: 'driver_payment'
// 				}
// 			],
// 			[
// 				{
// 					text: user.language === 'uz' ? '✏️ Profilni tahrirlash' : '✏️ Редактировать профиль',
// 					callback_data: 'driver_edit'
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

// 	await ctx.reply(message, { reply_markup: keyboard })
// }


// Nofaol haydovchi menusi
const showInactiveDriverMenu = async (ctx, driver) => {
    const user = ctx.user;

    // Driver ni populate qilamiz
    const populatedDriver = await Driver.findById(driver._id).populate('carModel').populate('carType');

    // Mashina modelini aniqlash
    let carModelInfo = '';
    if (populatedDriver.carModel) {
        if (typeof populatedDriver.carModel === 'object' && populatedDriver.carModel.name) {
            carModelInfo = user.language === 'uz' ? populatedDriver.carModel.name : populatedDriver.carModel.nameRu;
        } else {
            carModelInfo = populatedDriver.carModel;
        }
    }

    // Mashina turini aniqlash
    let carTypeInfo = '';
    if (populatedDriver.carType) {
        carTypeInfo = `\n🚗 Mashina turi: ${
            user.language === 'uz' ? populatedDriver.carType.name : populatedDriver.carType.nameRu
        }`;
    }

    const message =
        user.language === 'uz'
            ? `🚘 Haydovchi profili (Nofaol)\n\n` +
              `Sizning profilingiz faol emas. Buyurtma olish uchun to'lov qiling.\n\n` +
              `👤 ${populatedDriver.fullName}\n` +
              `🚗 Mashina: ${carModelInfo}` +
              carTypeInfo +
              `\n📍 ${populatedDriver.fromRegion} → ${populatedDriver.toRegion}\n` +
              `👥 Maksimal yo'lovchilar: ${populatedDriver.maxPassengers} kishi\n\n` +
              `💰 Oylik to'lov: 100,000 so'm`
            : `🚘 Профиль водителя (Неактивен)\n\n` +
              `Ваш профиль не активен. Оплатите, чтобы получать заказы.\n\n` +
              `👤 ${populatedDriver.fullName}\n` +
              `🚗 ${carModelInfo}` +
              carTypeInfo +
              `\n📍 ${populatedDriver.fromRegion} → ${populatedDriver.toRegion}\n` +
              `👥 Максимум пассажиров: ${populatedDriver.maxPassengers} человек\n\n` +
              `💰 Ежемесячный платеж: 100,000 сум`;

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
    };

    await ctx.reply(message, { reply_markup: keyboard });
};
// ====================== YO'LOVCHI UCHUN ADMIN BILAN BOG'LANISH ======================

// Yo'lovchi uchun admin bilan bog'lanish xabarini ko'rsatish
const showAdminContactForPassenger = async (ctx, order = null) => {
	const user = ctx.user
	const adminUsername = process.env.ADMIN_TELEGRAM_USERNAME || '@TaxiAdmin'

	let message = ''

	if (order) {
		// Buyurtma bilan bog'liq xabar
		message =
			user.language === 'uz'
				? `🚕 Buyurtmangiz admin tomonidan ko'rib chiqiladi\n\n` +
				  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
				  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n\n` +
				  `Qo'shimcha savollar uchun admin bilan bog'lanishingiz mumkin\n\n` +
				  `👤 Admin: ${adminUsername}`
				: `🚕 Ваш заказ рассматривается администратором\n\n` +
				  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
				  `👥 Пассажиры: ${order.passengerCount} человек\n` +
				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n\n` +
				  `По дополнительным вопросам вы можете связаться с администратором\n\n` +
				  `👤 Админ: ${adminUsername}`
	} else {
		// Umumiy admin bilan bog'lanish xabari
		message =
			user.language === 'uz'
				? `ℹ️ Qo'shimcha ma'lumot uchun admin bilan bog'lanishingiz mumkin\n\n` +
				  `👤 Admin: ${adminUsername}`
				: `ℹ️ Для получения дополнительной информации вы можете связаться с администратором\n\n` +
				  `👤 Админ: ${adminUsername}`
	}

	await ctx.reply(message, {
		reply_markup: createAdminContactKeyboard(user.language)
	})
}

// ====================== QO'SHIMCHA YAXSHILANISHLAR ======================

// 1. Admin username validatsiyasi
const validateAdminUsername = () => {
	const adminUsername = process.env.ADMIN_TELEGRAM_USERNAME || '@TaxiAdmin'
	
	// Username formatini tekshirish
	if (!adminUsername.startsWith('@')) {
		console.warn('❌ ADMIN_TELEGRAM_USERNAME @ bilan boshlanishi kerak')
		return '@' + adminUsername.replace('@', '')
	}
	
	return adminUsername
}

// 2. Qayta ishlatiladigan admin xabari funksiyasi
const getAdminContactMessage = (userLanguage = 'uz', context = 'general', additionalInfo = {}) => {
	const adminUsername = validateAdminUsername()
	const adminUsernameClean = adminUsername.replace('@', '')
	
	const messages = {
		'uz': {
			'payment_required': `💳 Xizmatlardan foydalanish uchun to'lov qilishingiz kerak\n\n` +
							   `To'lov va boshqa savollar uchun admin bilan bog'laning\n\n` +
							   `👤 Admin: ${adminUsername}`,
			'order_pending': `🚕 Buyurtmangiz admin tomonidan ko'rib chiqiladi\n\n` +
							`Qo'shimcha savollar uchun admin bilan bog'lanishingiz mumkin\n\n` +
							`👤 Admin: ${adminUsername}`,
			'general_help': `ℹ️ Qo'shimcha ma'lumot uchun admin bilan bog'lanishingiz mumkin\n\n` +
						   `👤 Admin: ${adminUsername}`,
			'driver_inactive': `💳 Sizning obunangiz faol emas\n\n` +
							  `📍 Yo'nalish: ${additionalInfo.fromRegion} → ${additionalInfo.toRegion}\n` +
							  `🚗 Mashina: ${additionalInfo.carModel}\n` +
							  `👥 Maksimal yo'lovchilar: ${additionalInfo.maxPassengers} kishi\n\n` +
							  `Xizmatlardan foydalanish uchun admin bilan bog'laning\n\n` +
							  `👤 Admin: ${adminUsername}`
		},
		'ru': {
			'payment_required': `💳 Для использования услуг необходимо оплатить\n\n` +
							   `По вопросам оплаты и другим вопросам свяжитесь с администратором\n\n` +
							   `👤 Админ: ${adminUsername}`,
			'order_pending': `🚕 Ваш заказ рассматривается администратором\n\n` +
							`По дополнительным вопросам вы можете связаться с администратором\n\n` +
							`👤 Админ: ${adminUsername}`,
			'general_help': `ℹ️ Для получения дополнительной информации вы можете связаться с администратором\n\n` +
						   `👤 Админ: ${adminUsername}`,
			'driver_inactive': `💳 Ваша подписка не активна\n\n` +
							  `📍 Направление: ${additionalInfo.fromRegion} → ${additionalInfo.toRegion}\n` +
							  `🚗 Машина: ${additionalInfo.carModel}\n` +
							  `👥 Максимум пассажиров: ${additionalInfo.maxPassengers} человек\n\n` +
							  `Для использования услуг свяжитесь с администратором\n\n` +
							  `👤 Админ: ${adminUsername}`
		}
	}
	
	return {
		message: messages[userLanguage][context],
		keyboard: createAdminContactKeyboard(userLanguage),
		url: `https://t.me/${adminUsernameClean}`
	}
}

// 3. Kengaytirilgan admin contact funksiyasi
const showAdminContactUniversal = async (ctx, context = 'general', additionalInfo = {}) => {
	const user = ctx.user
	const contactInfo = getAdminContactMessage(user.language, context, additionalInfo)
	
	await ctx.reply(contactInfo.message, {
		reply_markup: contactInfo.keyboard
	})
	
	return contactInfo
}

// 4. To'lov talabi tugmasini ishlatish
const handlePaymentButton = async (ctx, driver = null) => {
	const user = ctx.user
	
	// Agar driver parametr berilmasa, DB dan olamiz
	if (!driver) {
		driver = await Driver.findOne({ telegramId: user.telegramId })
			.populate('carModel')
			.populate('carType')
	}
	
	// Haydovchi topilmasa
	if (!driver) {
		await ctx.reply(
			user.language === 'uz' 
				? '❌ Haydovchi profili topilmadi' 
				: '❌ Профиль водителя не найден'
		)
		return
	}
	
	// Agar haydovchi faol bo'lsa
	if (driver.status === 'active') {
		await ctx.reply(
			user.language === 'uz' 
				? '✅ Sizning obunangiz allaqachon faol. Qo\'shimcha to\'lov talab qilinmaydi.' 
				: '✅ Ваша подписка уже активна. Дополнительная оплата не требуется.'
		)
		await showDriverMenu(ctx)
		return
	}
	
	// Admin bilan bog'lanish xabarini ko'rsatish
	await showAdminContactForDriver(ctx, driver)
}

// 5. Yo'lovchi uchun buyurtma yaratganda admin contact
const handlePassengerOrderCreated = async (ctx, order) => {
	const user = ctx.user
	
	const contactInfo = await showAdminContactUniversal(ctx, 'order_pending', {
		fromRegion: order.fromRegion,
		toRegion: order.toRegion,
		passengerCount: order.passengerCount,
		hasParcel: order.hasParcel || false
	})
	
	// Adminga avtomatik xabar yuborish (agar kerak bo'lsa)
	await notifyAdminAboutNewOrder(order, user)
}

// 6. Adminni yangi buyurtma haqida ogohlantirish
const notifyAdminAboutNewOrder = async (order, user) => {
	try {
		const adminUsername = validateAdminUsername()
		const adminUsernameClean = adminUsername.replace('@', '')
		
		// Admin telegram ID sini environment dan olish
		const adminChatId = process.env.ADMIN_CHAT_ID
		
		if (adminChatId) {
			const orderMessage = `📦 YANGI BUYURTMA\n\n` +
								`👤 Yo'lovchi: ${user.fullName || 'Noma\'lum'}\n` +
								`📞 Telefon: ${order.phone}\n` +
								`📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
								`👥 Yo'lovchilar: ${order.passengerCount}\n` +
								`📦 Pochta: ${order.hasParcel ? 'Bor' : 'Yo\'q'}\n` +
								`⏰ Sana: ${new Date().toLocaleString('uz-UZ')}\n\n` +
								`🆔 Buyurtma ID: ${order._id}`
			
			// Bu yerda bot orqali adminga xabar yuborish logikasi bo'ladi
			// Masalan: bot.sendMessage(adminChatId, orderMessage)
			console.log('Admin notification:', orderMessage)
		}
	} catch (error) {
		console.error('Admin notification error:', error)
	}
}

// ====================== MODULE EXPORTS GA QO'SHAMIZ ======================

// ====================== MODULE EXPORTS ======================

module.exports = {
	// Ro'yxatdan o'tish funksiyalari
	startRegistration,
	selectFromRegion,
	selectToRegion,
	saveFullName,
	savePhone,
	saveCarModel,
	selectCarType,
	selectCarTypeCallback,
	selectMaxPassengers,
	selectServiceType,
	showCarSelection,
	selectCarCallback,

	// Vaqt va sana tanlash
	selectDate,
	selectTime,
	showDateTimeSelection,
	generateDateKeyboard,
	generateTimeKeyboard,

	// Tasdiqlash va profil saqlash
	showConfirmation,
	saveProfile,

	// Haydovchi menyusi
	showDriverMenu,
	showInactiveDriverMenu,

	// Admin bilan bog'lanish funksiyalari
	showAdminContactForDriver,
	showAdminContactForPassenger,
	handleDriverPaymentRequest,
	createAdminContactKeyboard,
	validateAdminUsername,
	getAdminContactMessage,
	showAdminContactUniversal,
	handlePaymentButton,
	handlePassengerOrderCreated,
	notifyAdminAboutNewOrder
}
