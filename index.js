require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
const config = require('./config')
const express = require('express')

// Botni yaratish
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true })
const app  = express()

const users = new Map()
const drivers = new Map()
const orders = new Map()
let lastMessageIds = new Map()


app.get('/ping', (req, res) => {
	res.send('pong')
})

app.listen(process.env.PORT || 3000, () => {
	console.log('🌐 Keep alive server ishga tushdi')
})

// User modeli
class User {
	constructor(telegramId, username) {
		this.telegramId = telegramId
		this.username = username || ''
		this.language = null
		this.role = null
		this.state = 'LANG_SELECT'
		this.tempData = {}
		this.createdAt = new Date()
		this.isAdmin = false
		this.lastMessageId = null
	}
}

// Driver modeli
class Driver {
	constructor(telegramId) {
		this.telegramId = telegramId
		this.fullName = ''
		this.phone = ''
		this.carModel = ''
		this.fromRegion = ''
		this.toRegion = ''
		this.serviceType = ''
		this.departTime = ''
		this.status = 'noaktiv'
		this.isPaid = false
		this.createdAt = new Date()
	}
}

// Order modeli
class Order {
	constructor(userTelegramId) {
		this.id = Date.now().toString()
		this.userTelegramId = userTelegramId
		this.fromRegion = ''
		this.toRegion = ''
		this.hasPochta = false
		this.comment = ''
		this.status = 'pending'
		this.createdAt = new Date()
	}
}

// Bot xabarini o'chirish va yangisini yuborish
async function sendMessage(chatId, text, options = {}) {
	try {
		// Eski xabarni o'chirish
		const lastMsgId = lastMessageIds.get(chatId)
		if (lastMsgId) {
			try {
				await bot.deleteMessage(chatId, lastMsgId)
			} catch (e) {
				// Xabar allaqachon o'chirilgan bo'lishi mumkin
			}
		}

		// Yangi xabar yuborish
		const sentMessage = await bot.sendMessage(chatId, text, {
			parse_mode: 'HTML',
			...options
		})

		// Yangi message_id ni saqlash
		lastMessageIds.set(chatId, sentMessage.message_id)
		return sentMessage
	} catch (error) {
		console.error('Xabar yuborishda xato:', error)
	}
}

// Til tanlash
function getLanguageKeyboard() {
	return {
		reply_markup: {
			inline_keyboard: [
				[{ text: "🇺🇿 O'zbekcha", callback_data: 'lang_uz' }],
				[{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }]
			]
		}
	}
}

// Asosiy menyu
function getMainMenuKeyboard(lang = 'uz') {
	const texts = {
		uz: {
			taxi_need: '🚕 Taksi kerak',
			taxi_service: '🚖 Taksi xizmati'
		},
		ru: {
			taxi_need: '🚕 Нужно такси',
			taxi_service: '🚖 Такси услуга'
		}
	}[lang]

	return {
		reply_markup: {
			keyboard: [[{ text: texts.taxi_need }], [{ text: texts.taxi_service }]],
			resize_keyboard: true,
			one_time_keyboard: true
		}
	}
}

// Viloyatlar tugmalari - TO'G'RILANGAN
function getRegionsKeyboard(type, lang = 'uz') {
	const prefix = type === 'from' ? 'from_' : 'to_'
	const regionNames = {
		uz: {
			toshkent: 'Toshkent',
			samarqand: 'Samarqand',
			buxoro: 'Buxoro',
			andijon: 'Andijon',
			fargona: "Farg'ona",
			namangan: 'Namangan',
			xorazm: 'Xorazm',
			navoiy: 'Navoiy',
			qashqadaryo: 'Qashqadaryo',
			surxandaryo: 'Surxandaryo',
			jizzax: 'Jizzax',
			sirdaryo: 'Sirdaryo',
			qoraqalpogiston: "Qoraqalpog'iston"
		},
		ru: {
			toshkent: 'Ташкент',
			samarqand: 'Самарканд',
			buxoro: 'Бухара',
			andijon: 'Андижан',
			fargona: 'Фергана',
			namangan: 'Наманган',
			xorazm: 'Хорезм',
			navoiy: 'Навои',
			qashqadaryo: 'Кашкадарья',
			surxandaryo: 'Сурхандарья',
			jizzax: 'Джизак',
			sirdaryo: 'Сырдарья',
			qoraqalpogiston: 'Каракалпакстан'
		}
	}[lang]

	// Har bir tugma uchun alohida ob'ekt yaratish
	const buttons = config.regions.map(region => ({
		text: regionNames[region],
		callback_data: prefix + region
	}))

	// 2 ta ustunda chiqarish
	const inlineKeyboard = []
	for (let i = 0; i < buttons.length; i += 2) {
		const row = []
		row.push(buttons[i])
		if (buttons[i + 1]) {
			row.push(buttons[i + 1])
		}
		inlineKeyboard.push(row)
	}

	return {
		reply_markup: {
			inline_keyboard: inlineKeyboard
		}
	}
}

