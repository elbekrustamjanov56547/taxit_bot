const Driver = require('../models/Driver')
const User = require('../models/User')
const states = require('../utils/states')
const keyboards = require('../keyboards/main')
const { Markup } = require('telegraf')

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

// const generateTimeKeyboard = (lang = 'uz') => {
//     const times = []

//     // Soat 5:00 dan 23:00 gacha har yarim soatda
//     for (let hour = 5; hour < 24; hour++) {
//         for (let minute = 0; minute < 60; minute += 30) {
//             const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
//             times.push([Markup.button.callback(timeStr, `time_${timeStr}`)])
//         }
//     }

//     // 6x6 matritsada chiqarish
//     const rows = []
//     for (let i = 0; i < times.length; i += 6) {
//         rows.push(times.slice(i, i + 6))
//     }

//     return Markup.inlineKeyboard(rows)
// }

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

// Ro'yxatdan o'tishni boshlash
const startRegistration = async ctx => {
    const user = ctx.user

    // Sessionni tekshirish va yaratish
    if (!ctx.session) {
        ctx.session = {}
    }
    if (!ctx.session.driverData) {
        ctx.session.driverData = {}
    }

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

        // To'g'ri keyboard funksiyasini chaqiramiz
        await ctx.reply(message, keyboards.driverFromRegionsKeyboard(user.language))
    }
}

// Chiqish viloyatini tanlash
const selectFromRegion = async (ctx, callbackData) => {
    const user = ctx.user
    const region = callbackData.replace('driver_from_', '')

    // Sessionni tekshirish va yaratish
    if (!ctx.session) {
        ctx.session = {}
    }
    if (!ctx.session.driverData) {
        ctx.session.driverData = {}
    }

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
    if (!ctx.session || !ctx.session.driverData) {
        ctx.session = ctx.session || {}
        ctx.session.driverData = ctx.session.driverData || {}
    }

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
    if (!ctx.session || !ctx.session.driverData) {
        ctx.session = ctx.session || {}
        ctx.session.driverData = ctx.session.driverData || {}
    }

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
    if (!ctx.session || !ctx.session.driverData) {
        ctx.session = ctx.session || {}
        ctx.session.driverData = ctx.session.driverData || {}
    }

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

    user.state = states.DRIVER_REG_CAR_MODEL
    await user.save()

    const message =
        user.language === 'uz'
            ? '🚗 Mashina modelini kiriting (masalan: Cobalt, Nexia 3, Malibu):'
            : '🚗 Введите модель машины (например: Cobalt, Nexia 3, Malibu):'

    await ctx.reply(message, {
        reply_markup: { remove_keyboard: true }
    })
}

// Mashina modelini saqlash
const saveCarModel = async (ctx, text) => {
    const user = ctx.user

    // Sessionni tekshirish
    if (!ctx.session || !ctx.session.driverData) {
        ctx.session = ctx.session || {}
        ctx.session.driverData = ctx.session.driverData || {}
    }

    if (text.length < 2) {
        const message =
            user.language === 'uz'
                ? "❌ Mashina modeli kamida 2 ta belgidan iborat bo'lishi kerak."
                : '❌ Модель машины должна содержать не менее 2 символов.'

        await ctx.reply(message)
        return
    }

    ctx.session.driverData.carModel = text

    user.state = states.DRIVER_REG_SERVICE_TYPE
    await user.save()

    const message =
        user.language === 'uz'
            ? "🎯 Qanday xizmat ko'rsatmoqchisiz? (bir nechtasini tanlash mumkin)"
            : '🎯 Какие услуги вы предоставляете? (можно выбрать несколько)'

    // Tanlangan xizmatlar bo'sh array bilan boshlaymiz
    const selectedServices = ctx.session.driverData.serviceType || []
    await ctx.reply(message, keyboards.serviceTypeKeyboard(user.language, selectedServices))
}

// Xizmat turini tanlash
const selectServiceType = async (ctx, callbackData) => {
    const user = ctx.user

    // Sessionni tekshirish
    if (!ctx.session || !ctx.session.driverData) {
        ctx.session = ctx.session || {}
        ctx.session.driverData = ctx.session.driverData || {}
    }

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
        selectedServices = ctx.session.driverData.serviceType
            .map(type => serviceNames[type])
            .join(', ')
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
    if (!ctx.session || !ctx.session.driverData) {
        ctx.session = ctx.session || {}
        ctx.session.driverData = ctx.session.driverData || {}
    }

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
    if (!ctx.session || !ctx.session.driverData) {
        ctx.session = ctx.session || {}
        ctx.session.driverData = ctx.session.driverData || {}
    }

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

    const message =
        user.language === 'uz'
            ? `📋 Ma'lumotlaringizni tekshiring:\n\n` +
              `📍 Chiqish: ${data.fromRegion}\n` +
              `📍 Kirish: ${data.toRegion}\n` +
              `👤 Ism-familiya: ${data.fullName}\n` +
              `📞 Telefon: ${data.phone}\n` +
              `🚗 Mashina: ${data.carModel}\n` +
              `🎯 Xizmatlar: ${services}\n` +
              `⏰ Jo'nash vaqti: ${data.departureTime}\n\n` +
              `Barchasi to'g'rimi?`
            : `📋 Проверьте ваши данные:\n\n` +
              `📍 Отправление: ${data.fromRegion}\n` +
              `📍 Прибытие: ${data.toRegion}\n` +
              `👤 Имя-фамилия: ${data.fullName}\n` +
              `📞 Телефон: ${data.phone}\n` +
              `🚗 Машина: ${data.carModel}\n` +
              `🎯 Услуги: ${services}\n` +
              `⏰ Время отправления: ${data.departureTime}\n\n` +
              `Все верно?`

    user.state = states.DRIVER_REG_CONFIRM
    await user.save()

    await ctx.reply(message, keyboards.confirmKeyboard(user.language))
}

