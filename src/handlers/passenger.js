const Order = require('../models/Order')
const Driver = require('../models/Driver')
const User = require('../models/User')
const states = require('../utils/states')
const keyboards = require('../keyboards/main')
const regionKeyboards = require('../keyboards/regions')

module.exports = {
	// passengerHandler.js faylida startOrder funksiyasini quyidagicha o'zgartiramiz:

	startOrder: async ctx => {
		const user = ctx.user

		console.log('🚕 ========== startOrder FUNKSIYASI BOSHLANDI ==========')
		console.log('👤 User before state change:', user.state)
		console.log('👤 User:', user.telegramId)
		console.log('👤 User role:', user.role)
		console.log('👤 User state before:', user.state)

		// Agar driver bo'lsa, xabar berish
		if (user.role === 'driver') {
			console.log('❌ User is driver, cannot order taxi')
			await ctx.reply(
				user.language === 'uz'
					? '❌ Siz haydovchisiz. Siz taxi buyurtma qila olmaysiz.'
					: '❌ Вы водитель. Вы не можете заказать такси.'
			)
			return
		}

		// State ni o'zgartirish
		user.state = states.PASSENGER_FROM_REGION
		await user.save()

		console.log('👤 User state after:', user.state)

		// User rolini 'user' qilib o'rnatamiz (agar allaqachon bo'lmasa)
		if (user.role !== 'user') {
			user.role = 'user'
			await user.save()
			console.log('✅ User role updated to:', user.role)
		}

		const message =
			user.language === 'uz'
				? "📍 Qaysi viloyatdan jo'namoqchisiz?"
				: '📍 Из какого региона выезжаете?'

		console.log('🔄 Getting fromRegionsKeyboard...')

		try {
			// regionKeyboards mavjudligini tekshirish
			const regionKeyboards = require('../keyboards/regions')

			if (!regionKeyboards) {
				throw new Error('regionKeyboards not found')
			}

			if (!regionKeyboards.fromRegionsKeyboard) {
				throw new Error('fromRegionsKeyboard function not found')
			}

			const keyboard = regionKeyboards.fromRegionsKeyboard(user.language)
			console.log('✅ Keyboard generated')

			// Xabarni yuborish (to'g'ri formatda)
			const sentMessage = await ctx.reply(message, {
				reply_markup: keyboard
			})

			console.log('✅ Message sent with keyboard, message ID:', sentMessage.message_id)
		} catch (error) {
			console.error('❌ Error in startOrder:', error)
			console.error('❌ Error stack:', error.stack)

			// Xatolik haqida foydalanuvchiga xabar berish
			await ctx.reply(
				user.language === 'uz'
					? "❌ Viloyat tanlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
					: '❌ Ошибка при выборе региона. Пожалуйста, попробуйте еще раз.'
			)

			// Asosiy menyuga qaytish
			user.state = states.MAIN_MENU
			await user.save()

			// Asosiy menyuni ko'rsatish
			const keyboards = require('../keyboards/main')
			await ctx.reply(
				user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
				keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role)
			)
		}

		console.log('🚕 ========== startOrder FUNKSIYASI TUGADI ==========')
	},
	// passengerHandler.js faylida selectFromRegion funksiyasini quyidagicha o'zgartiramiz:

	selectFromRegion: async (ctx, callbackData) => {
		const user = ctx.user
		const region = callbackData.replace('from_', '')

		console.log('📍 ========== selectFromRegion START ==========')
		console.log('📍 Region selected:', region)
		console.log('👤 User state before:', user.state)
		console.log('📊 Callback data:', callbackData)

		// Session ga to'g'ri saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.fromRegion = region

		console.log('📝 Session orderData:', ctx.session.orderData)

		// State ni o'zgartirish
		user.state = states.PASSENGER_TO_REGION
		await user.save()

		console.log('👤 User state after:', user.state)

		const message =
			user.language === 'uz'
				? `📍 Chiqish: ${region}\n\nQaysi viloyatga borasiz?`
				: `📍 Отправление: ${region}\n\nВ какой регион едете?`

		console.log('🔄 Getting toRegionsKeyboard...')

		try {
			// regionKeyboards modulini import qilish
			const regionKeyboards = require('../keyboards/regions')

			if (!regionKeyboards) {
				throw new Error('regionKeyboards module not found')
			}

			if (!regionKeyboards.toRegionsKeyboard) {
				console.error('❌ toRegionsKeyboard function not found!')
				console.log('❌ Available functions:', Object.keys(regionKeyboards))
				throw new Error('toRegionsKeyboard function not found')
			}

			const keyboard = regionKeyboards.toRegionsKeyboard(user.language)
			console.log('✅ Keyboard generated:', JSON.stringify(keyboard, null, 2))

			// Xabarni yuborish
			console.log('📤 Sending message...')
			await ctx.reply(message, {
				reply_markup: keyboard
			})

			console.log('✅ Message sent successfully')
		} catch (error) {
			console.error('❌ Error in selectFromRegion:', error)
			console.error('❌ Error stack:', error.stack)

			// Xatolik haqida foydalanuvchiga xabar berish
			await ctx.reply(
				user.language === 'uz'
					? "❌ Viloyat tanlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
					: '❌ Ошибка при выборе региона. Пожалуйста, попробуйте еще раз.'
			)
		}

		console.log('📍 ========== selectFromRegion END ==========')
	},
	// Kirish viloyatini tanlash
	selectToRegion: async (ctx, callbackData) => {
		const user = ctx.user
		const region = callbackData.replace('to_', '')

		// Session ga saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.toRegion = region

		// Yo'lovchilar sonini tanlashga o'tish
		user.state = states.PASSENGER_PASSENGER_COUNT
		await user.save()

		const message =
			user.language === 'uz'
				? `📍 Kirish: ${region}\n\n👥 Necha kishi ketasiz?`
				: `📍 Прибытие: ${region}\n\n👥 Сколько человек едет?`

		await ctx.reply(message, keyboards.passengerCountKeyboard(user.language))
	},

	// Yo'lovchilar sonini tanlash
	selectPassengerCount: async (ctx, callbackData) => {
		const user = ctx.user
		const passengerCount = parseInt(callbackData.replace('passengers_', ''))

		// Session ga saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.passengerCount = passengerCount

		user.state = states.PASSENGER_PARCEL
		await user.save()

		const message =
			user.language === 'uz'
				? `👥 Yo'lovchilar soni: ${passengerCount} kishi\n\n📦 Pochta yoki yuk bormi?`
				: `👥 Количество пассажиров: ${passengerCount} человек\n\n📦 Есть посылка или груз?`

		await ctx.reply(message, keyboards.parcelKeyboard(user.language))
	},

	// Pochta tanlash (YANGILANGAN)
	selectParcel: async (ctx, callbackData) => {
		const user = ctx.user
		const hasParcel = callbackData === 'parcel_yes'

		// Session ga saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.hasParcel = hasParcel

		if (hasParcel) {
			user.state = states.PASSENGER_PARCEL_DESC
			await user.save()

			const message =
				user.language === 'uz'
					? "📝 Pochta/yuk haqida qisqacha ma'lumot bering:"
					: '📝 Кратко опишите посылку/груз:'

			await ctx.reply(message)
		} else {
			// Pochta yo'q deb tanlaganda, telefon raqamini so'rash
			ctx.session.orderData.parcelDescription = ''
			await module.exports.askPassengerPhone(ctx, ctx.session.orderData)
		}
	},

	// Pochta tavsifini saqlash (YANGILANGAN)
	saveParcelDescription: async (ctx, text) => {
		const user = ctx.user

		// Session ga saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.parcelDescription = text

		// Pochta tavsifi kiritilgandan so'ng, telefon raqamini so'rash
		await module.exports.askPassengerPhone(ctx, ctx.session.orderData)
	},

	// ====================== YO'LOVCHI TELEFON RAQAMINI SO'RASH ======================
	askPassengerPhone: async (ctx, orderData) => {
		const user = ctx.user

		// Sessionga orderData ni saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		Object.assign(ctx.session.orderData, orderData)

		// State ni o'zgartirish
		user.state = states.PASSENGER_PHONE
		await user.save()

		const message =
			user.language === 'uz'
				? `📋 Buyurtma ma'lumotlari:\n\n` +
				  `📍 Chiqish: ${orderData.fromRegion}\n` +
				  `📍 Kirish: ${orderData.toRegion}\n` +
				  `👥 Yo'lovchilar: ${orderData.passengerCount} kishi\n` +
				  `📦 Pochta: ${orderData.hasParcel ? 'Ha' : "Yo'q"}\n` +
				  `${
						orderData.parcelDescription ? `📝 Tavsif: ${orderData.parcelDescription}\n` : ''
				  }\n\n` +
				  `📞 <b>Telefon raqamingizni yuboring:</b>\n` +
				  `(yoki +998XXXXXXXXX formatida yozing)`
				: `📋 Данные заказа:\n\n` +
				  `📍 Отправление: ${orderData.fromRegion}\n` +
				  `📍 Прибытие: ${orderData.toRegion}\n` +
				  `👥 Пассажиры: ${orderData.passengerCount} человек\n` +
				  `📦 Посылка: ${orderData.hasParcel ? 'Да' : 'Нет'}\n` +
				  `${
						orderData.parcelDescription ? `📝 Описание: ${orderData.parcelDescription}\n` : ''
				  }\n\n` +
				  `📞 <b>Отправьте номер телефона:</b>\n` +
				  `(или напишите в формате +998XXXXXXXXX)`

		const keyboard = {
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
					],
					[
						{
							text: user.language === 'uz' ? '⬅️ Orqaga' : '⬅️ Назад',
							callback_data: 'back_to_order'
						}
					]
				],
				resize_keyboard: true,
				one_time_keyboard: true
			}
		}

		await ctx.reply(message, {
			...keyboard,
			parse_mode: 'HTML'
		})
	},

	// ====================== YO'LOVCHI TELEFON RAQAMINI SAQLASH ======================
	savePassengerPhoneForOrder: async (ctx, phone) => {
		const user = ctx.user

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
					? "❌ Telefon raqami noto'g'ri formatda.\n\n" +
					  "✅ To'g'ri format: +998XXXXXXXXX\n" +
					  '📝 Masalan: +998901234567\n\n' +
					  'Iltimos, qaytadan kiriting:'
					: '❌ Неверный формат номера телефона.\n\n' +
					  '✅ Правильный формат: +998XXXXXXXXX\n' +
					  '📝 Например: +998901234567\n\n' +
					  'Пожалуйста, введите еще раз:'

			await ctx.reply(message)
			return false
		}

		// Sessionga telefon raqamini saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.phone = formattedPhone

		// User profilini yangilash (agar kerak bo'lsa)
		if (!user.phone || user.phone !== formattedPhone) {
			user.phone = formattedPhone
			await user.save()
		}

		// Tasdiqlash sahifasiga o'tish
		await module.exports.showOrderConfirmation(ctx)

		return true
	},

	// passenger.js fayliga quyidagi funksiyalarni qo'shing:

	// ====================== BUYURTMA TASDIQLASH OYNASI ======================
	showOrderConfirmation: async ctx => {
		const user = ctx.user

		// Session ma'lumotlarini olish
		ctx.session = ctx.session || {}
		const orderData = ctx.session.orderData || {}

		if (
			!orderData.fromRegion ||
			!orderData.toRegion ||
			!orderData.passengerCount ||
			!orderData.phone
		) {
			const message =
				user.language === 'uz'
					? "❌ Barcha ma'lumotlar to'liq emas. Iltimos, qaytadan boshlang."
					: '❌ Не все данные заполнены. Пожалуйста, начните сначала.'

			await ctx.reply(message)
			user.state = states.MAIN_MENU
			await user.save()
			return
		}

		const message =
			user.language === 'uz'
				? `✅ <b>Buyurtma ma'lumotlari:</b>\n\n` +
				  `📍 <b>Chiqish:</b> ${orderData.fromRegion}\n` +
				  `📍 <b>Kirish:</b> ${orderData.toRegion}\n` +
				  `👥 <b>Yo'lovchilar:</b> ${orderData.passengerCount} kishi\n` +
				  `📞 <b>Telefon:</b> ${orderData.phone}\n` +
				  `📦 <b>Pochta:</b> ${orderData.hasParcel ? 'Ha' : "Yo'q"}\n` +
				  `${
						orderData.parcelDescription ? `📝 <b>Tavsif:</b> ${orderData.parcelDescription}\n` : ''
				  }\n\n` +
				  `🔄 Barcha ma'lumotlar to'g'rimi?`
				: `✅ <b>Данные заказа:</b>\n\n` +
				  `📍 <b>Отправление:</b> ${orderData.fromRegion}\n` +
				  `📍 <b>Прибытие:</b> ${orderData.toRegion}\n` +
				  `👥 <b>Пассажиры:</b> ${orderData.passengerCount} человек\n` +
				  `📞 <b>Телефон:</b> ${orderData.phone}\n` +
				  `📦 <b>Посылка:</b> ${orderData.hasParcel ? 'Да' : 'Нет'}\n` +
				  `${
						orderData.parcelDescription
							? `📝 <b>Описание:</b> ${orderData.parcelDescription}\n`
							: ''
				  }\n\n` +
				  `🔄 Все данные верны?`

		const keyboard = {
			inline_keyboard: [
				[
					{
						text: user.language === 'uz' ? '✅ Tasdiqlash' : '✅ Подтвердить',
						callback_data: 'confirm_final_order'
					},
					{
						text: user.language === 'uz' ? '❌ Bekor qilish' : '❌ Отменить',
						callback_data: 'cancel_order'
					}
				]
			]
		}

		user.state = states.PASSENGER_CONFIRM
		await user.save()

		await ctx.reply(message, {
			reply_markup: keyboard,
			parse_mode: 'HTML'
		})
	},

	// ====================== BUYURTMANI TAHRILLASH ======================
	editOrder: async ctx => {
		const user = ctx.user

		try {
			await ctx.answerCbQuery()
		} catch (cbError) {
			console.log('⚠️ answerCbQuery error:', cbError.message)
		}

		// Tahrirlash menyusini ko'rsatish
		const editMessage =
			user.language === 'uz'
				? `✏️ <b>Buyurtmani tahrirlash</b>\n\n` + `Qaysi ma'lumotni o'zgartirmoqchisiz?`
				: `✏️ <b>Редактировать заказ</b>\n\n` + `Какую информацию вы хотите изменить?`

		const editKeyboard = {
			inline_keyboard: [
				[
					{
						text: user.language === 'uz' ? '📍 Chiqish viloyati' : '📍 Отправление',
						callback_data: 'edit_from_region'
					},
					{
						text: user.language === 'uz' ? '📍 Kirish viloyati' : '📍 Прибытие',
						callback_data: 'edit_to_region'
					}
				],
				[
					{
						text: user.language === 'uz' ? "👥 Yo'lovchilar soni" : '👥 Пассажиры',
						callback_data: 'edit_passenger_count'
					},
					{
						text: user.language === 'uz' ? '📞 Telefon raqam' : '📞 Телефон',
						callback_data: 'edit_phone'
					}
				],
				[
					{
						text: user.language === 'uz' ? "📦 Pochta ma'lumoti" : '📦 Посылка',
						callback_data: 'edit_parcel'
					}
				],
				[
					{
						text: user.language === 'uz' ? '⬅️ Ortga' : '⬅️ Назад',
						callback_data: 'back_to_confirmation'
					}
				]
			]
		}

		await ctx.reply(editMessage, {
			reply_markup: editKeyboard,
			parse_mode: 'HTML'
		})
	},

	// ====================== CHIQISH VILOYATINI TAHRILLASH ======================
	editFromRegion: async ctx => {
		const user = ctx.user

		try {
			await ctx.answerCbQuery()
		} catch (cbError) {
			console.log('⚠️ answerCbQuery error:', cbError.message)
		}

		user.state = states.PASSENGER_EDIT_FROM_REGION
		await user.save()

		const message =
			user.language === 'uz'
				? '📍 Yangi chiqish viloyatini tanlang:'
				: '📍 Выберите новый регион отправления:'

		const regionKeyboards = require('../keyboards/regions')
		await ctx.reply(message, regionKeyboards.fromRegionsKeyboard(user.language))
	},

	// ====================== KIRISH VILOYATINI TAHRILLASH ======================
	editToRegion: async ctx => {
		const user = ctx.user

		try {
			await ctx.answerCbQuery()
		} catch (cbError) {
			console.log('⚠️ answerCbQuery error:', cbError.message)
		}

		user.state = states.PASSENGER_EDIT_TO_REGION
		await user.save()

		const message =
			user.language === 'uz'
				? '📍 Yangi kirish viloyatini tanlang:'
				: '📍 Выберите новый регион прибытия:'

		const regionKeyboards = require('../keyboards/regions')
		await ctx.reply(message, regionKeyboards.toRegionsKeyboard(user.language))
	},

	// ====================== YO'LOVCHILAR SONINI TAHRILLASH ======================
	editPassengerCount: async ctx => {
		const user = ctx.user

		try {
			await ctx.answerCbQuery()
		} catch (cbError) {
			console.log('⚠️ answerCbQuery error:', cbError.message)
		}

		user.state = states.PASSENGER_EDIT_PASSENGER_COUNT
		await user.save()

		const message =
			user.language === 'uz'
				? "👥 Yangi yo'lovchilar sonini tanlang:"
				: '👥 Выберите новое количество пассажиров:'

		await ctx.reply(message, keyboards.passengerCountKeyboard(user.language))
	},

	// ====================== TELEFON RAQAMNI TAHRILLASH ======================
	editPhone: async ctx => {
		const user = ctx.user

		try {
			await ctx.answerCbQuery()
		} catch (cbError) {
			console.log('⚠️ answerCbQuery error:', cbError.message)
		}

		user.state = states.PASSENGER_EDIT_PHONE
		await user.save()

		const message =
			user.language === 'uz'
				? '📞 Yangi telefon raqamingizni kiriting (yoki +998XXXXXXXXX formatida yozing):\n\n' +
				  "Yoki 'Telefon raqamini yuborish' tugmasini bosing."
				: '📞 Введите новый номер телефона (или напишите в формате +998XXXXXXXXX):\n\n' +
				  'Или нажмите кнопку "Отправить номер телефона".'

		const keyboard = {
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
					],
					[
						{
							text: user.language === 'uz' ? '⬅️ Ortga' : '⬅️ Назад',
							callback_data: 'back_to_edit_menu'
						}
					]
				],
				resize_keyboard: true,
				one_time_keyboard: true
			}
		}

		await ctx.reply(message, keyboard)
	},

	// ====================== POCHTA MA'LUMOTINI TAHRILLASH ======================
	editParcel: async ctx => {
		const user = ctx.user

		try {
			await ctx.answerCbQuery()
		} catch (cbError) {
			console.log('⚠️ answerCbQuery error:', cbError.message)
		}

		user.state = states.PASSENGER_EDIT_PARCEL
		await user.save()

		const message =
			user.language === 'uz'
				? "📦 Pochta yoki yuk ma'lumotlarini yangilang:\n\n" +
				  "Avval pochta/yuk borligini tanlang, so'ng tavsifini kiriting:"
				: '📦 Обновите информацию о посылке/грузе:\n\n' +
				  'Сначала выберите наличие посылки, затем введите описание:'

		await ctx.reply(message, keyboards.parcelKeyboard(user.language))
	},

	// ====================== ORTGA QAYTISH (TASDIQLASHGA) ======================
	backToConfirmation: async ctx => {
		const user = ctx.user

		try {
			await ctx.answerCbQuery()
		} catch (cbError) {
			console.log('⚠️ answerCbQuery error:', cbError.message)
		}

		// Tasdiqlash sahifasiga qaytish
		await module.exports.showOrderConfirmation(ctx)
	},

	// ====================== ORTGA QAYTISH (TAHRILLASH MENYUSIGA) ======================
	backToEditMenu: async ctx => {
		const user = ctx.user

		try {
			await ctx.answerCbQuery()
		} catch (cbError) {
			console.log('⚠️ answerCbQuery error:', cbError.message)
		}

		// Tahrirlash menyusiga qaytish
		await module.exports.editOrder(ctx)
	},

	// ====================== TAHRILLANGAN CHIQISH VILOYATINI SAQLASH ======================
	saveEditedFromRegion: async (ctx, callbackData) => {
		const user = ctx.user
		const region = callbackData.replace('from_', '')

		// Session ga yangilash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.fromRegion = region

		// Tasdiqlash sahifasiga qaytish
		await module.exports.showOrderConfirmation(ctx)
	},

	// ====================== TAHRILLANGAN KIRISH VILOYATINI SAQLASH ======================
	saveEditedToRegion: async (ctx, callbackData) => {
		const user = ctx.user
		const region = callbackData.replace('to_', '')

		// Session ga yangilash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.toRegion = region

		// Tasdiqlash sahifasiga qaytish
		await module.exports.showOrderConfirmation(ctx)
	},

	// ====================== TAHRILLANGAN YO'LOVCHILAR SONINI SAQLASH ======================
	saveEditedPassengerCount: async (ctx, callbackData) => {
		const user = ctx.user
		const passengerCount = parseInt(callbackData.replace('passengers_', ''))

		// Session ga yangilash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.passengerCount = passengerCount

		// Tasdiqlash sahifasiga qaytish
		await module.exports.showOrderConfirmation(ctx)
	},

	// ====================== TAHRILLANGAN TELEFON RAQAMINI SAQLASH ======================
	saveEditedPhone: async (ctx, phone) => {
		const user = ctx.user

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
					? "❌ Telefon raqami noto'g'ri formatda.\n\n" +
					  "✅ To'g'ri format: +998XXXXXXXXX\n" +
					  '📝 Masalan: +998901234567\n\n' +
					  'Iltimos, qaytadan kiriting:'
					: '❌ Неверный формат номера телефона.\n\n' +
					  '✅ Правильный формат: +998XXXXXXXXX\n' +
					  '📝 Например: +998901234567\n\n' +
					  'Пожалуйста, введите еще раз:'

			await ctx.reply(message)
			return false
		}

		// Sessionga telefon raqamini saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.phone = formattedPhone

		// User profilini yangilash (agar kerak bo'lsa)
		if (!user.phone || user.phone !== formattedPhone) {
			user.phone = formattedPhone
			await user.save()
		}

		// Tasdiqlash sahifasiga qaytish
		await module.exports.showOrderConfirmation(ctx)
		return true
	},

	// ====================== TAHRILLANGAN POCHTA MA'LUMOTINI SAQLASH ======================
	saveEditedParcel: async (ctx, callbackData) => {
		const user = ctx.user
		const hasParcel = callbackData === 'parcel_yes'

		// Session ga yangilash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.hasParcel = hasParcel

		if (hasParcel) {
			// Pochta tavsifini so'rash
			user.state = states.PASSENGER_EDIT_PARCEL_DESC
			await user.save()

			const message =
				user.language === 'uz'
					? "📝 Yangi pochtа/yuk haqida qisqacha ma'lumot bering:"
					: '📝 Кратко опишите новую посылку/груз:'

			await ctx.reply(message)
		} else {
			// Pochta yo'q deb tanlaganda, tasdiqlash sahifasiga qaytish
			ctx.session.orderData.parcelDescription = ''
			await module.exports.showOrderConfirmation(ctx)
		}
	},

	// ====================== TAHRILLANGAN POCHTA TAVSIFINI SAQLASH ======================
	saveEditedParcelDescription: async (ctx, text) => {
		const user = ctx.user

		// Session ga yangilash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.parcelDescription = text

		// Tasdiqlash sahifasiga qaytish
		await module.exports.showOrderConfirmation(ctx)
	},
	// ====================== BUYURTMA YARATISH (YANGI VERSIYA) ======================
	createOrderWithPhone: async ctx => {
		const user = ctx.user

		// Session ma'lumotlarini tekshirish
		ctx.session = ctx.session || {}
		const orderData = ctx.session.orderData || {}

		if (
			!orderData.fromRegion ||
			!orderData.toRegion ||
			!orderData.passengerCount ||
			!orderData.phone
		) {
			const message =
				user.language === 'uz' ? "❌ Barcha maydonlar to'ldirilmagan." : '❌ Не все поля заполнены.'

			await ctx.reply(message)
			return
		}

		try {
			// Yangi buyurtma yaratish
			const order = new Order({
				userId: user.telegramId,
				username: user.username,
				fullName: user.fullName,
				phone: orderData.phone,
				fromRegion: orderData.fromRegion,
				toRegion: orderData.toRegion,
				passengerCount: orderData.passengerCount,
				hasParcel: orderData.hasParcel || false,
				parcelDescription: orderData.parcelDescription || '',
				comment: '',
				status: 'searching',
				createdAt: new Date()
			})

			await order.save()

			// Session ga order id ni saqlash
			ctx.session.orderId = order._id
			// Muvaffaqiyatli xabar
			const successMessage =
				user.language === 'uz'
					? `✅ Buyurtma muvaffaqiyatli yaratildi!\n\n` +
					  `⏰ <b>Vaqt:</b> ${new Date().toLocaleTimeString('uz-UZ')}\n\n` +
					  `🔍 Haydovchilar qidirilmoqda...`
					: `✅ Заказ успешно создан!\n\n` +
					  `⏰ <b>Время:</b> ${new Date().toLocaleTimeString('ru-RU')}\n\n` +
					  `🔍 Поиск водителей...`

			await ctx.reply(successMessage, {
				parse_mode: 'HTML'
			})

			// Haydovchi qidirish
			await module.exports.searchDrivers(ctx, order)
		} catch (error) {
			console.error('Order creation error:', error)

			const message =
				user.language === 'uz'
					? "❌ Buyurtma yaratishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
					: '❌ Ошибка при создании заказа. Пожалуйста, попробуйте еще раз.'

			await ctx.reply(message)
		}
	},

	// ====================== ORQAGA QAYTISH ======================
	handleBackToOrder: async ctx => {
		const user = ctx.user

		// Session ma'lumotlarini olish
		ctx.session = ctx.session || {}
		const orderData = ctx.session.orderData || {}

		// Pochta ma'lumotlarini saqlab, orqaga qaytish
		user.state = states.PASSENGER_PARCEL
		await user.save()

		const message =
			user.language === 'uz'
				? `📍 Chiqish: ${orderData.fromRegion}\n` +
				  `📍 Kirish: ${orderData.toRegion}\n` +
				  `👥 Yo'lovchilar: ${orderData.passengerCount} kishi\n\n` +
				  `📦 Pochta yoki yuk bormi?`
				: `📍 Отправление: ${orderData.fromRegion}\n` +
				  `📍 Прибытие: ${orderData.toRegion}\n` +
				  `👥 Пассажиры: ${orderData.passengerCount} человек\n\n` +
				  `📦 Есть посылка или груз?`

		await ctx.reply(message, keyboards.parcelKeyboard(user.language))
	},

	// ============ BUYURTMA TASDIQLASH (PASSENGER - boshlang'ich) ============
	// confirmOrder: async ctx => {
	// 	const user = ctx.user

	// 	console.log('📞 Passenger confirmOrder called, user state:', user.state)

	// 	// Avval callback queryga javob berish
	// 	try {
	// 		await ctx.answerCbQuery()
	// 	} catch (cbError) {
	// 		console.log('⚠️ answerCbQuery error:', cbError.message)
	// 	}

	// 	if (!ctx.session || !ctx.session.orderId) {
	// 		const message =
	// 			user.language === 'uz'
	// 				? '❌ Buyurtma topilmadi. Iltimos, qaytadan boshlang.'
	// 				: '❌ Заказ не найден. Пожалуйста, начните заново.'

	// 		await ctx.reply(message)
	// 		return
	// 	}

	// 	try {
	// 		const order = await Order.findById(ctx.session.orderId)

	// 		if (!order) {
	// 			throw new Error('Order not found')
	// 		}

	// 		console.log('✅ Passenger confirming order:', order._id)
	// 		console.log('📊 Order status before:', order.status)

	// 		// Haydovchi qidirish
	// 		await module.exports.searchDrivers(ctx, order)
	// 	} catch (error) {
	// 		console.error('❌ Confirm order error:', error)

	// 		const message =
	// 			user.language === 'uz'
	// 				? "❌ Buyurtmani tasdiqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
	// 				: '❌ Ошибка при подтверждении заказа. Пожалуйста, попробуйте еще раз.'

	// 		await ctx.reply(message)
	// 	}
	// },
	// order.js faylida confirmOrder funksiyasini quyidagicha o'zgartiring:
	// order.js faylida confirmOrder funksiyasini quyidagicha o'zgartiring:

	confirmOrder: async (ctx, callbackData) => {
		const user = ctx.user

		console.log('📞 Passenger confirmOrder called, user state:', user.state)

		// Avval callback queryga javob berish
		try {
			await ctx.answerCbQuery()
		} catch (cbError) {
			console.log('⚠️ answerCbQuery error:', cbError.message)
		}

		// Order ID ni callbackData dan olish
		const orderId = callbackData.split('_')[2]

		if (!orderId) {
			const message =
				user.language === 'uz'
					? '❌ Buyurtma topilmadi. Iltimos, qayta boshlang.'
					: '❌ Заказ не найден. Пожалуйста, начните заново.'

			await ctx.reply(message)
			return
		}

		try {
			const order = await Order.findById(orderId).populate('driverId')

			if (!order) {
				throw new Error('Order not found')
			}

			console.log('✅ Passenger confirming order:', order._id)
			console.log('📊 Order status before:', order.status)
			console.log('🚗 Driver:', order.driverId?.fullName || 'Tanlanmagan')

			// Faqat 'selected' holatidagi buyurtmalarni tasdiqlash mumkin
			if (order.status !== 'selected' || !order.driverId) {
				const message =
					user.language === 'uz'
						? '❌ Bu buyurtma tasdiqlash uchun tayyor emas yoki haydovchi tanlanmagan.'
						: '❌ Этот заказ не готов к подтверждению или водитель не выбран.'

				await ctx.reply(message)
				return
			}

			// Buyurtma statusini 'confirmed' ga o'zgartirish
			order.status = 'confirmed'
			await order.save()

			console.log('✅ Order confirmed, status updated to:', order.status)

			// Yo'lovchiga tasdiqlash xabari
			const passengerMessage =
				user.language === 'uz'
					? `✅ Buyurtmangiz tasdiqlandi!\n\n` +
					  `🚗 <b>Haydovchi ma'lumotlari:</b>\n` +
					  `• Ism: ${order.driverId.fullName}\n` +
					  `• Telefon: ${order.driverId.phone}\n\n` +
					  `📍 <b>Yo'nalish:</b> ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 <b>Yo'lovchilar:</b> ${order.passengerCount} kishi\n` +
					  `${order.hasParcel ? `📦 <b>Pochta:</b> Ha\n` : ''}` +
					  `${order.parcelDescription ? `📝 <b>Tavsif:</b> ${order.parcelDescription}\n` : ''}\n` +
					  `💬 Endi haydovchi bilan bog'laning va jo'nash vaqtini kelishing.`
					: `✅ Ваш заказ подтвержден!\n\n` +
					  `🚗 <b>Информация о водителе:</b>\n` +
					  `• Имя: ${order.driverId.fullName}\n` +
					  `• Телефон: ${order.driverId.phone}\n\n` +
					  `📍 <b>Направление:</b> ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 <b>Пассажиры:</b> ${order.passengerCount} человек\n` +
					  `${order.hasParcel ? `📦 <b>Посылка:</b> Да\n` : ''}` +
					  `${
							order.parcelDescription ? `📝 <b>Описание:</b> ${order.parcelDescription}\n` : ''
					  }\n` +
					  `💬 Теперь свяжитесь с водителем и договоритесь о времени отправления.`

			await ctx.reply(passengerMessage, { parse_mode: 'HTML' })

			// HAYDOVCHIGA XABAR YUBORISH (QABUL QILISH/RAD ETISH TUGMALARI BILAN)
			try {
				// Yo'lovchi ma'lumotlarini olish
				const passenger = await User.findOne({ telegramId: order.userId })

				const passengerName = passenger?.fullName || passenger?.username || 'Nomalum'
				const passengerPhone = passenger?.phone || order.phone || 'Korsatilmagan'

				const driverMessage =
					user.language === 'uz'
						? `✅ Yo'lovchi buyurtmangizni tasdiqladi!\n\n` +
						  `👤 <b>Yo'lovchi ma'lumotlari:</b>\n` +
						  `• Ism: ${passengerName}\n` +
						  `• Telefon: ${passengerPhone}\n\n` +
						  `📍 <b>Yo'nalish:</b> ${order.fromRegion} → ${order.toRegion}\n` +
						  `👥 <b>Yo'lovchilar:</b> ${order.passengerCount} kishi\n` +
						  `${order.hasParcel ? `📦 <b>Pochta:</b> Ha\n` : ''}` +
						  `${
								order.parcelDescription ? `📝 <b>Tavsif:</b> ${order.parcelDescription}\n` : ''
						  }\n` +
						  `⚠️ <b>E'tibor bering:</b> Buyurtmani qabul qilsangiz, bo'sh o'rinlaringiz ${order.passengerCount} taga kamayadi!`
						: `✅ Пассажир подтвердил ваш заказ!\n\n` +
						  `👤 <b>Информация о пассажире:</b>\n` +
						  `• Имя: ${passengerName}\n` +
						  `• Телефон: ${passengerPhone}\n\n` +
						  `📍 <b>Направление:</b> ${order.fromRegion} → ${order.toRegion}\n` +
						  `👥 <b>Пассажиры:</b> ${order.passengerCount} человек\n` +
						  `${order.hasParcel ? `📦 <b>Посылка:</b> Да\n` : ''}` +
						  `${
								order.parcelDescription ? `📝 <b>Описание:</b> ${order.parcelDescription}\n` : ''
						  }\n` +
						  `💰 <b>Номер заказа:</b> ${order._id}\n\n` +
						  `⚠️ <b>Внимание:</b> Если вы примете заказ, ваши свободные места уменьшатся на ${order.passengerCount}!`

				// Haydovchi uchun keyboard (qabul qilish/rad etish)
				const driverKeyboard = {
					inline_keyboard: [
						[
							{
								text: user.language === 'uz' ? '✅ Qabul qilish' : '✅ Принять',
								callback_data: `driver_accept_${order._id}`
							},
							{
								text: user.language === 'uz' ? '❌ Rad etish' : '❌ Отклонить',
								callback_data: `driver_reject_${order._id}`
							}
						]
					]
				}

				// Haydovchiga xabar yuborish
				await ctx.telegram.sendMessage(order.driverId.telegramId, driverMessage, {
					reply_markup: driverKeyboard,
					parse_mode: 'HTML'
				})

				console.log(
					'✅ Haydovchiga xabar yuborildi (qabul qilish/rad etish tugmalari bilan):',
					order.driverId.telegramId
				)
			} catch (telegramError) {
				console.error('❌ Haydovchiga xabar yuborishda xatolik:', telegramError)

				// Yo'lovchiga xatolik haqida xabar
				await ctx.reply(
					user.language === 'uz'
						? `⚠️ Haydovchiga xabar yuborishda muammo yuz berdi. Iltimos, haydovchini shaxsan chaqiring:\n📞 ${order.driverId.phone}`
						: `⚠️ Проблема с отправкой сообщения водителю. Пожалуйста, свяжитесь с водителем лично:\n📞 ${order.driverId.phone}`
				)
			}

			// Asosiy menyuga qaytish
			user.state = states.MAIN_MENU
			await user.save()

			const menuMessage = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'
			await ctx.reply(menuMessage, keyboards.mainMenuKeyboard(user.language))
		} catch (error) {
			console.error('❌ Confirm order error:', error)
			console.error('❌ Error details:', error.stack)

			const message =
				user.language === 'uz'
					? "❌ Buyurtmani tasdiqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
					: '❌ Ошибка при подтверждении заказа. Пожалуйста, попробуйте еще раз.'

			await ctx.reply(message)
		}
	},

	// ============ HAYDOVCHI QIDIRISH (YO'LOVCHILAR SONI HISOBGA OLINADI) ============
	// searchDrivers: async (ctx, order) => {
	// 	const user = ctx.user

	// 	// Statusni 'searching' ga o'rnatish
	// 	if (order.status !== 'searching') {
	// 		order.status = 'searching'
	// 		await order.save()
	// 	}

	// 	console.log(`🔍 Qidirilayotgan yo'nalish: ${order.fromRegion} -> ${order.toRegion}`)
	// 	console.log(`👥 Yo'lovchilar soni: ${order.passengerCount}`)

	// 	// Haydovchilarni qidirish
	// 	const drivers = await Driver.find({
	// 		fromRegion: order.fromRegion,
	// 		toRegion: order.toRegion,
	// 		status: 'active',
	// 		maxPassengers: { $gte: order.passengerCount },
	// 		$or: [
	// 			{ paidUntil: { $gte: new Date() } },
	// 			{ paidUntil: null },
	// 			{ paidUntil: { $exists: false } }
	// 		]
	// 	})
	// 		.populate('carModel')
	// 		.populate('carType')

	// 	console.log(`📊 Topilgan haydovchilar: ${drivers.length} ta`)

	// 	drivers.forEach((driver, index) => {
	// 		console.log(`Haydovchi ${index + 1}: ${driver.fullName} (ID: ${driver._id})`)
	// 		console.log(`Telegram ID: ${driver.telegramId}`)
	// 		console.log(`CarModel ID: ${driver.carModel}`)
	// 		console.log(`Max Passengers: ${driver.maxPassengers}`)
	// 		console.log(`Status: ${driver.status}`)
	// 		console.log('---')
	// 	})

	// 	if (drivers.length > 0) {
	// 		await module.exports.showFoundDrivers(ctx, drivers, order)
	// 	} else {
	// 		// ============ HAYDOVCHI TOPILMAGANDA ============
	// 		console.log('❌ Haydovchi topilmadi, kanalga xabar yuborilmoqda...')

	// 		// Buyurtma statusini yangilash
	// 		order.status = 'pending'
	// 		await order.save()

	// 		// 1. Avval yo'lovchiga xabar berish
	// 		const userMessage =
	// 			user.language === 'uz'
	// 				? `❌ Siz tanlagan yo'nalish bo'yicha (${order.passengerCount} kishi uchun) hozircha mashina topilmadi.\n\n` +
	// 				  `📍 Chiqish: ${order.fromRegion}\n` +
	// 				  `📍 Kirish: ${order.toRegion}\n` +
	// 				  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n\n` +
	// 				  `Buyurtmangiz adminlarga yuborildi, tez orada aloqaga chiqishadi.\n\n` +
	// 				  `Kuting yoki boshqa vaqtda qayta urinib ko'ring.`
	// 				: `❌ По выбранному направлению (для ${order.passengerCount} человек) машины не найдены.\n\n` +
	// 				  `📍 Отправление: ${order.fromRegion}\n` +
	// 				  `📍 Прибытие: ${order.toRegion}\n` +
	// 				  `👥 Пассажиры: ${order.passengerCount} человек\n\n` +
	// 				  `Ваш заказ отправлен администраторам, они свяжутся с вами в ближайшее время.\n\n` +
	// 				  `Подождите или попробуйте в другое время.`

	// 		await ctx.reply(userMessage)

	// 		// 2. Kanalga xabar yuborish
	// 		try {
	// 			console.log('📤 Kanalga xabar yuborilmoqda...')

	// 			const channelId = process.env.ORDER_CHANNEL_ID

	// 			if (channelId && channelId !== '@your_channel') {
	// 				const channelMessage =
	// 					`🚕 YANGI BUYURTMA - HAYDOVCHI TOPILMADI\n\n` +
	// 					`📍 Chiqish: ${order.fromRegion}\n` +
	// 					`📍 Kirish: ${order.toRegion}\n` +
	// 					`👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
	// 					`📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
	// 					`${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n` : ''}` +
	// 					`👤 Foydalanuvchi: @${order.username || 'username_yoq'}\n` +
	// 					`🆔 User ID: ${order.userId}\n` +
	// 					`⏰ Vaqt: ${new Date(order.createdAt).toLocaleString('uz-UZ')}\n\n` +
	// 					`⚠️ Iltimos, bu buyurtma uchun haydovchi toping!`

	// 				await ctx.telegram.sendMessage(channelId, channelMessage)
	// 				console.log('✅ Kanalga xabar yuborildi:', channelId)
	// 			} else {
	// 				console.log("⚠️ ORDER_CHANNEL_ID mavjud emas yoki noto'g'ri:", channelId)

	// 				// Agar kanal ID bo'lmasa, adminlarga shaxsiy xabar yuborish
	// 				const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : []

	// 				if (adminIds.length > 0) {
	// 					for (const adminId of adminIds) {
	// 						try {
	// 							const adminMessage =
	// 								`🚕 YANGI BUYURTMA (Kanal yo'q)\n\n` +
	// 								`📍 Chiqish: ${order.fromRegion}\n` +
	// 								`📍 Kirish: ${order.toRegion}\n` +
	// 								`👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
	// 								`📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
	// 								`${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n` : ''}` +
	// 								`👤 Foydalanuvchi: @${order.username || 'N/A'}\n` +
	// 								`🆔 User ID: ${order.userId}\n` +
	// 								`⏰ Vaqt: ${new Date().toLocaleString('uz-UZ')}\n\n` +
	// 								`⚠️ KANALGA YUBORILMADI! ORDER_CHANNEL_ID tekshiring.`

	// 							await ctx.telegram.sendMessage(adminId.trim(), adminMessage)
	// 						} catch (adminError) {
	// 							console.error(`Admin ${adminId} ga xabar yuborishda xatolik:`, adminError.message)
	// 						}
	// 					}
	// 				}
	// 			}
	// 		} catch (error) {
	// 			console.error('❌ Kanalga yuborishda xatolik:', error.message)

	// 			// Xatolik haqida adminlarga xabar berish
	// 			const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : []

	// 			for (const adminId of adminIds) {
	// 				try {
	// 					const errorMessage =
	// 						`❌ KANALGA XABAR YUBORISHDA XATOLIK\n\n` +
	// 						`Xato: ${error.message}\n` +
	// 						`Buyurtma: ${order.fromRegion} → ${order.toRegion}\n` +
	// 						`User: @${order.username || order.userId}`

	// 					await ctx.telegram.sendMessage(adminId.trim(), errorMessage)
	// 				} catch (adminError) {
	// 					console.error(`Admin xatolik xabarini yuborishda:`, adminError.message)
	// 				}
	// 			}
	// 		}

	// 		// 3. Asosiy menyuga qaytish
	// 		user.state = states.MAIN_MENU
	// 		await user.save()

	// 		const menuMessage = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'
	// 		await ctx.reply(menuMessage, keyboards.mainMenuKeyboard(user.language))

	// 		// 4. Sessionni tozalash
	// 		if (ctx.session) {
	// 			delete ctx.session.orderId
	// 			delete ctx.session.orderData
	// 		}
	// 	}
	// },
	// searchDrivers: async (ctx, order) => {
	// 	const user = ctx.user

	// 	// Statusni 'searching' ga o'rnatish
	// 	if (order.status !== 'searching') {
	// 		order.status = 'searching'
	// 		await order.save()
	// 	}

	// 	console.log(
	// 		`🔍 Qidirilayotgan yo'nalish: ${order.fromRegion} -> ${order.toRegion}`,
	// 	)
	// 	console.log(`👥 Yo'lovchilar soni: ${order.passengerCount}`)

	// 	// Haydovchilarni qidirish
	// 	const drivers = await Driver.find({
	// 		fromRegion: order.fromRegion,
	// 		toRegion: order.toRegion,
	// 		status: 'active',
	// 		maxPassengers: { $gte: order.passengerCount },
	// 		$or: [
	// 			{ paidUntil: { $gte: new Date() } },
	// 			{ paidUntil: null },
	// 			{ paidUntil: { $exists: false } },
	// 		],
	// 	})
	// 		.populate('carModel')
	// 		.populate('carType')

	// 	console.log(`📊 Topilgan haydovchilar: ${drivers.length} ta`)

	// 	drivers.forEach((driver, index) => {
	// 		console.log(
	// 			`Haydovchi ${index + 1}: ${driver.fullName} (ID: ${driver._id})`,
	// 		)
	// 		console.log(`Telegram ID: ${driver.telegramId}`)
	// 		console.log(`CarModel ID: ${driver.carModel}`)
	// 		console.log(`Max Passengers: ${driver.maxPassengers}`)
	// 		console.log(`Status: ${driver.status}`)
	// 		console.log('---')
	// 	})

	// 	if (drivers.length > 0) {
	// 		await module.exports.showFoundDrivers(ctx, drivers, order)
	// 	} else {
	// 		// ============ HAYDOVCHI TOPILMAGANDA ============
	// 		console.log('❌ Haydovchi topilmadi, kanalga xabar yuborilmoqda...')

	// 		// Buyurtma statusini yangilash
	// 		order.status = 'pending'
	// 		await order.save()

	// 		// 1. Avval yo'lovchiga xabar berish
	// 		const userMessage =
	// 			user.language === 'uz'
	// 				? `❌ Hozircha siz tanlagan yo‘nalish bo‘yicha ${order.passengerCount} nafar yo‘lovchi uchun mos transport topilmadi.\n\n` +
	// 					`📍 <b>Chiqish manzili:</b> ${order.fromRegion}\n` +
	// 					`📍 <b>Borish manzili:</b> ${order.toRegion}\n` +
	// 					`👥 <b>Yo‘lovchilar soni:</b> ${order.passengerCount}\n\n` +
	// 					`📨 Buyurtmangiz hamkorlar kanaliga yuborildi. Tez orada siz bilan bog‘lanishlari mumkin.\n\n` +
	// 					`⏳ Iltimos, kuting yoki biroz vaqtdan so‘ng qayta urinib ko‘ring.`
	// 				: `❌ В данный момент по выбранному направлению транспорт для ${order.passengerCount} пассажиров не найден.\n\n` +
	// 					`📍 <b>Пункт отправления:</b> ${order.fromRegion}\n` +
	// 					`📍 <b>Пункт назначения:</b> ${order.toRegion}\n` +
	// 					`👥 <b>Количество пассажиров:</b> ${order.passengerCount}\n\n` +
	// 					`📨 Ваш заказ отправлен в партнерский канал. С вами могут связаться в ближайшее время.\n\n` +
	// 					`⏳ Пожалуйста, подождите или попробуйте снова немного позже.`

	// 		await ctx.reply(userMessage, {
	// 			parse_mode: 'HTML',
	// 		})

	// 		// 2. KANALGA XABAR YUBORISH
	// 		try {
	// 			console.log('📤 Kanalga xabar yuborilmoqda...')

	// 			const channelId = process.env.ORDER_CHANNEL_ID

	// 			if (
	// 				channelId &&
	// 				channelId.trim() !== '' &&
	// 				channelId !== '@your_channel'
	// 			) {
	// 				const channelMessage =
	// 					`🚕 YANGI BUYURTMA - HAYDOVCHI KERAK\n\n` +
	// 					`📍 Chiqish: ${order.fromRegion}\n` +
	// 					`📍 Kirish: ${order.toRegion}\n` +
	// 					`👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
	// 					`📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
	// 					`${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n` : ''}` +
	// 					`👤 Foydalanuvchi: @${order.username || 'username_yoq'}\n` +
	// 					`🆔 User ID: ${order.userId}\n` +
	// 					`📞 Telefon: ${order.phone}\n` +
	// 					`⏰ Vaqt: ${new Date(order.createdAt).toLocaleString('uz-UZ')}\n\n` +
	// 					`⚠️ Bu yo'nalishda haydovchi yo'q. Kimdir boradigan bo'lsa, yo'lovchi bilan bog'lansin!`

	// 				try {
	// 					await ctx.telegram.sendMessage(channelId.trim(), channelMessage)
	// 					console.log('✅ Kanalga xabar yuborildi:', channelId)
	// 				} catch (channelError) {
	// 					console.error(
	// 						'❌ Kanalga yuborishda xatolik:',
	// 						channelError.message,
	// 					)

	// 					// Kanalga yuborishda xatolik bo'lsa, adminlarga xabar berish
	// 					const adminIds = process.env.ADMIN_IDS
	// 						? process.env.ADMIN_IDS.split(',').map(id => id.trim())
	// 						: []

	// 					if (adminIds.length > 0) {
	// 						const errorMessage =
	// 							`❌ KANALGA XABAR YUBORISHDA XATOLIK\n\n` +
	// 							`Xato: ${channelError.message}\n` +
	// 							`Kanal ID: ${channelId}\n` +
	// 							`Buyurtma: ${order.fromRegion} → ${order.toRegion}\n` +
	// 							`User: @${order.username || order.userId}`

	// 						for (const adminId of adminIds) {
	// 							try {
	// 								await ctx.telegram.sendMessage(adminId, errorMessage)
	// 								console.log(`✅ Adminga xatolik xabari yuborildi: ${adminId}`)
	// 							} catch (adminError) {
	// 								console.error(
	// 									`Admin ${adminId} ga xabar yuborishda xatolik:`,
	// 									adminError.message,
	// 								)
	// 							}
	// 						}
	// 					}
	// 				}
	// 			} else {
	// 				console.log(
	// 					"⚠️ ORDER_CHANNEL_ID mavjud emas yoki noto'g'ri:",
	// 					channelId,
	// 				)

	// 				// Agar kanal ID bo'lmasa, adminlarga shaxsiy xabar yuborish
	// 				const adminIds = process.env.ADMIN_IDS
	// 					? process.env.ADMIN_IDS.split(',').map(id => id.trim())
	// 					: []

	// 				if (adminIds.length > 0) {
	// 					const adminMessage =
	// 						`🚕 YANGI BUYURTMA (Kanal yo'q)\n\n` +
	// 						`📍 Chiqish: ${order.fromRegion}\n` +
	// 						`📍 Kirish: ${order.toRegion}\n` +
	// 						`👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
	// 						`📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
	// 						`${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n` : ''}` +
	// 						`👤 Foydalanuvchi: @${order.username || 'N/A'}\n` +
	// 						`🆔 User ID: ${order.userId}\n` +
	// 						`📞 Telefon: ${order.phone}\n` +
	// 						`⏰ Vaqt: ${new Date().toLocaleString('uz-UZ')}\n\n` +
	// 						`⚠️ KANALGA YUBORILMADI! ORDER_CHANNEL_ID tekshiring.`

	// 					for (const adminId of adminIds) {
	// 						try {
	// 							await ctx.telegram.sendMessage(adminId, adminMessage)
	// 							console.log(`✅ Adminga xabar yuborildi: ${adminId}`)
	// 						} catch (adminError) {
	// 							console.error(
	// 								`Admin ${adminId} ga xabar yuborishda xatolik:`,
	// 								adminError.message,
	// 							)
	// 						}
	// 					}
	// 				}
	// 			}
	// 		} catch (error) {
	// 			console.error('❌ Kanalga yuborishda umumiy xatolik:', error.message)
	// 		}

	// 		// 3. Asosiy menyuga qaytish
	// 		// 4. Sessionni tozalash
	// 		if (ctx.session) {
	// 			delete ctx.session.orderId
	// 			delete ctx.session.orderData
	// 		}
	// 	}
	// },

	searchDrivers: async (ctx, order) => {
		const user = ctx.user

		// Statusni 'searching' ga o'rnatish
		if (order.status !== 'searching') {
			order.status = 'searching'
			order.driverSearched = true
			order.searchCompletedAt = new Date()
			await order.save()
		}

		console.log(`🔍 Qidirilayotgan yo'nalish: ${order.fromRegion} -> ${order.toRegion}`)
		console.log(`👥 Yo'lovchilar soni: ${order.passengerCount}`)

		// Haydovchilarni qidirish
		const drivers = await Driver.find({
			fromRegion: order.fromRegion,
			toRegion: order.toRegion,
			status: 'active',
			maxPassengers: { $gte: order.passengerCount },
			$or: [
				{ paidUntil: { $gte: new Date() } },
				{ paidUntil: null },
				{ paidUntil: { $exists: false } }
			]
		})
			.populate('carModel')
			.populate('carType')

		console.log(`📊 Topilgan haydovchilar: ${drivers.length} ta`)

		// Haydovchi topilganligini yangilash
		order.driverFound = drivers.length > 0
		order.driverSearched = true
		order.searchCompletedAt = new Date()
		await order.save()

		drivers.forEach((driver, index) => {
			console.log(`Haydovchi ${index + 1}: ${driver.fullName} (ID: ${driver._id})`)
			console.log(`Telegram ID: ${driver.telegramId}`)
			console.log(`CarModel ID: ${driver.carModel}`)
			console.log(`Max Passengers: ${driver.maxPassengers}`)
			console.log(`Status: ${driver.status}`)
			console.log('---')
		})

		if (drivers.length > 0) {
			await module.exports.showFoundDrivers(ctx, drivers, order)
		} else {
			// ============ HAYDOVCHI TOPILMAGANDA ============
			console.log('❌ Haydovchi topilmadi, kanalga xabar yuborilmoqda...')

			// Buyurtma statusini yangilash
			order.status = 'pending'
			await order.save()

			// 1. Avval yo'lovchiga xabar berish
			const userMessage =
				user.language === 'uz'
					? `❌ Hozircha siz tanlagan yo'nalish bo'yicha ${order.passengerCount} kishi uchun haydovchi topilmadi.\n\n` +
					  `📍 Chiqish: ${order.fromRegion}\n` +
					  `📍 Kirish: ${order.toRegion}\n` +
					  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n\n` +
					  `🔄 Buyurtmangiz "topilmagan yo'nalishlar" ro'yxatiga qo'shildi.\n` +
					  `🚗 Haydovchilar boshqa yo'nalishlar orqali siz bilan bog'lanishi mumkin.\n\n` +
					  `⏳ Agar 7 kun ichida haydovchi topilmasa, buyurtma avtomatik bekor qilinadi.`
					: `❌ По выбранному направлению для ${order.passengerCount} человек водители не найдены.\n\n` +
					  `📍 Отправление: ${order.fromRegion}\n` +
					  `📍 Прибытие: ${order.toRegion}\n` +
					  `👥 Пассажиры: ${order.passengerCount} человек\n\n` +
					  `🔄 Ваш заказ добавлен в список "неподходящих направлений".\n` +
					  `🚗 Водители могут связаться с вами через другие направления.\n\n` +
					  `⏳ Если в течение 7 дней водитель не найдется, заказ будет автоматически отменен.`

			await ctx.reply(userMessage, {
				parse_mode: 'HTML'
			})

			// 2. KANALGA XABAR YUBORISH
			try {
				console.log('📤 Kanalga xabar yuborilmoqda...')

				const channelId = process.env.ORDER_CHANNEL_ID

				if (channelId && channelId.trim() !== '' && channelId !== '@your_channel') {
					const channelMessage =
						`🚕 YANGI BUYURTMA - HAYDOVCHI KERAK\n\n` +
						`📍 Chiqish: ${order.fromRegion}\n` +
						`📍 Kirish: ${order.toRegion}\n` +
						`👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
						`📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
						`${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n` : ''}` +
						`👤 Foydalanuvchi: @${order.username || 'username_yoq'}\n` +
						`🆔 User ID: ${order.userId}\n` +
						`📞 Telefon: ${order.phone}\n` +
						`⏰ Vaqt: ${new Date(order.createdAt).toLocaleString('uz-UZ')}\n\n` +
						`⚠️ Bu yo'nalishda haydovchi yo'q. Kimdir boradigan bo'lsa, yo'lovchi bilan bog'lansin!`

					try {
						await ctx.telegram.sendMessage(channelId.trim(), channelMessage)
						console.log('✅ Kanalga xabar yuborildi:', channelId)
					} catch (channelError) {
						console.error('❌ Kanalga yuborishda xatolik:', channelError.message)
					}
				} else {
					console.log("⚠️ ORDER_CHANNEL_ID mavjud emas yoki noto'g'ri:", channelId)
				}
			} catch (error) {
				console.error('❌ Kanalga yuborishda umumiy xatolik:', error.message)
			}

			// 3. Sessionni tozalash
			if (ctx.session) {
				delete ctx.session.orderId
				delete ctx.session.orderData
			}
		}
	},

	// ====================== ADMINLARGA XABAR YUBORISH FUNKSIYASI ======================
	sendToAdmins: async (ctx, order) => {
		try {
			console.log('👮 Adminlarga xabar yuborilmoqda...')

			const adminIds = process.env.ADMIN_IDS
				? process.env.ADMIN_IDS.split(',').map(id => id.trim())
				: []

			if (adminIds.length === 0) {
				console.log('⚠️ ADMIN_IDS mavjud emas, adminlarga xabar yuborilmaydi')
				return
			}

			const orderMessage =
				`🚕 YANGI BUYURTMA - HAYDOVCHI TOPILMADI\n\n` +
				`📍 Chiqish: ${order.fromRegion}\n` +
				`📍 Kirish: ${order.toRegion}\n` +
				`👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
				`📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
				`${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n` : ''}` +
				`👤 Foydalanuvchi: @${order.username || 'username_yoq'}\n` +
				`🆔 User ID: ${order.userId}\n` +
				`📞 Telefon: ${order.phone}\n` +
				`⏰ Vaqt: ${new Date(order.createdAt).toLocaleString('uz-UZ')}\n\n` +
				`⚠️ Iltimos, bu buyurtma uchun haydovchi toping!`

			let messageSent = false

			for (const adminId of adminIds) {
				try {
					// Admin ID raqam ekanligini tekshirish
					const adminIdNum = parseInt(adminId)
					if (isNaN(adminIdNum)) {
						console.error(`❌ Noto'g'ri admin ID: ${adminId}`)
						continue
					}

					await ctx.telegram.sendMessage(adminIdNum, orderMessage)
					console.log(`✅ Adminga xabar yuborildi: ${adminIdNum}`)
					messageSent = true
				} catch (adminError) {
					console.error(`❌ Admin ${adminId} ga xabar yuborishda xatolik:`, adminError.message)
				}
			}

			if (messageSent) {
				console.log('✅ Kamida bitta adminga xabar yuborildi')
			} else {
				console.error('❌ Hech bir adminga xabar yuborilmadi')
			}
		} catch (error) {
			console.error('❌ Adminlarga yuborishda umumiy xatolik:', error.message)
		}
	},

	// Topilgan haydovchilarni ko'rsatish
	showFoundDrivers: async (ctx, drivers, order) => {
		const user = ctx.user

		console.log(`🟢 showFoundDrivers: ${drivers.length} ta haydovchi topildi`)

		// Har bir haydovchini tekshirish
		drivers.forEach((driver, index) => {
			console.log(
				`Driver ${index + 1}: ${driver.fullName} | ${driver.telegramId} | maxPassengers: ${
					driver.maxPassengers
				}`
			)
			console.log(`CarModel: ${driver.carModel ? JSON.stringify(driver.carModel) : 'null'}`)
		})

		// ============ ASOSIY XABAR: Inline keyboard bilan ============
		const orderMessage =
			user.language === 'uz'
				? `✅ Buyurtma qabul qilindi!\n\n` +
				  `📍 Chiqish: ${order.fromRegion}\n` +
				  `📍 Kirish: ${order.toRegion}\n` +
				  `👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
				  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n\n` : '\n'}` +
				  `Buyurtmangiz qabul qilindi va haydovchilar bilan bog'laning.\n` +
				  `✅ Topilgan haydovchilar:`
				: `✅ Заказ принят!\n\n` +
				  `📍 Отправление: ${order.fromRegion}\n` +
				  `📍 Прибытие: ${order.toRegion}\n` +
				  `👥 Количество пассажиров: ${order.passengerCount} человек\n` +
				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
				  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n\n` : '\n'}` +
				  `Ваш заказ принят, свяжитесь с водителями.\n` +
				  `✅ Найденные водители:`

		// ============ INLINE KEYBOARD YARATISH ============
		const inlineKeyboard = []

		// Har bir haydovchi uchun tugma
		drivers.forEach((driver, index) => {
			// CAR MODELNI TO'G'RI OLISH
			let carModelDisplay = ''

			if (driver.carModel) {
				if (typeof driver.carModel === 'object' && driver.carModel._id) {
					// Agar carModel population qilingan object bo'lsa
					console.log(`Driver ${driver.fullName} carModel object:`, {
						id: driver.carModel._id,
						name: driver.carModel.name,
						nameRu: driver.carModel.nameRu
					})

					carModelDisplay =
						user.language === 'uz'
							? driver.carModel.name || "Mashina nomi yo'q"
							: driver.carModel.nameRu || driver.carModel.name || 'Нет названия машины'
				} else {
					// Agar carModel oddiy string bo'lsa
					carModelDisplay = driver.carModel
					console.log(`Driver ${driver.fullName} carModel string:`, carModelDisplay)
				}
			} else {
				console.log(`Driver ${driver.fullName} carModel yo'q`)
				carModelDisplay = "Mashina nomi yo'q"
			}

			const buttonText =
				user.language === 'uz'
					? `${index + 1}. ${driver.fullName} | ${carModelDisplay} | ${driver.maxPassengers} kishi`
					: `${index + 1}. ${driver.fullName} | ${carModelDisplay} | ${
							driver.maxPassengers
					  } человек`

			inlineKeyboard.push([
				{
					text: buttonText,
					callback_data: `select_driver_${driver._id}_${order._id}`
				}
			])
		})

		// Asosiy menyu tugmasi
		inlineKeyboard.push([
			{
				text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
				callback_data: 'main_menu'
			}
		])

		console.log('Keyboard tugmalari:')
		inlineKeyboard.forEach((row, index) => {
			console.log(`${index + 1}. ${row[0].text} | callback: ${row[0].callback_data}`)
		})

		// Bitta xabarni inline keyboard bilan chiqarish
		await ctx.reply(orderMessage, {
			reply_markup: {
				inline_keyboard: inlineKeyboard
			},
			parse_mode: 'HTML'
		})

		// Asosiy menyuga qaytish
		user.state = states.MAIN_MENU
		await user.save()

		console.log('🟢 showFoundDrivers END ==========')
	},

	// Buyurtmani bekor qilish
	cancelOrder: async ctx => {
		const user = ctx.user

		if (!ctx.session || !ctx.session.orderId) {
			const message = user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.'

			await ctx.reply(message)
			return
		}

		try {
			const order = await Order.findById(ctx.session.orderId)

			if (order) {
				order.status = 'cancelled'
				await order.save()
			}

			// Session ni tozalash
			if (ctx.session) {
				delete ctx.session.orderId
				delete ctx.session.orderData
			}

			const message = user.language === 'uz' ? '❌ Buyurtma bekor qilindi.' : '❌ Заказ отменен.'

			await ctx.reply(message)

			// Asosiy menyuga qaytish
			user.state = states.MAIN_MENU
			await user.save()

			const menuMessage = user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню'
			await ctx.reply(menuMessage, keyboards.mainMenuKeyboard(user.language))
		} catch (error) {
			console.error('Cancel order error:', error)

			const message =
				user.language === 'uz'
					? '❌ Buyurtmani bekor qilishda xatolik yuz berdi.'
					: '❌ Ошибка при отмене заказа.'

			await ctx.reply(message)
		}
	},

	showMyOrders: async ctx => {
		const user = ctx.user
		const orderHandler = require('./order')
		await orderHandler.showMyOrders(ctx, 1)

		try {
			// Sahifa raqami (default 1)
			const page = parseInt(ctx.session?.myOrdersPage) || 1
			const limit = 5 // Har sahifada 5 ta buyurtma
			const skip = (page - 1) * limit

			// Jami buyurtmalar soni
			const totalOrders = await Order.countDocuments({
				userId: user.telegramId
			})
			const totalPages = Math.ceil(totalOrders / limit)

			// Buyurtmalarni olish
			const orders = await Order.find({ userId: user.telegramId })
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.populate('driverId')

			if (orders.length === 0) {
				await ctx.reply(
					user.language === 'uz'
						? '📭 Sizda hali buyurtmalar mavjud emas.'
						: '📭 У вас пока нет заказов.'
				)
				return
			}

			// Xabar matni
			let message =
				user.language === 'uz'
					? `📋 Mening buyurtmalarim (${page}/${totalPages} sahifa)\n\n`
					: `📋 Мои заказы (${page}/${totalPages} страница)\n\n`

			orders.forEach((order, index) => {
				const statusText = {
					searching: '🔍 Qidirilmoqda',
					selected: '👤 Tanlangan',
					confirmed: '✅ Tasdiqlangan',
					accepted: '✅ Qabul qilingan',
					rejected: '❌ Rad etilgan',
					cancelled: '❌ Bekor qilingan',
					completed: '✅ Yakunlangan'
				}

				const status =
					user.language === 'uz' ? statusText[order.status] || order.status : order.status

				const driverName = order.driverId ? order.driverId.fullName : 'Tanlanmagan'
				const orderNumber = skip + index + 1

				message += `${orderNumber}. ${order.fromRegion} → ${order.toRegion}\n`
				message += `   👥 ${order.passengerCount} kishi\n`
				message += `   🚗 ${driverName}\n`
				message += `   📅 ${new Date(order.createdAt).toLocaleDateString('uz-UZ')}\n`
				message += `   📊 ${status}\n\n`
			})

			message +=
				user.language === 'uz'
					? `📊 Jami: ${totalOrders} ta buyurtma`
					: `📊 Всего: ${totalOrders} заказов`

			// Inline keyboard (sahifa navigatsiyasi)
			const inlineKeyboard = []

			// Sahifa navigatsiyasi
			if (totalPages > 1) {
				const paginationButtons = []

				if (page > 1) {
					paginationButtons.push({
						text: user.language === 'uz' ? '⬅️ Oldingi' : '⬅️ Назад',
						callback_data: `myorders_page_${page - 1}`
					})
				}

				paginationButtons.push({
					text: user.language === 'uz' ? `📄 ${page}/${totalPages}` : `📄 ${page}/${totalPages}`,
					callback_data: 'current_page'
				})

				if (page < totalPages) {
					paginationButtons.push({
						text: user.language === 'uz' ? 'Keyingi ➡️' : 'Далее ➡️',
						callback_data: `myorders_page_${page + 1}`
					})
				}

				inlineKeyboard.push(paginationButtons)
			}

			// Asosiy menyu tugmasi
			inlineKeyboard.push([
				{
					text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
					callback_data: 'main_menu'
				}
			])

			await ctx.reply(message, {
				reply_markup: {
					inline_keyboard: inlineKeyboard
				}
			})

			// Sessionda sahifani saqlash
			ctx.session.myOrdersPage = page
		} catch (error) {
			console.error('Show my orders error:', error)
			await ctx.reply(
				user.language === 'uz'
					? "❌ Buyurtmalarni ko'rsatishda xatolik yuz berdi."
					: '❌ Ошибка при отображении заказов.'
			)
		}
	},

	handleMyOrdersPage: async (ctx, callbackData) => {
		const user = ctx.user
		const page = parseInt(callbackData.split('_')[2])

		try {
			// Yangi sahifani ko'rsatish
			ctx.session.myOrdersPage = page
			await this.showMyOrders(ctx)

			// Callback query ni javoblash
			await ctx.answerCbQuery()
		} catch (error) {
			console.error('My orders page navigation error:', error)
			await ctx.answerCbQuery(
				user.language === 'uz' ? '❌ Xatolik yuz berdi' : '❌ Произошла ошибка'
			)
		}
	},

	// Yo'lovchi buyurtma yaratish
	createPassengerOrder: async ctx => {
		const user = ctx.user

		// Session ma'lumotlarini tekshirish
		ctx.session = ctx.session || {}
		if (!ctx.session.orderData) {
			await ctx.reply(
				user.language === 'uz'
					? "❌ Buyurtma ma'lumotlari topilmadi."
					: '❌ Данные заказа не найдены.'
			)
			return
		}

		const orderData = ctx.session.orderData

		// OrderData tekshirish
		if (!orderData.fromRegion || !orderData.toRegion || !orderData.passengerCount) {
			await ctx.reply(
				user.language === 'uz' ? "❌ Barcha maydonlar to'ldirilmagan." : '❌ Не все поля заполнены.'
			)
			return
		}

		// Buyurtmani yaratish va haydovchilarni qidirish
		await createOrderAndFindDrivers(ctx, orderData)

		// Sessionni tozalash
		delete ctx.session.orderData
	},

	// ====================== YO'LOVCHI MA'LUMOTLARINI TEKSHIRISH ======================
	checkPassengerInfo: async ctx => {
		const user = ctx.user

		// Yo'lovchi ma'lumotlari to'liq emasligini tekshirish
		if (!user.fullName || !user.phone) {
			// Ma'lumotlarni so'rash
			user.state = states.PASSENGER_INFO_NAME
			await user.save()

			const message =
				user.language === 'uz'
					? "👤 Sizning ma'lumotlaringiz to'liq emas.\n\n" + 'Iltimos, ism-familyangizni kiriting:'
					: '👤 Ваши данные неполные.\n\n' + 'Пожалуйста, введите ваше имя и фамилию:'

			await ctx.reply(message)
			return false
		}

		return true
	},

	// ====================== YO'LOVCHI ISMINI SAQLASH ======================
	savePassengerName: async (ctx, text) => {
		const user = ctx.user

		if (text.length < 3) {
			await ctx.reply(
				user.language === 'uz'
					? "❌ Ism-familya kamida 3 ta belgidan iborat bo'lishi kerak."
					: '❌ Имя и фамилия должны содержать не менее 3 символов.'
			)
			return
		}

		user.fullName = text
		user.state = states.PASSENGER_INFO_PHONE
		await user.save()

		const message =
			user.language === 'uz'
				? `✅ Ism-familya saqlandi: ${text}\n\n📞 Telefon raqamingizni yuboring (yoki +998XXXXXXXXX formatida yozing):`
				: `✅ Имя и фамилия сохранены: ${text}\n\n📞 Отправьте номер телефона (или напишите в формате +998XXXXXXXXX):`

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
	},

	// ====================== YO'LOVCHI TELEFON RAQAMINI SAQLASH ======================
	savePassengerPhone: async (ctx, phone) => {
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

		user.phone = formattedPhone
		user.state = states.MAIN_MENU
		await user.save()

		await ctx.reply(
			user.language === 'uz'
				? `✅ Telefon raqami saqlandi: ${formattedPhone}\n\n🎉 Ma'lumotlaringiz to'liq! Endi buyurtma berishingiz mumkin.`
				: `✅ Номер телефона сохранен: ${formattedPhone}\n\n🎉 Ваши данные полны! Теперь вы можете сделать заказ.`,
			keyboards.mainMenuKeyboard(user.language, user.isAdmin, user.role)
		)
	},
	// handleContactPhone: async (ctx) => {
	//     const user = ctx.user

	//     console.log('📱 handleContactPhone called')

	//     if (!ctx.message || !ctx.message.contact) {
	//         await ctx.reply(
	//             user.language === 'uz'
	//                 ? "❌ Telefon raqami topilmadi. Iltimos, 'Telefon raqamini yuborish' tugmasini bosing."
	//                 : '❌ Номер телефона не найден. Пожалуйста, нажмите кнопку "Отправить номер телефона".'
	//         )
	//         return
	//     }

	//     const contact = ctx.message.contact
	//     const phoneNumber = contact.phone_number

	//     console.log('📞 Contact phone:', phoneNumber)

	//     // Telefon raqamini formatlash
	//     let formattedPhone = phoneNumber.replace(/\s+/g, '')

	//     if (!formattedPhone.startsWith('+')) {
	//         formattedPhone = '+' + formattedPhone
	//     }

	//     // Telefon raqamini tekshirish
	//     const phoneRegex = /^\+[0-9]{10,15}$/
	//     if (!phoneRegex.test(formattedPhone)) {
	//         const message = user.language === 'uz'
	//             ? "❌ Telefon raqami noto'g'ri formatda.\n\n" +
	//               "✅ To'g'ri format: +998XXXXXXXXX\n" +
	//               "📝 Masalan: +998901234567\n\n" +
	//               "Iltimos, qaytadan kiriting:"
	//             : '❌ Неверный формат номера телефона.\n\n' +
	//               '✅ Правильный формат: +998XXXXXXXXX\n' +
	//               '📝 Например: +998901234567\n\n' +
	//               'Пожалуйста, введите еще раз:'

	//         await ctx.reply(message)
	//         return
	//     }

	//     // Sessionga telefon raqamini saqlash
	//     ctx.session = ctx.session || {}
	//     ctx.session.orderData = ctx.session.orderData || {}
	//     ctx.session.orderData.phone = formattedPhone

	//     // User profilini yangilash (agar kerak bo'lsa)
	//     if (!user.phone || user.phone !== formattedPhone) {
	//         user.phone = formattedPhone
	//         await user.save()
	//         console.log('✅ User phone updated:', formattedPhone)
	//     }

	//     // Keyboardni olib tashlash
	//     await ctx.reply(
	//         user.language === 'uz'
	//             ? `✅ Telefon raqamingiz qabul qilindi: ${formattedPhone}`
	//             : `✅ Ваш номер телефона принят: ${formattedPhone}`,
	//         { reply_markup: { remove_keyboard: true } }
	//     )

	//     // Tasdiqlash sahifasini ko'rsatish
	//     await module.exports.showOrderConfirmation(ctx)
	// },

	// passenger.js faylida handleContactPhone funksiyasini yangilang:

	handleContactPhone: async ctx => {
		const user = ctx.user

		console.log('📱 handleContactPhone called')

		if (!ctx.message || !ctx.message.contact) {
			await ctx.reply(
				user.language === 'uz'
					? "❌ Telefon raqami topilmadi. Iltimos, 'Telefon raqamini yuborish' tugmasini bosing."
					: '❌ Номер телефона не найден. Пожалуйста, нажмите кнопку "Отправить номер телефона".'
			)
			return
		}

		const contact = ctx.message.contact
		const phoneNumber = contact.phone_number

		console.log('📞 Contact phone:', phoneNumber)

		// Telefon raqamini formatlash
		let formattedPhone = phoneNumber.replace(/\s+/g, '')

		if (!formattedPhone.startsWith('+')) {
			formattedPhone = '+' + formattedPhone
		}

		// Telefon raqamini tekshirish (bu yerda Uzbekistan raqamlari uchun tekshirish)
		const phoneRegex = /^\+998[0-9]{9}$/
		if (!phoneRegex.test(formattedPhone)) {
			const message =
				user.language === 'uz'
					? "❌ Telefon raqami noto'g'ri formatda.\n\n" +
					  "✅ To'g'ri format: +998XXXXXXXXX\n" +
					  '📝 Masalan: +998901234567\n\n' +
					  'Iltimos, qaytadan kiriting:'
					: '❌ Неверный формат номера телефона.\n\n' +
					  '✅ Правильный формат: +998XXXXXXXXX\n' +
					  '📝 Например: +998901234567\n\n' +
					  'Пожалуйста, введите еще раз:'

			await ctx.reply(message)
			return
		}

		// Sessionga telefon raqamini saqlash
		ctx.session = ctx.session || {}
		ctx.session.orderData = ctx.session.orderData || {}
		ctx.session.orderData.phone = formattedPhone

		// User profilini yangilash (agar kerak bo'lsa)
		if (!user.phone || user.phone !== formattedPhone) {
			user.phone = formattedPhone
			await user.save()
			console.log('✅ User phone updated:', formattedPhone)
		}

		// Keyboardni olib tashlash
		await ctx.reply(
			user.language === 'uz'
				? `✅ Telefon raqamingiz qabul qilindi: ${formattedPhone}`
				: `✅ Ваш номер телефона принят: ${formattedPhone}`,
			{ reply_markup: { remove_keyboard: true } }
		)

		// Tasdiqlash sahifasini ko'rsatish
		await module.exports.showOrderConfirmation(ctx)
	}
}