// Pochta tugmalari
function getPochtaKeyboard(lang = 'uz') {
	const texts = {
		uz: { yes: 'Ha', no: "Yo'q" },
		ru: { yes: 'Да', no: 'Нет' }
	}[lang]

	return {
		reply_markup: {
			inline_keyboard: [
				[{ text: texts.yes, callback_data: 'pochta_yes' }],
				[{ text: texts.no, callback_data: 'pochta_no' }]
			]
		}
	}
}

// Xizmat turi tugmalari
function getServiceTypeKeyboard(lang = 'uz') {
	const texts = {
		uz: {
			yol_yolakay: "Yo'l-yo'lkay",
			yonalish: "Yo'nalish",
			pochta: 'Pochta'
		},
		ru: {
			yol_yolakay: 'Попутчик',
			yonalish: 'Направление',
			pochta: 'Почта'
		}
	}[lang]

	return {
		reply_markup: {
			inline_keyboard: [
				[{ text: texts.yol_yolakay, callback_data: 'service_yol_yolakay' }],
				[{ text: texts.yonalish, callback_data: 'service_yonalish' }],
				[{ text: texts.pochta, callback_data: 'service_pochta' }]
			]
		}
	}
}

// Vaqt tugmalari - TO'G'RILANGAN
function getTimeKeyboard() {
	const buttons = config.times.map(time => ({
		text: time,
		callback_data: `time_${time}`
	}))

	const inlineKeyboard = []
	for (let i = 0; i < buttons.length; i += 3) {
		const row = []
		row.push(buttons[i])
		if (buttons[i + 1]) row.push(buttons[i + 1])
		if (buttons[i + 2]) row.push(buttons[i + 2])
		inlineKeyboard.push(row)
	}

	return {
		reply_markup: {
			inline_keyboard: inlineKeyboard
		}
	}
}

// Tasdiqlash tugmalari
function getConfirmKeyboard(lang = 'uz') {
	const texts = {
		uz: { yes: '✅ Tasdiqlash', no: '❌ Bekor qilish' },
		ru: { yes: '✅ Подтвердить', no: '❌ Отменить' }
	}[lang]

	return {
		reply_markup: {
			inline_keyboard: [
				[{ text: texts.yes, callback_data: 'confirm_yes' }],
				[{ text: texts.no, callback_data: 'confirm_no' }]
			]
		}
	}
}

// /start komandasi
bot.onText(/\/start/, async msg => {
	const chatId = msg.chat.id
	const telegramId = msg.from.id
	const username = msg.from.username

	let user = users.get(telegramId)
	if (!user) {
		user = new User(telegramId, username)

		// Adminni tekshirish
		if (msg.contact && msg.contact.phone_number === process.env.ADMIN_PHONE) {
			user.isAdmin = true
		}

		users.set(telegramId, user)
	}

	user.state = 'LANG_SELECT'
	await sendMessage(chatId, 'Tilni tanlang / Выберите язык:', getLanguageKeyboard())
})