// Profilni saqlash
const saveProfile = async ctx => {
    const user = ctx.user

    // Sessionni tekshirish
    if (!ctx.session || !ctx.session.driverData) {
        await ctx.reply("❌ Ma'lumotlar topilmadi. Iltimos, qaytadan boshlang.")
        user.state = states.MAIN_MENU
        await user.save()
        return
    }

    const data = ctx.session.driverData

    try {
        // Haydovchi yaratish
        const driver = new Driver({
            telegramId: user.telegramId,
            fullName: data.fullName,
            phone: data.phone,
            fromRegion: data.fromRegion,
            toRegion: data.toRegion,
            carModel: data.carModel,
            serviceType: data.serviceType,
            departureTime: data.departureTime,
            status: 'inactive', // To'lov qilinmaguncha inactive
            balance: 0,
            rating: 5.0,
            totalOrders: 0
        })

        await driver.save()

        // User rolini yangilash
        user.role = 'driver'
        user.state = states.MAIN_MENU
        await user.save()

        // To'lov haqida xabar
        const message =
            user.language === 'uz'
                ? '✅ Profilingiz saqlandi!\n\n' +
                  "💰 Xizmatni faollashtirish uchun oylik to'lov qilishingiz kerak:\n" +
                  "💳 100,000 so'm / oy\n\n" +
                  "To'lov qilganingizdan so'ng buyurtmalar olishni boshlaysiz."
                : '✅ Ваш профиль сохранен!\n\n' +
                  '💰 Для активации услуги необходимо оплатить ежемесячный платеж:\n' +
                  '💳 100,000 сум / месяц\n\n' +
                  'После оплаты вы начнете получать заказы.'

        await ctx.reply(message, {
            reply_markup: {
                inline_keyboard: [
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
        })

        // Session ni tozalash
        delete ctx.session.driverData
    } catch (error) {
        console.error('Save profile error:', error)
        console.error('Error details:', error.stack)

        const message =
            user.language === 'uz'
                ? "❌ Profilni saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
                : '❌ Ошибка при сохранении профиля. Пожалуйста, попробуйте еще раз.'

        await ctx.reply(message)
    }
}

// Haydovchi menusi
const showDriverMenu = async ctx => {
    const user = ctx.user

    const driver = await Driver.findOne({ telegramId: user.telegramId })

    if (!driver) {
        await ctx.reply("❌ Profil topilmadi. Iltimos, qaytadan ro'yxatdan o'ting.")
        return
    }

    const message =
        user.language === 'uz'
            ? `🚘 Haydovchi menyusi\n\n` +
              `👤 ${driver.fullName}\n` +
              `🚗 ${driver.carModel}\n` +
              `📍 ${driver.fromRegion} → ${driver.toRegion}\n` +
              `📊 Reyting: ${driver.rating}/5.0\n` +
              `📦 Buyurtmalar: ${driver.totalOrders}\n` +
              `💰 Balans: ${driver.balance} so'm\n` +
              `⏰ Obuna: ${
                  driver.paidUntil ? new Date(driver.paidUntil).toLocaleDateString('uz-UZ') : "Yo'q"
              }\n` +
              `🔔 Holat: ${driver.status === 'active' ? 'Faol' : 'Nofaol'}`
            : `🚘 Меню водителя\n\n` +
              `👤 ${driver.fullName}\n` +
              `🚗 ${driver.carModel}\n` +
              `📍 ${driver.fromRegion} → ${driver.toRegion}\n` +
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
                            ? '🔔 Holat: ' + (driver.status === 'active' ? 'Faol' : 'Nofaol')
                            : '🔔 Статус: ' + (driver.status === 'active' ? 'Активен' : 'Неактивен'),
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
const showInactiveDriverMenu = async (ctx, driver) => {
    const user = ctx.user

    const message =
        user.language === 'uz'
            ? `🚘 Haydovchi profili (Nofaol)\n\n` +
              `Sizning profilingiz faol emas. Buyurtma olish uchun to'lov qiling.\n\n` +
              `👤 ${driver.fullName}\n` +
              `🚗 ${driver.carModel}\n` +
              `📍 ${driver.fromRegion} → ${driver.toRegion}\n\n` +
              `💰 Oylik to'lov: 100,000 so'm`
            : `🚘 Профиль водителя (Неактивен)\n\n` +
              `Ваш профиль не активен. Оплатите, чтобы получать заказы.\n\n` +
              `👤 ${driver.fullName}\n` +
              `🚗 ${driver.carModel}\n` +
              `📍 ${driver.fromRegion} → ${driver.toRegion}\n\n` +
              `💰 Ежемесячный платеж: 100,000 сум`

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

    await ctx.reply(message, { reply_markup: keyboard })
}

module.exports = {
    startRegistration,
    selectFromRegion,
    selectToRegion,
    saveFullName,
    savePhone,
    saveCarModel,
    selectServiceType,
    selectDate,
    selectTime,
    showConfirmation,
    saveProfile,
    showDriverMenu,
    showInactiveDriverMenu,
    generateDateKeyboard,
    generateTimeKeyboard
}