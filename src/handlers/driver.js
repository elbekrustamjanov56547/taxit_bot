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

  const cleanedUsername = adminUsername
    .replace(/[^\w@]/g, '')
    .trim()

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
    return `💳 <b>Xizmatlardan foydalanish uchun to'lov qilishingiz kerak</b>\n\n` +
      `To'lov va boshqa savollar uchun admin bilan bog'laning:\n\n` +
      `👤 <b>Admin:</b> ${adminUsername}\n` +
      `⏱ <b>Ish vaqti:</b> 09:00 - 18:00\n\n` +
      `<b>Qanday to'lov qilish kerak:</b>\n` +
      `1. "Admin bilan gaplashish" tugmasini bosing\n` +
      `2. Telegramda admin bilan chat ochiladi\n` +
      `3. Adminga "To'lov qilmoqchiman" deb yozing\n` +
      `4. To'lov qiling va profilingiz faollashadi`
  } else {
    return `💳 <b>Для использования услуг необходимо оплатить</b>\n\n` +
      `По вопросам оплаты и другим вопросам свяжитесь с администратором:\n\n` +
      `👤 <b>Админ:</b> ${adminUsername}\n` +
      `⏱ <b>Время работы:</b> 09:00 - 18:00\n\n` +
      `<b>Как произвести оплату:</b>\n` +
      `1. Нажмите кнопку "Чат с админом"\n` +
      `2. В Telegram откроется чат с администратором\n` +
      `3. Напишите администратору "Хочу оплатить"\n` +
      `4. Оплатите и ваш профиль активируется`
  }
}