// Til tanlash
bot.on('callback_query', async query => {
	const chatId = query.message.chat.id
	const telegramId = query.from.id
	const data = query.data

	let user = users.get(telegramId)
	if (!user) {
		user = new User(telegramId, query.from.username)
		users.set(telegramId, user)
	}

	// Til tanlash
	if (data.startsWith('lang_')) {
		user.language = data.split('_')[1]
		user.state = 'MAIN_MENU'

		const welcomeText = user.language === 'uz' ? 'Asosiy menyu:' : 'Главное меню:'

		await sendMessage(chatId, welcomeText, getMainMenuKeyboard(user.language))
	}

	// Yo'lovchi: Chiqish viloyati
	else if (data.startsWith('from_') && user.state === 'PASSENGER_FROM') {
		const region = data.split('_')[1]
		user.tempData.fromRegion = region
		user.state = 'PASSENGER_TO'

		const text =
			user.language === 'uz' ? 'Borish viloyatini tanlang:' : 'Выберите область назначения:'

		await sendMessage(chatId, text, getRegionsKeyboard('to', user.language))
	}

	// Yo'lovchi: Borish viloyati
	else if (data.startsWith('to_') && user.state === 'PASSENGER_TO') {
		const region = data.split('_')[1]
		user.tempData.toRegion = region
		user.state = 'PASSENGER_POCHTA'

		const text = user.language === 'uz' ? 'Pochta bormi?' : 'Есть почта?'

		await sendMessage(chatId, text, getPochtaKeyboard(user.language))
	}

	// Pochta tanlash
	else if (data.startsWith('pochta_') && user.state === 'PASSENGER_POCHTA') {
		user.tempData.hasPochta = data === 'pochta_yes'
		user.state = 'PASSENGER_COMMENT'

		const text =
			user.language === 'uz' ? 'Izoh kiriting (ixtiyoriy):' : 'Введите комментарий (необязательно):'

		await sendMessage(chatId, text)
	}

	// Haydovchi: Chiqish viloyati
	else if (data.startsWith('from_') && user.state === 'DRIVER_FROM') {
		const region = data.split('_')[1]
		user.tempData.fromRegion = region
		user.state = 'DRIVER_TO'

		const text =
			user.language === 'uz' ? 'Borish viloyatini tanlang:' : 'Выберите область назначения:'

		await sendMessage(chatId, text, getRegionsKeyboard('to', user.language))
	}

	// Haydovchi: Borish viloyati
	else if (data.startsWith('to_') && user.state === 'DRIVER_TO') {
		const region = data.split('_')[1]
		user.tempData.toRegion = region
		user.state = 'DRIVER_NAME'

		const text =
			user.language === 'uz' ? 'Ism familiyangizni kiriting:' : 'Введите ваше имя и фамилию:'

		await sendMessage(chatId, text)
	}

	// Xizmat turi
	else if (data.startsWith('service_')) {
		user.tempData.serviceType = data.split('_')[1]
		user.state = 'DRIVER_TIME'

		const text =
			user.language === 'uz' ? "Jo'nab ketish vaqtini tanlang:" : 'Выберите время отправления:'

		await sendMessage(chatId, text, getTimeKeyboard())
	}

	// Vaqt tanlash
	else if (data.startsWith('time_')) {
		user.tempData.departTime = data.split('_')[1]
		user.state = 'DRIVER_CONFIRM'

		// Haydovchi ma'lumotlarini ko'rsatish
		const driver = new Driver(telegramId)
		Object.assign(driver, user.tempData)

		const regionNames = {
			toshkent: user.language === 'uz' ? 'Toshkent' : 'Ташкент',
			samarqand: user.language === 'uz' ? 'Samarqand' : 'Самарканд',
			buxoro: user.language === 'uz' ? 'Buxoro' : 'Бухара',
			andijon: user.language === 'uz' ? 'Andijon' : 'Андижан',
			fargona: user.language === 'uz' ? "Farg'ona" : 'Фергана',
			namangan: user.language === 'uz' ? 'Namangan' : 'Наманган',
			xorazm: user.language === 'uz' ? 'Xorazm' : 'Хорезм',
			navoiy: user.language === 'uz' ? 'Navoiy' : 'Навои',
			qashqadaryo: user.language === 'uz' ? 'Qashqadaryo' : 'Кашкадарья',
			surxandaryo: user.language === 'uz' ? 'Surxandaryo' : 'Сурхандарья',
			jizzax: user.language === 'uz' ? 'Jizzax' : 'Джизак',
			sirdaryo: user.language === 'uz' ? 'Sirdaryo' : 'Сырдарья',
			qoraqalpogiston: user.language === 'uz' ? "Qoraqalpog'iston" : 'Каракалпакстан'
		}

		const serviceTypeNames = {
			yol_yolakay: user.language === 'uz' ? "Yo'l-yo'lkay" : 'Попутчик',
			yonalish: user.language === 'uz' ? "Yo'nalish" : 'Направление',
			pochta: user.language === 'uz' ? 'Pochta' : 'Почта'
		}

		const text =
			user.language === 'uz'
				? `📋 <b>Ma'lumotlaringiz:</b>\n\n` +
				  `👤 <b>Ism:</b> ${driver.fullName}\n` +
				  `📞 <b>Telefon:</b> ${driver.phone}\n` +
				  `🚗 <b>Mashina:</b> ${driver.carModel}\n` +
				  `📍 <b>Chiqish:</b> ${regionNames[driver.fromRegion] || driver.fromRegion}\n` +
				  `🎯 <b>Borish:</b> ${regionNames[driver.toRegion] || driver.toRegion}\n` +
				  `📦 <b>Xizmat:</b> ${serviceTypeNames[driver.serviceType] || driver.serviceType}\n` +
				  `⏰ <b>Vaqt:</b> ${driver.departTime}\n\n` +
				  `<b>Ma'lumotlaringiz to'g'rimi?</b>`
				: `📋 <b>Ваши данные:</b>\n\n` +
				  `👤 <b>Имя:</b> ${driver.fullName}\n` +
				  `📞 <b>Телефон:</b> ${driver.phone}\n` +
				  `🚗 <b>Машина:</b> ${driver.carModel}\n` +
				  `📍 <b>Отправление:</b> ${regionNames[driver.fromRegion] || driver.fromRegion}\n` +
				  `🎯 <b>Назначение:</b> ${regionNames[driver.toRegion] || driver.toRegion}\n` +
				  `📦 <b>Услуга:</b> ${serviceTypeNames[driver.serviceType] || driver.serviceType}\n` +
				  `⏰ <b>Время:</b> ${driver.departTime}\n\n` +
				  `<b>Ваши данные верны?</b>`

		await sendMessage(chatId, text, getConfirmKeyboard(user.language))
	}

	// Tasdiqlash
	else if (data === 'confirm_yes') {
		if (user.role === 'passenger') {
			// Buyurtma yaratish
			const order = new Order(telegramId)
			Object.assign(order, user.tempData)
			orders.set(order.id, order)

			// Buyurtmani kanalga yuborish
			const regionNames = {
				toshkent: 'Toshkent',
				samarqand: 'Samarqand',
				buxoro: 'Buxoro'
			}

			const orderText =
				`🚕 <b>YANGI BUYURTMA</b>\n\n` +
				`📍 <b>Chiqish:</b> ${regionNames[order.fromRegion] || order.fromRegion}\n` +
				`🎯 <b>Borish:</b> ${regionNames[order.toRegion] || order.toRegion}\n` +
				`📦 <b>Pochta:</b> ${order.hasPochta ? 'Ha' : "Yo'q"}\n` +
				`💬 <b>Izoh:</b> ${order.comment || "Yo'q"}\n\n` +
				`🆔 <b>ID:</b> ${order.id}`

			if (process.env.CHANNEL_ID) {
				try {
					await bot.sendMessage(process.env.CHANNEL_ID, orderText, {
						parse_mode: 'HTML'
					})
				} catch (e) {
					console.error('Kanalga xabar yuborishda xato:', e)
				}
			}

			const text =
				user.language === 'uz'
					? "✅ <b>Buyurtmangiz qabul qilindi!</b> Tez orada haydovchi bilan bog'lanamiz."
					: '✅ <b>Ваш заказ принят!</b> Мы скоро свяжемся с водителем.'

			user.state = 'MAIN_MENU'
			await sendMessage(chatId, text, getMainMenuKeyboard(user.language))
		} else if (user.role === 'driver') {
			// Haydovchini ro'yxatdan o'tkazish
			const driver = new Driver(telegramId)
			Object.assign(driver, user.tempData)
			drivers.set(telegramId, driver)

			const text =
				user.language === 'uz'
					? "✅ <b>Ro'yxatdan o'tdingiz!</b> Admin tasdig'ini kuting."
					: '✅ <b>Вы зарегистрированы!</b> Ожидайте подтверждения администратора.'

			user.state = 'MAIN_MENU'
			await sendMessage(chatId, text, getMainMenuKeyboard(user.language))
		}
	} else if (data === 'confirm_no') {
		user.state = 'MAIN_MENU'
		const text = user.language === 'uz' ? '❌ <b>Bekor qilindi.</b>' : '❌ <b>Отменено.</b>'

		await sendMessage(chatId, text, getMainMenuKeyboard(user.language))
	}

	// Callback query'ni javobsiz qoldirmaslik
	await bot.answerCallbackQuery(query.id)
})

// Matnli xabarlarni qayta ishlash
bot.on('message', async msg => {
	if (!msg.text || msg.text.startsWith('/')) return

	const chatId = msg.chat.id
	const telegramId = msg.from.id
	const text = msg.text

	let user = users.get(telegramId)
	if (!user) return

	// Asosiy menyu tanlovlari
	if (user.state === 'MAIN_MENU') {
		if (text.includes('Taksi kerak') || text.includes('Нужно такси')) {
			user.role = 'passenger'
			user.state = 'PASSENGER_FROM'
			user.tempData = {}

			const message =
				user.language === 'uz' ? 'Chiqish viloyatini tanlang:' : 'Выберите область отправления:'

			await sendMessage(chatId, message, getRegionsKeyboard('from', user.language))
		} else if (text.includes('Taksi xizmati') || text.includes('Такси услуга')) {
			user.role = 'driver'
			user.state = 'DRIVER_FROM'
			user.tempData = {}

			const message =
				user.language === 'uz' ? 'Chiqish viloyatini tanlang:' : 'Выберите область отправления:'

			await sendMessage(chatId, message, getRegionsKeyboard('from', user.language))
		}
	}

	// Yo'lovchi: Izoh
	else if (user.state === 'PASSENGER_COMMENT') {
		user.tempData.comment = text
		user.state = 'PASSENGER_CONFIRM'

		// Tasdiqlash uchun ma'lumotlarni ko'rsatish
		const regionNames = {
			toshkent: user.language === 'uz' ? 'Toshkent' : 'Ташкент',
			samarqand: user.language === 'uz' ? 'Samarqand' : 'Самарканд',
			buxoro: user.language === 'uz' ? 'Buxoro' : 'Бухара',
			andijon: user.language === 'uz' ? 'Andijon' : 'Андижан',
			fargona: user.language === 'uz' ? "Farg'ona" : 'Фергана',
			namangan: user.language === 'uz' ? 'Namangan' : 'Наманган',
			xorazm: user.language === 'uz' ? 'Xorazm' : 'Хорезм',
			navoiy: user.language === 'uz' ? 'Navoiy' : 'Навои',
			qashqadaryo: user.language === 'uz' ? 'Qashqadaryo' : 'Кашкадарья',
			surxandaryo: user.language === 'uz' ? 'Surxandaryo' : 'Сурхандарья',
			jizzax: user.language === 'uz' ? 'Jizzax' : 'Джизак',
			sirdaryo: user.language === 'uz' ? 'Sirdaryo' : 'Сырдарья',
			qoraqalpogiston: user.language === 'uz' ? "Qoraqalpog'iston" : 'Каракалпакстан'
		}

		const confirmText =
			user.language === 'uz'
				? `📋 <b>Buyurtma ma'lumotlari:</b>\n\n` +
				  `📍 <b>Chiqish:</b> ${
						regionNames[user.tempData.fromRegion] || user.tempData.fromRegion
				  }\n` +
				  `🎯 <b>Borish:</b> ${regionNames[user.tempData.toRegion] || user.tempData.toRegion}\n` +
				  `📦 <b>Pochta:</b> ${user.tempData.hasPochta ? 'Ha' : "Yo'q"}\n` +
				  `💬 <b>Izoh:</b> ${user.tempData.comment || "Yo'q"}\n\n` +
				  `<b>Tasdiqlaysizmi?</b>`
				: `📋 <b>Информация о заказе:</b>\n\n` +
				  `📍 <b>Отправление:</b> ${
						regionNames[user.tempData.fromRegion] || user.tempData.fromRegion
				  }\n` +
				  `🎯 <b>Назначение:</b> ${
						regionNames[user.tempData.toRegion] || user.tempData.toRegion
				  }\n` +
				  `📦 <b>Почта:</b> ${user.tempData.hasPochta ? 'Да' : 'Нет'}\n` +
				  `💬 <b>Комментарий:</b> ${user.tempData.comment || 'Нет'}\n\n` +
				  `<b>Подтверждаете?</b>`

		await sendMessage(chatId, confirmText, getConfirmKeyboard(user.language))
	}

	// Haydovchi: Ism familiya
	else if (user.state === 'DRIVER_NAME') {
		user.tempData.fullName = text
		user.state = 'DRIVER_PHONE'

		const message =
			user.language === 'uz'
				? 'Telefon raqamingizni kiriting:\n\n<b>Format:</b> +998901234567'
				: 'Введите ваш номер телефона:\n\n<b>Формат:</b> +998901234567'

		await sendMessage(chatId, message)
	}

	// Haydovchi: Telefon raqam
	else if (user.state === 'DRIVER_PHONE') {
		user.tempData.phone = text
		user.state = 'DRIVER_CAR'

		const message =
			user.language === 'uz'
				? 'Mashina modelini kiriting:\n\n<b>Misol:</b> Cobalt, Nexia 3, Gentra'
				: 'Введите модель машины:\n\n<b>Пример:</b> Cobalt, Nexia 3, Gentra'

		await sendMessage(chatId, message)
	}

	// Haydovchi: Mashina modeli
	else if (user.state === 'DRIVER_CAR') {
		user.tempData.carModel = text
		user.state = 'DRIVER_SERVICE'

		const message = user.language === 'uz' ? 'Xizmat turini tanlang:' : 'Выберите тип услуги:'

		await sendMessage(chatId, message, getServiceTypeKeyboard(user.language))
	}

	// Admin komandalari
	else if (user.isAdmin && text === '/admin') {
		const driversCount = drivers.size
		const ordersCount = orders.size
		const activeDrivers = Array.from(drivers.values()).filter(d => d.status === 'aktiv').length

		const adminText =
			`👑 <b>Admin paneli</b>\n\n` +
			`👥 <b>Haydovchilar:</b> ${driversCount}\n` +
			`✅ <b>Aktiv:</b> ${activeDrivers}\n` +
			`📋 <b>Buyurtmalar:</b> ${ordersCount}\n\n` +
			`/drivers - Haydovchilar ro'yxati\n` +
			`/orders - Faol buyurtmalar`

		await sendMessage(chatId, adminText)
	} else if (user.isAdmin && text === '/drivers') {
		const driversList = Array.from(drivers.values())
		if (driversList.length === 0) {
			await sendMessage(chatId, "Haydovchilar yo'q")
		} else {
			let driversText = "🚖 <b>Haydovchilar ro'yxati:</b>\n\n"
			driversList.forEach((driver, index) => {
				driversText += `${index + 1}. ${driver.fullName}\n`
				driversText += `   📞 ${driver.phone}\n`
				driversText += `   🚗 ${driver.carModel}\n`
				driversText += `   📍 ${driver.fromRegion} → ${driver.toRegion}\n`
				driversText += `   ⏰ ${driver.departTime}\n`
				driversText += `   🔧 ${driver.serviceType}\n`
				driversText += `   📊 ${driver.status}\n`
				driversText += `   💰 ${driver.isPaid ? "To'langan" : "To'lanmagan"}\n\n`
			})
			await sendMessage(chatId, driversText)
		}
	}
})

// Bot ishga tushirilganda
console.log('🚕 Taksi bot ishga tushdi...')

// Server o'chmasligi uchun
process.on('uncaughtException', err => {
	console.error('Xato:', err)
})

process.on('unhandledRejection', (reason, promise) => {
	console.error('Promise rad etildi:', reason)
})