// Main payment function
const handleDriverPayment = async (ctx) => {
  console.log('🔵 handleDriverPayment FUNKSIYASI CHAQIRILDI')
  console.log('User:', ctx.user?.telegramId)
  
  try {
    const user = ctx.user
    
    if (!user) {
      console.log('❌ User not found')
      return
    }

    // Avval oldingi xabarni o'chirishga urinamiz
    try {
      if (ctx.callbackQuery?.message?.message_id) {
        await ctx.deleteMessage()
      }
    } catch (error) {
      console.log('Delete previous message error:', error.message)
    }

    // Oddiy payment xabarini chiqaramiz
    const message = getSimplePaymentMessage(user.language)
    const keyboard = createSimplePaymentKeyboard(user.language)

    console.log('📤 Xabar yuborilmoqda...')
    
    await ctx.reply(message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    })
    
    console.log('✅ Xabar muvaffaqiyatli yuborildi')
    
  } catch (error) {
    console.error('❌ handleDriverPayment da xatolik:', error)
    
    try {
      await ctx.reply(
        ctx.user?.language === 'uz' 
          ? '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.' 
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

  // Sessionni tekshirish
  if (!ctx.session || !ctx.session.driverData) {
    await ctx.reply(
      user.language === 'uz'
        ? "❌ Ma'lumotlar topilmadi. Iltimos, qaytadan boshlang."
        : '❌ Данные не найдены. Пожалуйста, начните заново.'
    )
    user.state = states.MAIN_MENU
    await user.save()
    return
  }

  const data = ctx.session.driverData

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
      createdAt: new Date(),
      registrationStep: 'completed'
    }

    // Agar carModel string bo'lsa va Model ObjectId talab qilsa
    let carModelForDriver = data.carModel
    if (data.carId) {
      carModelForDriver = data.carId
    } else {
      const existingCar = await Car.findOne({ name: data.carModel })
      if (existingCar) {
        carModelForDriver = existingCar._id
      } else {
        const newCar = new Car({
          name: data.carModel,
          nameRu: data.carModel,
          isActive: true
        })
        await newCar.save()
        carModelForDriver = newCar._id
      }
    }

    driverData.carModel = carModelForDriver

    const driver = new Driver(driverData)
    await driver.save()

    // User rolini yangilash
    user.role = 'driver'
    user.state = states.MAIN_MENU
    await user.save()

    // Muvaffaqiyatli xabar
    const successMessage =
      user.language === 'uz'
        ? `✅ <b>Tabriklaymiz! Profilingiz muvaffaqiyatli yaratildi!</b>\n\n` +
          `<b>Profil ma'lumotlari:</b>\n` +
          `👤 <b>Ism:</b> ${data.fullName}\n` +
          `📍 <b>Yo'nalish:</b> ${data.fromRegion} → ${data.toRegion}\n` +
          `🚗 <b>Mashina:</b> ${data.carModel}\n` +
          `👥 <b>Sig'im:</b> ${data.maxPassengers} kishi\n` +
          `🎯 <b>Xizmatlar:</b> ${data.serviceType.join(', ')}\n` +
          `⏰ <b>Jo'nash vaqti:</b> ${data.departureTime}\n\n` +
          `✅ Profilingiz yaratildi, endi to'lov qilish orqali faollashtirishingiz mumkin.`
        : `✅ <b>Поздравляем! Ваш профиль успешно создан!</b>\n\n` +
          `<b>Данные профиля:</b>\n` +
          `👤 <b>Имя:</b> ${data.fullName}\n` +
          `📍 <b>Направление:</b> ${data.fromRegion} → ${data.toRegion}\n` +
          `🚗 <b>Машина:</b> ${data.carModel}\n` +
          `👥 <b>Вместимость:</b> ${data.maxPassengers} человек\n` +
          `🎯 <b>Услуги:</b> ${data.serviceType.join(', ')}\n` +
          `⏰ <b>Время отправления:</b> ${data.departureTime}\n\n` +
          `✅ Ваш профиль создан, теперь вы можете активировать его, совершив оплату.`

    await ctx.reply(successMessage, { parse_mode: 'HTML' })

    // To'lov menyusini ko'rsatish
    setTimeout(async () => {
      await handleDriverPayment(ctx)
    }, 2000)

    // Sessionni tozalash
    delete ctx.session.driverData
  } catch (error) {
    console.error('Save profile error:', error)
    await ctx.reply(
      user.language === 'uz'
        ? `❌ Profilni saqlashda xatolik yuz berdi: ${error.message}\n\nIltimos, qayta urinib ko'ring.`
        : `❌ Ошибка при сохранении профиля: ${error.message}\n\nПожалуйста, попробуйте еще раз.`
    )
  }
}

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

  const message =
		user.language === 'uz'
			? `🚘 <b>Haydovchi profili (Nofaol)</b>\n\n` +
			  `<b>Sizning ma'lumotlaringiz:</b>\n` +
			  `👤 <b>Ism:</b> ${populatedDriver.fullName}\n` +
			  `🚗 <b>Mashina:</b> ${carModelInfo}${carTypeInfo}\n` +
			  `📍 <b>Yo'nalish:</b> ${populatedDriver.fromRegion} → ${populatedDriver.toRegion}\n` +
			  `👥 <b>Sig'im:</b> ${populatedDriver.maxPassengers} kishi\n\n` +
			  // `💳 <b>Holat:</b> Profilingiz faol emas\n` +
			  `💳 <b>Holat:</b> ${driver.status === 'faol' ? 'faol' : 'nofaol'}\n` +
			  (driver.status !== 'faol'
					? `📞 <b>Sabab:</b> Oylik to'lov amalga oshirilmagan\n\n`
					: '')`✅ <b>Qanday faollashtirish:</b>\n` +
			  `1. "To'lov qilish" tugmasini bosing\n` +
			  `2. Admin bilan Telegram chat ochiladi\n` +
			  `3. Adminga "To'lov qilmoqchiman" deb yozing\n` +
			  `4. To'lov qiling va profilingiz faollashadi`
			: `🚘 <b>Профиль водителя (Неактивен)</b>\n\n` +
			  `<b>Ваши данные:</b>\n` +
			  `👤 <b>Имя:</b> ${populatedDriver.fullName}\n` +
			  `🚗 <b>Машина:</b> ${carModelInfo}${carTypeInfo}\n` +
			  `📍 <b>Направление:</b> ${populatedDriver.fromRegion} → ${populatedDriver.toRegion}\n` +
			  `👥 <b>Вместимость:</b> ${populatedDriver.maxPassengers} человек\n\n` +
			  `💳 <b>Статус:</b> Ваш профиль не активен\n` +
			  `📞 <b>Причина:</b> Ежемесячный платеж не произведен\n\n` +
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
        },
        {
          text: user.language === 'uz' ? "📋 Ma'lumotlar" : '📋 Информация',
          callback_data: 'driver_info'
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
const showCarSelection = async ctx => {
  const user = ctx.user

  const cars = await Car.find({ isActive: true }).sort({ name: 1 })

  if (cars.length === 0) {
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

  const keyboardButtons = []

  for (let i = 0; i < cars.length; i += 3) {
    const row = []

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

  ctx.session = ctx.session || {}
  ctx.session.driverData = ctx.session.driverData || {}

  const carId = callbackData.replace('car_select_', '')
  const car = await Car.findById(carId)

  if (!car) {
    await ctx.reply(
      user.language === 'uz' ? '❌ Mashina modeli topilmadi' : '❌ Модель машины не найдена'
    )
    await showCarSelection(ctx)
    return
  }

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

  await selectCarType(ctx)
}

// Mashina modelini qo'lda kiritish
const saveCarModel = async (ctx, text) => {
  const user = ctx.user

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

  ctx.session.driverData.carModel = text

  user.state = states.DRIVER_REG_CAR_TYPE
  await user.save()

  await selectCarType(ctx)
}

// Mashina turini tanlash
const selectCarType = async ctx => {
  const user = ctx.user

  const carTypes = await CarType.find({ isActive: true }).sort({ name: 1 })

  if (carTypes.length === 0) {
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

// Mashina turini tanlash callback
const selectCarTypeCallback = async (ctx, callbackData) => {
  const user = ctx.user

  ctx.session = ctx.session || {}
  ctx.session.driverData = ctx.session.driverData || {}

  if (callbackData === 'car_type_skip') {
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

    await showDateTimeSelection(ctx)
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
      ? "📅 Jo'nash sanasini tanlang (keyingi 7 kun):"
      : '📅 Выберите дату отправления (следующие 7 дней):'

  await ctx.reply(message, generateDateKeyboard(user.language))
}

const selectDate = async (ctx, callbackData) => {
  const user = ctx.user
  const dateStr = callbackData.replace('date_', '')

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

  await ctx.reply(message, generateTimeKeyboard(user.language))
}

const selectTime = async (ctx, callbackData) => {
  const user = ctx.user
  const timeStr = callbackData.replace('time_', '')

  ctx.session = ctx.session || {}
  ctx.session.driverData = ctx.session.driverData || {}

  const selectedDate = ctx.session.selectedDate
  const date = new Date(selectedDate)
  const formattedDate = date.toLocaleDateString(user.language === 'uz' ? 'uz-UZ' : 'ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  ctx.session.driverData.departureTime = `${formattedDate}, ${timeStr}`

  delete ctx.session.selectedDate

  await showConfirmation(ctx)
}

// ====================== TASDIQLASH VA PROFIL SAQLASH ======================
const showConfirmation = async ctx => {
  const user = ctx.user

  if (!ctx.session || !ctx.session.driverData) {
    await ctx.reply("❌ Ma'lumotlar topilmadi. Iltimos, qaytadan boshlang.")
    user.state = states.MAIN_MENU
    await user.save()
    return
  }

  const data = ctx.session.driverData

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

  const carTypeInfo = data.carTypeName
    ? `\n🚗 Mashina turi: ${user.language === 'uz' ? data.carTypeName : data.carTypeNameRu}`
    : ''

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

// ====================== HAYDOVCHI MENYUSI ======================
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

// ====================== PROFIL TAHRIRLASH FUNKSIYALARI ======================
const showDriverEditMenu = async (ctx) => {
  const user = ctx.user
  
  const driver = await Driver.findOne({ telegramId: user.telegramId })
  
  if (!driver) {
    await ctx.reply(
      user.language === 'uz' 
        ? '❌ Profil topilmadi' 
        : '❌ Профиль не найден'
    )
    return
  }
  
  const message = user.language === 'uz'
    ? `✏️ <b>Profil tahrirlash</b>\n\n` +
      `Qaysi ma'lumotni tahrirlamoqchisiz?`
    : `✏️ <b>Редактирование профиля</b>\n\n` +
      `Какую информацию вы хотите редактировать?`
  
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
          text: user.language === 'uz' ? '👥 Yo\'lovchilar soni' : '👥 Количество пассажиров',
          callback_data: 'edit_passengers'
        },
        {
          text: user.language === 'uz' ? '📍 Yo\'nalish' : '📍 Направление',
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
          text: user.language === 'uz' ? '⏰ Jo\'nash vaqti' : '⏰ Время отправления',
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

const editFullName = async (ctx) => {
  const user = ctx.user
  
  user.state = states.DRIVER_EDIT_FULLNAME
  await user.save()
  
  const message = user.language === 'uz'
    ? '👤 Yangi ism-familiyangizni kiriting:'
    : '👤 Введите новое имя и фамилию:'
  
  await ctx.reply(message)
}

const editPhone = async (ctx) => {
  const user = ctx.user
  
  user.state = states.DRIVER_EDIT_PHONE
  await user.save()
  
  const message = user.language === 'uz'
    ? '📞 Yangi telefon raqamingizni yuboring (yoki +998XXXXXXXXX formatida yozing):'
    : '📞 Отправьте новый номер телефона (или напишите в формате +998XXXXXXXXX):'
  
  await ctx.reply(message, {
    reply_markup: {
      keyboard: [
        [
          {
            text: user.language === 'uz' ? '📞 Telefon raqamini yuborish' : '📞 Отправить номер телефона',
            request_contact: true
          }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  })
}

const editCar = async (ctx) => {
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
    
    const currentCarMessage = user.language === 'uz'
      ? `🚗 Joriy mashina: ${currentCarName}\n\n`
      : `🚗 Текущая машина: ${currentCarName}\n\n`
    
    await ctx.reply(currentCarMessage + (user.language === 'uz'
      ? 'Yangi mashina modelini tanlang:'
      : 'Выберите новую модель машины:'))
  } else {
    await ctx.reply(user.language === 'uz'
      ? '🚗 Mashina modelini tanlang:'
      : '🚗 Выберите модель машины:')
  }
  
  await showCarSelection(ctx)
}

const editPassengers = async (ctx) => {
  const user = ctx.user
  
  const driver = await Driver.findOne({ telegramId: user.telegramId })
  
  if (driver) {
    const currentPassengers = user.language === 'uz'
      ? `👥 Joriy yo'lovchilar soni: ${driver.maxPassengers} kishi\n\n`
      : `👥 Текущее количество пассажиров: ${driver.maxPassengers} человек\n\n`
    
    await ctx.reply(currentPassengers + (user.language === 'uz'
      ? 'Yangi maksimal yo\'lovchilar sonini tanlang:'
      : 'Выберите новое максимальное количество пассажиров:'),
      keyboards.maxPassengersKeyboard(user.language))
    
    user.state = states.DRIVER_EDIT_PASSENGERS
    await user.save()
  }
}

const editRoute = async (ctx) => {
  const user = ctx.user
  
  user.state = states.DRIVER_EDIT_ROUTE_FROM
  await user.save()
  
  const driver = await Driver.findOne({ telegramId: user.telegramId })
  
  if (driver) {
    const currentRoute = user.language === 'uz'
      ? `📍 Joriy yo'nalish: ${driver.fromRegion} → ${driver.toRegion}\n\n`
      : `📍 Текущее направление: ${driver.fromRegion} → ${driver.toRegion}\n\n`
    
    await ctx.reply(currentRoute + (user.language === 'uz'
      ? 'Yangi chiqish viloyatini tanlang:'
      : 'Выберите новый регион отправления:'),
      keyboards.driverFromRegionsKeyboard(user.language))
  } else {
    await ctx.reply(user.language === 'uz'
      ? '📍 Chiqish viloyatini tanlang:'
      : '📍 Выберите регион отправления:',
      keyboards.driverFromRegionsKeyboard(user.language))
  }
}

const editServices = async (ctx) => {
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
    
    const currentMessage = user.language === 'uz'
      ? `🎯 Joriy xizmatlar: ${currentServices}\n\n`
      : `🎯 Текущие услуги: ${currentServices}\n\n`
    
    await ctx.reply(currentMessage + (user.language === 'uz'
      ? 'Yangi xizmat turlarini tanlang (bir nechtasini tanlash mumkin):'
      : 'Выберите новые типы услуг (можно выбрать несколько):'),
      keyboards.serviceTypeKeyboard(user.language, driver.serviceType || []))
    
    user.state = states.DRIVER_EDIT_SERVICES
    await user.save()
  }
}

const editTime = async (ctx) => {
  const user = ctx.user
  
  user.state = states.DRIVER_EDIT_TIME_DATE
  await user.save()
  
  const driver = await Driver.findOne({ telegramId: user.telegramId })
  
  if (driver && driver.departureTime) {
    const currentTime = user.language === 'uz'
      ? `⏰ Joriy jo'nash vaqti: ${driver.departureTime}\n\n`
      : `⏰ Текущее время отправления: ${driver.departureTime}\n\n`
    
    await ctx.reply(currentTime + (user.language === 'uz'
      ? 'Yangi jo\'nash sanasini tanlang (keyingi 7 kun):'
      : 'Выберите новую дату отправления (следующие 7 дней):'),
      generateDateKeyboard(user.language))
  } else {
    await ctx.reply(user.language === 'uz'
      ? '📅 Jo\'nash sanasini tanlang (keyingi 7 kun):'
      : '📅 Выберите дату отправления (следующие 7 дней):',
      generateDateKeyboard(user.language))
  }
}

const saveEditedFullName = async (ctx, text) => {
  const user = ctx.user
  
  if (text.length < 3) {
    await ctx.reply(user.language === 'uz'
      ? "❌ Ism-familya kamida 3 ta belgidan iborat bo'lishi kerak."
      : '❌ Имя и фамилия должны содержать не менее 3 символов.')
    return
  }
  
  const driver = await Driver.findOne({ telegramId: user.telegramId })
  if (driver) {
    driver.fullName = text
    await driver.save()
    
    await ctx.reply(user.language === 'uz'
      ? `✅ Ism-familiya muvaffaqiyatli o'zgartirildi: ${text}`
      : `✅ Имя и фамилия успешно изменены: ${text}`)
    
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
    await ctx.reply(user.language === 'uz'
      ? "❌ Telefon raqami noto'g'ri formatda. +998XXXXXXXXX formatida kiriting."
      : '❌ Неверный формат номера телефона. Введите в формате +998XXXXXXXXX.')
    return
  }
  
  const driver = await Driver.findOne({ telegramId: user.telegramId })
  if (driver) {
    driver.phone = formattedPhone
    await driver.save()
    
    await ctx.reply(user.language === 'uz'
      ? `✅ Telefon raqami muvaffaqiyatli o'zgartirildi: ${formattedPhone}`
      : `✅ Номер телефона успешно изменен: ${formattedPhone}`)
    
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
    
    await ctx.reply(user.language === 'uz'
      ? `✅ Maksimal yo'lovchilar soni muvaffaqiyatli o'zgartirildi: ${maxPassengers} kishi`
      : `✅ Максимальное количество пассажиров успешно изменено: ${maxPassengers} человек`)
    
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
  
  await ctx.reply(user.language === 'uz'
    ? `📍 Chiqish: ${region}\n\nYangi kirish viloyatini tanlang:`
    : `📍 Отправление: ${region}\n\nВыберите новый регион прибытия:`,
    keyboards.driverToRegionsKeyboard(user.language))
}

const saveEditedRouteTo = async (ctx, callbackData) => {
  const user = ctx.user
  const region = callbackData.replace('driver_to_', '')
  
  const fromRegion = ctx.session?.editedRoute?.fromRegion
  
  if (!fromRegion) {
    await ctx.reply(user.language === 'uz'
      ? '❌ Xatolik yuz berdi. Iltimos, qaytadan boshlang.'
      : '❌ Произошла ошибка. Пожалуйста, начните заново.')
    return
  }
  
  const driver = await Driver.findOne({ telegramId: user.telegramId })
  if (driver) {
    driver.fromRegion = fromRegion
    driver.toRegion = region
    await driver.save()
    
    await ctx.reply(user.language === 'uz'
      ? `✅ Yo'nalish muvaffaqiyatli o'zgartirildi: ${fromRegion} → ${region}`
      : `✅ Направление успешно изменено: ${fromRegion} → ${region}`)
    
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
      await ctx.reply(user.language === 'uz'
        ? '❌ Kamida bitta xizmat turini tanlashingiz kerak.'
        : '❌ Вы должны выбрать хотя бы один тип услуги.')
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
      
      await ctx.reply(user.language === 'uz'
        ? `✅ Xizmat turlari muvaffaqiyatli o'zgartirildi: ${servicesText}`
        : `✅ Типы услуг успешно изменены: ${servicesText}`)
      
      delete ctx.session.editedServices
      
      user.state = states.MAIN_MENU
      await user.save()
      
      await showDriverMenu(ctx)
    }
  } else {
    const serviceType = callbackData.replace('service_', '')
    
    if (ctx.session.editedServices.includes(serviceType)) {
      ctx.session.editedServices = ctx.session.editedServices.filter(
        type => type !== serviceType
      )
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
    
    const message = user.language === 'uz'
      ? `🎯 Tanlangan xizmatlar: ${selectedServices || 'Hali tanlanmagan'}\n\nQo'shimcha xizmat tanlash yoki "Tayyor" tugmasini bosing:`
      : `🎯 Выбранные услуги: ${selectedServices || 'Еще не выбрано'}\n\nВыберите дополнительные услуги или нажмите "Готово":`
    
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
    
    await ctx.reply(user.language === 'uz'
      ? `✅ Mashina modeli muvaffaqiyatli o'zgartirildi: ${car.name}`
      : `✅ Модель машины успешно изменена: ${car.nameRu}`)
    
    user.state = states.MAIN_MENU
    await user.save()
    
    await showDriverMenu(ctx)
  }
}

// Vaqtni saqlash (edit uchun)
const saveEditedTime = async (ctx, callbackData) => {
  const user = ctx.user
  const timeStr = callbackData.replace('time_', '')
  
  ctx.session = ctx.session || {}
  const selectedDate = ctx.session.selectedDate
  
  if (!selectedDate) {
    await ctx.reply(user.language === 'uz'
      ? '❌ Xatolik yuz berdi. Iltimos, qaytadan boshlang.'
      : '❌ Произошла ошибка. Пожалуйста, начните заново.')
    return
  }
  
  const date = new Date(selectedDate)
  const formattedDate = date.toLocaleDateString(user.language === 'uz' ? 'uz-UZ' : 'ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  const driver = await Driver.findOne({ telegramId: user.telegramId })
  if (driver) {
    driver.departureTime = `${formattedDate}, ${timeStr}`
    await driver.save()
    
    delete ctx.session.selectedDate
    
    await ctx.reply(user.language === 'uz'
      ? `✅ Jo'nash vaqti muvaffaqiyatli o'zgartirildi: ${formattedDate}, ${timeStr}`
      : `✅ Время отправления успешно изменено: ${formattedDate}, ${timeStr}`)
    
    user.state = states.MAIN_MENU
    await user.save()
    
    await showDriverMenu(ctx)
  }
}

// ====================== MODULE EXPORTS ======================
module.exports = {
  // Asosiy funksiyalar
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
  saveProfile: saveProfileWithPayment,

  // Haydovchi menyusi
  showDriverMenu,
  showInactiveDriverMenu,

  // To'lov funksiyalari
  handleDriverPayment,
  createSimplePaymentKeyboard,
  getSimplePaymentMessage,
  validateAndFormatAdminUsername,
  createAdminChatLink,

  // Profil tahrirlash funksiyalari
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
  saveEditedTime
}