const Order = require('../models/Order')
const Driver = require('../models/Driver')
const User = require('../models/User')
const states = require('../utils/states')
const keyboards = require('../keyboards/main')
const regionKeyboards = require('../keyboards/regions')

const { getTimeAgo, formatPhoneNumber } = require('../utils/helpers')
module.exports = {
	// ============ HAYDOVCHI TANLASH ============
	// handleDriverSelection: async (ctx, callbackData) => {
	// 	const user = ctx.user

	// 	try {
	// 		console.log(`🚕 handleDriverSelection callbackData: ${callbackData}`)

	// 		// Callback_data dan driverId va orderId ni ajratib olish
	// 		// Format: select_driver_DRIVERID_ORDERID
	// 		const data = callbackData.replace('select_driver_', '')
	// 		const ids = data.split('_')

	// 		if (ids.length < 2) {
	// 			console.error("❌ Noto'g'ri callback_data format:", callbackData)
	// 			await ctx.reply(user.language === 'uz' ? "❌ Noto'g'ri format." : '❌ Неправильный формат.')
	// 			return
	// 		}

	// 		const driverId = ids[0] // Birinchi qism - driverId
	// 		const orderId = ids[1] // Ikkinchi qism - orderId

	// 		console.log(`🚕 Haydovchi tanlandi: driverId=${driverId}, orderId=${orderId}`)

	// 		// Driver va Order ni olish
	// 		const driver = await Driver.findById(driverId).populate('carModel').populate('carType')
	// 		const order = await Order.findById(orderId)

	// 		if (!driver) {
	// 			console.error('❌ Haydovchi topilmadi:', driverId)
	// 			await ctx.reply(
	// 				user.language === 'uz' ? '❌ Haydovchi topilmadi.' : '❌ Водитель не найден.'
	// 			)
	// 			return
	// 		}

	// 		if (!order) {
	// 			console.error('❌ Buyurtma topilmadi:', orderId)
	// 			await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
	// 			return
	// 		}

	// 		// Order statusini yangilash
	// 		order.driverId = driver._id
	// 		order.status = 'selected'
	// 		await order.save()

	// 		// Mashina modelini olish
	// 		let carModelName = "Mashina nomi yo'q"
	// 		let carTypeName = ''

	// 		if (driver.carModel) {
	// 			if (typeof driver.carModel === 'object') {
	// 				carModelName =
	// 					user.language === 'uz'
	// 						? driver.carModel.name || "Mashina nomi yo'q"
	// 						: driver.carModel.nameRu || driver.carModel.name || 'Нет названия машины'
	// 			} else {
	// 				carModelName = driver.carModel
	// 			}
	// 		}

	// 		if (driver.carType) {
	// 			if (typeof driver.carType === 'object') {
	// 				carTypeName =
	// 					user.language === 'uz'
	// 						? driver.carType.name || ''
	// 						: driver.carType.nameRu || driver.carType.name || ''
	// 			} else {
	// 				carTypeName = driver.carType
	// 			}
	// 		}

	// 		// Yo'lovchiga haydovchi ma'lumotlarini ko'rsatish
	// 		const driverInfoMessage =
	// 			user.language === 'uz'
	// 				? `✅ Haydovchi tanlandi!\n\n` +
	// 				  `👤 Ism: ${driver.fullName}\n` +
	// 				  `🚗 Mashina: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
	// 				  `👥 Sig'im: ${driver.maxPassengers} kishi\n` +
	// 				  `📞 Telefon: ${driver.phone}\n` +
	// 				  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
	// 				  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
	// 				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
	// 				  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n\n` : '\n'}` +
	// 				  `Haydovchi bilan bog'laning va jo'nash vaqtini kelishing.`
	// 				: `✅ Водитель выбран!\n\n` +
	// 				  `👤 Имя: ${driver.fullName}\n` +
	// 				  `🚗 Машина: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
	// 				  `👥 Вместимость: ${driver.maxPassengers} человек\n` +
	// 				  `📞 Телефон: ${driver.phone}\n` +
	// 				  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
	// 				  `👥 Пассажиры: ${order.passengerCount} человек\n` +
	// 				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
	// 				  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n\n` : '\n'}` +
	// 				  `Свяжитесь с водителем и договоритесь о времени отправления.`

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

	// 		await ctx.reply(driverInfoMessage, {
	// 			reply_markup: passengerKeyboard,
	// 			parse_mode: 'HTML'
	// 		})

	// 		console.log('✅ Haydovchi muvaffaqiyatli tanlandi')
	// 	} catch (error) {
	// 		console.error('❌ Select driver error:', error)
	// 		console.error('❌ Error details:', error.stack)

	// 		await ctx.reply(
	// 			user.language === 'uz'
	// 				? '❌ Haydovchi tanlashda xatolik yuz berdi.'
	// 				: '❌ Ошибка при выборе водителя.'
	// 		)
	// 	}
	// },

	// ============ HAYDOVCHI TANLASH ============
	// handleDriverSelection: async (ctx, callbackData) => {
	// 	const user = ctx.user

	// 	try {
	// 		console.log(`🚕 handleDriverSelection callbackData: ${callbackData}`)

	// 		// Callback_data dan driverId va orderId ni ajratib olish
	// 		// Format: select_driver_DRIVERID_ORDERID
	// 		const data = callbackData.replace('select_driver_', '')
	// 		const ids = data.split('_')

	// 		if (ids.length < 2) {
	// 			console.error("❌ Noto'g'ri callback_data format:", callbackData)
	// 			await ctx.reply(user.language === 'uz' ? "❌ Noto'g'ri format." : '❌ Неправильный формат.')
	// 			return
	// 		}

	// 		const driverId = ids[0] // Birinchi qism - driverId
	// 		const orderId = ids[1] // Ikkinchi qism - orderId

	// 		console.log(`🚕 Haydovchi tanlandi: driverId=${driverId}, orderId=${orderId}`)

	// 		// Driver va Order ni olish
	// 		const driver = await Driver.findById(driverId).populate('carModel').populate('carType').exec() // .exec() qo'shing

	// 		const order = await Order.findById(orderId).exec()

	// 		if (!driver) {
	// 			console.error('❌ Haydovchi topilmadi:', driverId)
	// 			await ctx.reply(
	// 				user.language === 'uz' ? '❌ Haydovchi topilmadi.' : '❌ Водитель не найден.'
	// 			)
	// 			return
	// 		}

	// 		if (!order) {
	// 			console.error('❌ Buyurtma topilmadi:', orderId)
	// 			await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
	// 			return
	// 		}

	// 		// Order statusini yangilash
	// 		order.driverId = driver._id
	// 		order.status = 'selected'
	// 		await order.save()

	// 		// Yo'lovchi ma'lumotlarini olish
	// 		const passenger = await User.findOne({ telegramId: order.userId }).exec()

	// 		console.log('✅ Driver:', driver.fullName)
	// 		console.log('✅ Order:', order._id)
	// 		console.log('✅ Passenger:', passenger?.fullName || 'Nomalum')

	// 		// Mashina modelini olish - xatolikni oldini olish uchun
	// 		let carModelName = "Mashina nomi yo'q"
	// 		let carTypeName = ''

	// 		if (driver.carModel) {
	// 			if (typeof driver.carModel === 'object' && driver.carModel.name) {
	// 				carModelName =
	// 					user.language === 'uz'
	// 						? driver.carModel.name || "Mashina nomi yo'q"
	// 						: driver.carModel.nameRu || driver.carModel.name || 'Нет названия машины'
	// 			} else {
	// 				carModelName = driver.carModel
	// 			}
	// 		}

	// 		if (driver.carType) {
	// 			if (typeof driver.carType === 'object') {
	// 				carTypeName =
	// 					user.language === 'uz'
	// 						? driver.carType.name || ''
	// 						: driver.carType.nameRu || driver.carType.name || ''
	// 			} else {
	// 				carTypeName = driver.carType
	// 			}
	// 		}

	// 		// Yo'lovchiga haydovchi ma'lumotlarini ko'rsatish
	// 		const driverInfoMessage =
	// 			user.language === 'uz'
	// 				? `✅ Haydovchi tanlandi!\n\n` +
	// 				  `👤 <b>Haydovchi ma'lumotlari:</b>\n` +
	// 				  `• Ism: ${driver.fullName}\n` +
	// 				  `• Mashina: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
	// 				  `• Sig'im: ${driver.maxPassengers} kishi\n` +
	// 				  `• Telefon: ${driver.phone}\n\n` +
	// 				  `📍 <b>Yo'nalish:</b> ${order.fromRegion} → ${order.toRegion}\n` +
	// 				  `👥 <b>Yo'lovchilar:</b> ${order.passengerCount} kishi\n` +
	// 				  `${order.hasParcel ? `📦 <b>Pochta:</b> Ha\n` : ''}` +
	// 				  `${order.parcelDescription ? `📝 <b>Tavsif:</b> ${order.parcelDescription}\n` : ''}\n` +
	// 				  `📞 Endi haydovchi bilan bog'laning va jo'nash vaqtini kelishing.`
	// 				: `✅ Водитель выбран!\n\n` +
	// 				  `👤 <b>Информация о водителе:</b>\n` +
	// 				  `• Имя: ${driver.fullName}\n` +
	// 				  `• Машина: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
	// 				  `• Вместимость: ${driver.maxPassengers} человек\n` +
	// 				  `• Телефон: ${driver.phone}\n\n` +
	// 				  `📍 <b>Направление:</b> ${order.fromRegion} → ${order.toRegion}\n` +
	// 				  `👥 <b>Пассажиры:</b> ${order.passengerCount} человек\n` +
	// 				  `${order.hasParcel ? `📦 <b>Посылка:</b> Да\n` : ''}` +
	// 				  `${
	// 						order.parcelDescription ? `📝 <b>Описание:</b> ${order.parcelDescription}\n` : ''
	// 				  }\n` +
	// 				  `📞 Теперь свяжитесь с водителем и договоритесь о времени отправления.`

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

	// 		await ctx.reply(driverInfoMessage, {
	// 			reply_markup: passengerKeyboard,
	// 			parse_mode: 'HTML'
	// 		})

	// 		console.log('✅ Haydovchi muvaffaqiyatli tanlandi')

	// 		// ============ HAYDOVCHIGA XABAR YUBORISH ============
	// 		const passengerName = passenger?.fullName || passenger?.username || 'Nomalum'
	// 		const passengerPhone = passenger?.phone || 'Korsatilmagan'

	// 		const orderForDriverMessage =
	// 			user.language === 'uz'
	// 				? `🚖 Sizga yangi buyurtma biriktirildi!\n\n` +
	// 				  `👤 <b>Yo'lovchi ma'lumotlari:</b>\n` +
	// 				  `• Ism: ${passengerName}\n` +
	// 				  `• Telefon: ${passengerPhone}\n\n` +
	// 				  `📍 <b>Yo'nalish:</b> ${order.fromRegion} → ${order.toRegion}\n` +
	// 				  `👥 <b>Yo'lovchilar:</b> ${order.passengerCount} kishi\n` +
	// 				  `${order.hasParcel ? `📦 <b>Pochta:</b> Ha\n` : ''}` +
	// 				  `${order.parcelDescription ? `📝 <b>Tavsif:</b> ${order.parcelDescription}\n` : ''}\n` +
	// 				  `💰 <b>Buyurtma raqami:</b> ${order._id}\n\n` +
	// 				  `✅ Buyurtmani qabul qilish uchun pastdagi tugmani bosing.`
	// 				: `🚖 Вам назначен новый заказ!\n\n` +
	// 				  `👤 <b>Информация о пассажире:</b>\n` +
	// 				  `• Имя: ${passengerName}\n` +
	// 				  `• Телефон: ${passengerPhone}\n\n` +
	// 				  `📍 <b>Направление:</b> ${order.fromRegion} → ${order.toRegion}\n` +
	// 				  `👥 <b>Пассажиры:</b> ${order.passengerCount} человек\n` +
	// 				  `${order.hasParcel ? `📦 <b>Посылка:</b> Да\n` : ''}` +
	// 				  `${
	// 						order.parcelDescription ? `📝 <b>Описание:</b> ${order.parcelDescription}\n` : ''
	// 				  }\n` +
	// 				  `💰 <b>Номер заказа:</b> ${order._id}\n\n` +
	// 				  `✅ Нажмите кнопку ниже, чтобы принять заказ.`

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

	// 		try {
	// 			await ctx.telegram.sendMessage(driver.telegramId, orderForDriverMessage, {
	// 				reply_markup: driverKeyboard,
	// 				parse_mode: 'HTML'
	// 			})
	// 			console.log('✅ Haydovchiga xabar yuborildi, chatId:', driver.telegramId)
	// 		} catch (telegramError) {
	// 			console.error('❌ Haydovchiga xabar yuborishda xatolik:', telegramError)

	// 			// Yo'lovchiga xatolik haqida xabar
	// 			await ctx.reply(
	// 				user.language === 'uz'
	// 					? `⚠️ Haydovchiga xabar yuborishda muammo yuz berdi. Iltimos, haydovchini shaxsan chaqiring:\n📞 ${driver.phone}`
	// 					: `⚠️ Проблема с отправкой сообщения водителю. Пожалуйста, свяжитесь с водителем лично:\n📞 ${driver.phone}`
	// 			)
	// 		}
	// 	} catch (error) {
	// 		console.error('❌ Select driver error:', error)
	// 		console.error('❌ Error details:', error.stack)

	// 		await ctx.reply(
	// 			user.language === 'uz'
	// 				? '❌ Haydovchi tanlashda xatolik yuz berdi.'
	// 				: '❌ Ошибка при выборе водителя.'
	// 		)
	// 	}
	// },

	// ============ HAYDOVCHI TANLASH ============
	handleDriverSelection: async (ctx, callbackData) => {
		const user = ctx.user

		try {
			console.log(`🚕 handleDriverSelection callbackData: ${callbackData}`)

			// Callback_data dan driverId va orderId ni ajratib olish
			const data = callbackData.replace('select_driver_', '')
			const ids = data.split('_')

			if (ids.length < 2) {
				console.error("❌ Noto'g'ri callback_data format:", callbackData)
				await ctx.reply(user.language === 'uz' ? "❌ Noto'g'ri format." : '❌ Неправильный формат.')
				return
			}

			const driverId = ids[0]
			const orderId = ids[1]

			console.log(`🚕 Haydovchi tanlandi: driverId=${driverId}, orderId=${orderId}`)

			// Driver va Order ni olish
			const driver = await Driver.findById(driverId).populate('carModel').populate('carType').exec()
			const order = await Order.findById(orderId).exec()

			if (!driver) {
				console.error('❌ Haydovchi topilmadi:', driverId)
				await ctx.reply(
					user.language === 'uz' ? '❌ Haydovchi topilmadi.' : '❌ Водитель не найден.'
				)
				return
			}

			if (!order) {
				console.error('❌ Buyurtma topilmadi:', orderId)
				await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
				return
			}

			// Order statusini yangilash (faqat selected qilamiz, confirmed emas)
			order.driverId = driver._id
			order.status = 'selected' // BU YERNI O'ZGARTIRDIK: 'confirmed' emas, 'selected'
			await order.save()

			// Yo'lovchi ma'lumotlarini olish
			const passenger = await User.findOne({ telegramId: order.userId }).exec()

			console.log('✅ Driver:', driver.fullName)
			console.log('✅ Order:', order._id)
			console.log('✅ Passenger:', passenger?.fullName || 'Nomalum')

			// Mashina modelini olish
			let carModelName = "Mashina nomi yo'q"
			let carTypeName = ''

			if (driver.carModel) {
				if (typeof driver.carModel === 'object' && driver.carModel.name) {
					carModelName =
						user.language === 'uz'
							? driver.carModel.name || "Mashina nomi yo'q"
							: driver.carModel.nameRu || driver.carModel.name || 'Нет названия машины'
				} else {
					carModelName = driver.carModel
				}
			}

			if (driver.carType) {
				if (typeof driver.carType === 'object') {
					carTypeName =
						user.language === 'uz'
							? driver.carType.name || ''
							: driver.carType.nameRu || driver.carType.name || ''
				} else {
					carTypeName = driver.carType
				}
			}

			// Yo'lovchiga haydovchi ma'lumotlarini ko'rsatish
			const driverInfoMessage =
				user.language === 'uz'
					? `✅ Haydovchi tanlandi!\n\n` +
					  `👤 <b>Haydovchi ma'lumotlari:</b>\n` +
					  `• Ism: ${driver.fullName}\n` +
					  `• Mashina: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
					  `• Sig'im: ${driver.maxPassengers} kishi\n` +
					  `• Telefon: ${driver.phone}\n\n` +
					  `📍 <b>Yo'nalish:</b> ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 <b>Yo'lovchilar:</b> ${order.passengerCount} kishi\n` +
					  `${order.hasParcel ? `📦 <b>Pochta:</b> Ha\n` : ''}` +
					  `${order.parcelDescription ? `📝 <b>Tavsif:</b> ${order.parcelDescription}\n` : ''}\n` +
					  `📞 <b>E'tibor bering:</b> Xabar haydovchiga "Buyurtma berish" tugmasini bosgandingizdan keyin yuboriladi.`
					: `✅ Водитель выбран!\n\n` +
					  `👤 <b>Информация о водителе:</b>\n` +
					  `• Имя: ${driver.fullName}\n` +
					  `• Машина: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
					  `• Вместимость: ${driver.maxPassengers} человек\n` +
					  `• Телефон: ${driver.phone}\n\n` +
					  `📍 <b>Направление:</b> ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 <b>Пассажиры:</b> ${order.passengerCount} человек\n` +
					  `${order.hasParcel ? `📦 <b>Посылка:</b> Да\n` : ''}` +
					  `${
							order.parcelDescription ? `📝 <b>Описание:</b> ${order.parcelDescription}\n` : ''
					  }\n` +
					  `📞 <b>Внимание:</b> Сообщение будет отправлено водителю только после нажатия кнопки "Подтвердить заказ".`

			const passengerKeyboard = {
				inline_keyboard: [
					[
						{
							text: user.language === 'uz' ? '✅ Buyurtma berish' : '✅ Подтвердить заказ',
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

			await ctx.reply(driverInfoMessage, {
				reply_markup: passengerKeyboard,
				parse_mode: 'HTML'
			})

			console.log('✅ Haydovchi muvaffaqiyatli tanlandi, xabar haydovchiga HALLI YUBORILMADI')

			// ============ MUHIM: HAYDOVCHIGA XABAR YUBORISHNI O'CHIRAMIZ ============
			// Bu qismni TO'LIQ O'CHIRAMIZ yoki komment qilamiz
			// Xabar faqat "Buyurtma berish" tugmasini bosganda yuboriladi

			/*
        // BU QISMNING HAMMASINI KOMMENT QILING YOKI O'CHIRING
        const passengerName = passenger?.fullName || passenger?.username || 'Nomalum'
        const passengerPhone = passenger?.phone || 'Korsatilmagan'
        
        const orderForDriverMessage = ...
        
        const driverKeyboard = ...
        
        try {
            await ctx.telegram.sendMessage(driver.telegramId, orderForDriverMessage, {
                reply_markup: driverKeyboard,
                parse_mode: 'HTML'
            })
            console.log('✅ Haydovchiga xabar yuborildi, chatId:', driver.telegramId)
        } catch (telegramError) {
            console.error('❌ Haydovchiga xabar yuborishda xatolik:', telegramError)
        }
        */
		} catch (error) {
			console.error('❌ Select driver error:', error)
			console.error('❌ Error details:', error.stack)

			await ctx.reply(
				user.language === 'uz'
					? '❌ Haydovchi tanlashda xatolik yuz berdi.'
					: '❌ Ошибка при выборе водителя.'
			)
		}
	},
	// ============ BUYURTMA TASDIQLASH ============
	// ============ BUYURTMA TASDIQLASH ============
	// passenger.js faylida, confirmOrder funksiyasi:
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

	// ============ BUYURTMA BEKOR QILISH ============
	cancelOrder: async (ctx, callbackData) => {
		const user = ctx.user
		const orderId = callbackData.split('_')[2]

		try {
			console.log(`❌ cancelOrder: orderId=${orderId}`)

			const order = await Order.findById(orderId)

			if (!order) {
				await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
				return
			}

			// Faqat buyurtma egasi bekor qilishi mumkin
			if (order.userId !== user.telegramId) {
				await ctx.reply(
					user.language === 'uz'
						? '❌ Siz bu buyurtmani bekor qila olmaysiz.'
						: '❌ Вы не можете отменить этот заказ.'
				)
				return
			}

			// Statusni yangilash
			order.status = 'cancelled'
			await order.save()

			// Yo'lovchiga xabar
			await ctx.reply(user.language === 'uz' ? '❌ Buyurtma bekor qilindi.' : '❌ Заказ отменен.')

			// Haydovchiga xabar (agar haydovchi tanlangan bo'lsa)
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
					? '❌ Buyurtmani bekor qilishda xatolik yuz berdi.'
					: '❌ Ошибка при отмене заказа.'
			)
		}
	},

	// ============ HAYDOVCHI BUYURTMANI QABUL QILISHI ============
	// driverAcceptOrder: async (ctx, callbackData) => {
	// 	const user = ctx.user
	// 	const orderId = callbackData.split('_')[2]

	// 	try {
	// 		console.log(`✅ driverAcceptOrder: orderId=${orderId}`)

	// 		const order = await Order.findById(orderId).populate('driverId')

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

	// 		order.status = 'accepted'
	// 		await order.save()

	// 		order.driverId.totalOrders = (order.driverId.totalOrders || 0) + 1
	// 		await order.driverId.save()

	// 		await ctx.reply(
	// 			user.language === 'uz'
	// 				? "✅ Buyurtmani qabul qildingiz! Yo'lovchi bilan bog'laning."
	// 				: '✅ Вы приняли заказ! Свяжитесь с пассажиром.'
	// 		)

	// 		await ctx.telegram.sendMessage(
	// 			order.userId,
	// 			user.language === 'uz'
	// 				? "✅ Haydovchi buyurtmangizni qabul qildi! Tez orada siz bilan bog'lanadi."
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
	// },

	// order.js faylida driverAcceptOrder funksiyasini quyidagicha yangilang:

	driverAcceptOrder: async (ctx, callbackData) => {
		const user = ctx.user
		const orderId = callbackData.split('_')[2]

		try {
			console.log(`✅ driverAcceptOrder: orderId=${orderId}`)

			// 1. Order ni olish
			const order = await Order.findById(orderId).populate('driverId')

			if (!order) {
				await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
				return
			}

			console.log('📊 Order found:', order._id)
			console.log('🚗 Driver:', order.driverId?.fullName)
			console.log('👤 Current user:', user.telegramId)

			// 2. Haydovchi tekshirish
			if (!order.driverId) {
				await ctx.reply(
					user.language === 'uz'
						? '❌ Bu buyurtmada haydovchi tanlanmagan.'
						: '❌ В этом заказе водитель не выбран.'
				)
				return
			}

			if (order.driverId.telegramId !== user.telegramId) {
				console.log('❌ Driver mismatch:', {
					orderDriverId: order.driverId.telegramId,
					currentUserId: user.telegramId
				})
				await ctx.reply(
					user.language === 'uz'
						? '❌ Siz bu buyurtmani qabul qila olmaysiz.'
						: '❌ Вы не можете принять этот заказ.'
				)
				return
			}

			// 3. Haydovchini yangi so'rov bilan olish (tazalash)
			const freshDriver = await Driver.findById(order.driverId._id)
			if (!freshDriver) {
				await ctx.reply(
					user.language === 'uz' ? '❌ Haydovchi topilmadi.' : '❌ Водитель не найден.'
				)
				return
			}

			console.log('📊 Fresh driver data:', {
				id: freshDriver._id,
				name: freshDriver.fullName,
				maxPassengers: freshDriver.maxPassengers,
				telegramId: freshDriver.telegramId
			})

			// 4. Haydovchini tekshirish (bo'sh o'rinlar yetarli mi?)
			if (freshDriver.maxPassengers < order.passengerCount) {
				await ctx.reply(
					user.language === 'uz'
						? `❌ Sizning mashinangizda faqat ${freshDriver.maxPassengers} kishi sig'adi. ` +
								`Buyurtmada ${order.passengerCount} kishi bor.`
						: `❌ В вашей машине может поместиться только ${freshDriver.maxPassengers} человек. ` +
								`В заказе ${order.passengerCount} человек.`
				)
				return
			}

			// 5. Buyurtma statusini yangilash
			order.status = 'accepted'
			await order.save()

			console.log('✅ Order status updated to:', order.status)

			// 6. Haydovchining bo'sh o'rinlarini yangilash
			const oldMaxPassengers = freshDriver.maxPassengers
			freshDriver.maxPassengers = freshDriver.maxPassengers - order.passengerCount
			freshDriver.totalOrders = (freshDriver.totalOrders || 0) + 1

			// 7. Yangilangan ma'lumotlarni saqlash
			await freshDriver.save()

			console.log(
				`✅ Driver ${freshDriver.fullName} bo'sh o'rinlari: ${oldMaxPassengers} → ${freshDriver.maxPassengers}`
			)

			// 8. Haydovchiga xabar
			const driverMessage =
				user.language === 'uz'
					? `✅ Buyurtmani qabul qildingiz!\n\n` +
					  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
					  `📞 Yo'lovchi telefon: ${order.phone}\n` +
					  `🚗 <b>Bo'sh o'rinlar yangilandi:</b>\n` +
					  `• Avval: ${oldMaxPassengers} ta\n` +
					  `• Endi: ${freshDriver.maxPassengers} ta\n\n` +
					  `✅ Yo'lovchi bilan bog'laning va jo'nash vaqtini kelishing.`
					: `✅ Вы приняли заказ!\n\n` +
					  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 Пассажиры: ${order.passengerCount} человек\n` +
					  `📞 Телефон пассажира: ${order.phone}\n` +
					  `💰 Номер заказа: ${order._id}\n\n` +
					  `🚗 <b>Свободные места обновлены:</b>\n` +
					  `• Было: ${oldMaxPassengers} мест\n` +
					  `• Стало: ${freshDriver.maxPassengers} мест\n\n` +
					  `✅ Свяжитесь с пассажиром и договоритесь о времени отправления.`

			await ctx.reply(driverMessage, { parse_mode: 'HTML' })

			// 9. Yo'lovchiga xabar
			const passengerUser = await User.findOne({ telegramId: order.userId })
			const passengerLanguage = passengerUser?.language || 'uz'

			const passengerMessage =
				passengerLanguage === 'uz'
					? `✅ Haydovchi buyurtmangizni qabul qildi!\n\n` +
					  `🚗 Haydovchi: ${freshDriver.fullName}\n` +
					  `📞 Telefon: ${freshDriver.phone}\n` +
					  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
					  `✅ Tez orada haydovchi siz bilan bog'lanadi.`
					: `✅ Водитель принял ваш заказ!\n\n` +
					  `🚗 Водитель: ${freshDriver.fullName}\n` +
					  `📞 Телефон: ${freshDriver.phone}\n` +
					  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 Пассажиры: ${order.passengerCount} человек\n` +
					  `💰 Номер заказа: ${order._id}\n\n` +
					  `✅ Водитель скоро свяжется с вами.`

			await ctx.telegram.sendMessage(order.userId, passengerMessage)

			// 10. Konsolga ma'lumot chiqarish
			console.log('📊 Final driver data after update:', {
				driverId: freshDriver._id,
				name: freshDriver.fullName,
				maxPassengers: freshDriver.maxPassengers,
				totalOrders: freshDriver.totalOrders
			})
		} catch (error) {
			console.error('❌ Driver accept order error:', error)
			console.error('❌ Error details:', error.stack)

			await ctx.reply(
				user.language === 'uz'
					? '❌ Buyurtma qabul qilishda xatolik yuz berdi.'
					: '❌ Ошибка при принятии заказа.'
			)
		}
	},

	// ============ HAYDOVCHI BUYURTMANI RAD ETISHI ============
	driverRejectOrder: async (ctx, callbackData) => {
		const user = ctx.user
		const orderId = callbackData.split('_')[2]

		try {
			console.log(`❌ driverRejectOrder: orderId=${orderId}`)

			const order = await Order.findById(orderId).populate('driverId')

			if (!order) {
				await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
				return
			}

			if (!order.driverId || order.driverId.telegramId !== user.telegramId) {
				await ctx.reply(
					user.language === 'uz'
						? '❌ Siz bu buyurtmani rad eta olmaysiz.'
						: '❌ Вы не можете отклонить этот заказ.'
				)
				return
			}

			order.status = 'rejected'
			order.driverId = null
			await order.save()

			await ctx.reply(
				user.language === 'uz' ? '❌ Buyurtmani rad etdingiz.' : '❌ Вы отклонили заказ.'
			)

			await ctx.telegram.sendMessage(
				order.userId,
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
	},
	// showUnmatchedRoutes: async (ctx) => {
	//     const user = ctx.user

	//     try {
	//         console.log('🔍 ========== showUnmatchedRoutes START ==========')

	//         // 1. Haydovchining profili borligini tekshirish
	//         const driver = await Driver.findOne({ telegramId: user.telegramId })

	//         if (!driver) {
	//             await ctx.reply(
	//                 user.language === 'uz'
	//                     ? '❌ Haydovchi profilingiz topilmadi. Avval profil yarating.'
	//                     : '❌ Ваш профиль водителя не найден. Сначала создайте профиль.'
	//             )
	//             return
	//         }

	//         // 2. Haydovchining faol ekanligini tekshirish
	//         if (driver.status !== 'active') {
	//             await ctx.reply(
	//                 user.language === 'uz'
	//                     ? '❌ Sizning profilingiz faol emas. Faollashtiring.'
	//                     : '❌ Ваш профиль не активен. Активируйте его.'
	//             )
	//             return
	//         }

	//         // 3. Topilmagan yo'nalishlarni olish (vaqti o'tmagan va autoClosed bo'lmagan)
	//         const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

	//         const unmatchedOrders = await Order.find({
	//             $and: [
	//                 {
	//                     $or: [
	//                         { fromRegion: { $ne: driver.fromRegion } },
	//                         { toRegion: { $ne: driver.toRegion } }
	//                     ]
	//                 },
	//                 {
	//                     status: 'pending',
	//                     createdAt: { $gte: sevenDaysAgo },
	//                     autoClosed: false
	//                 }
	//             ]
	//         })
	//         .sort({ createdAt: -1 })
	//         .limit(20) // Ko'pi bilan 20 ta buyurtma ko'rsatish

	//         console.log(`📊 Topilmagan yo'nalishlar: ${unmatchedOrders.length} ta`)

	//         if (unmatchedOrders.length === 0) {
	//             const message = user.language === 'uz'
	//                 ? `📭 Hozircha topilmagan yo'nalishlar mavjud emas.\n\n` +
	//                   `📍 Sizning yo'nalishingiz: ${driver.fromRegion} → ${driver.toRegion}\n` +
	//                   `⏰ So'nggi 7 kun ichida boshqa yo'nalishlarda buyurtma berilmagan.`
	//                 : `📭 Нет неподходящих направлений в данный момент.\n\n` +
	//                   `📍 Ваше направление: ${driver.fromRegion} → ${driver.toRegion}\n` +
	//                   `⏰ За последние 7 дней не было заказов по другим направлениям.`

	//             await ctx.reply(message)
	//             return
	//         }

	//         // 4. Ko'rsatish uchun xabar tayyorlash
	//         let message = user.language === 'uz'
	//             ? `🔍 Topilmagan yo'nalishlar (so'nggi 7 kun)\n\n` +
	//               `📍 Sizning yo'nalishingiz: ${driver.fromRegion} → ${driver.toRegion}\n\n` +
	//               `📊 Boshqa yo'nalishlardagi buyurtmalar:\n`
	//             : `🔍 Неподходящие направления (последние 7 дней)\n\n` +
	//               `📍 Ваше направление: ${driver.fromRegion} → ${driver.toRegion}\n\n` +
	//               `📊 Заказы по другим направлениям:\n`

	//         // 5. Har bir buyurtmani chiroyli formatda ko'rsatish
	//         const inlineKeyboard = []

	//         unmatchedOrders.forEach((order, index) => {
	//             // Buyurtma ma'lumotlari
	//             const passengerCountText = user.language === 'uz'
	//                 ? `${order.passengerCount} kishi`
	//                 : `${order.passengerCount} человек`

	//             const parcelText = order.hasParcel
	//                 ? (user.language === 'uz' ? '📦 Ha' : '📦 Да')
	//                 : (user.language === 'uz' ? '📦 Yo\'q' : '📦 Нет')

	//             const timeAgo = getTimeAgo(order.createdAt, user.language)

	//             // Xabarga qo'shish
	//             message += `\n${index + 1}. ${order.fromRegion} → ${order.toRegion}\n`
	//             message += `   👤 @${order.username || 'noma\'lum'}\n`
	//             message += `   👥 ${passengerCountText}\n`
	//             message += `   ${parcelText}\n`
	//             message += `   ⏰ ${timeAgo}\n`

	//             // Tugma yaratish (buyurtmani ko'rish uchun)
	//             inlineKeyboard.push([
	//                 {
	//                     text: user.language === 'uz'
	//                         ? `👁️ ${index + 1}. ${order.fromRegion} → ${order.toRegion}`
	//                         : `👁️ ${index + 1}. ${order.fromRegion} → ${order.toRegion}`,
	//                     callback_data: `view_unmatched_${order._id}`
	//                 }
	//             ])
	//         })

	//         // 6. Statistik ma'lumot
	//         message += `\n📊 Jami: ${unmatchedOrders.length} ta buyurtma\n`
	//         message += user.language === 'uz'
	//             ? `ℹ️ Bu buyurtmalar adminlar kanaliga yuborilgan.\n`
	//             : `ℹ️ Эти заказы отправлены в канал администраторов.\n`

	//         // 7. Navigatsiya tugmalari
	//         inlineKeyboard.push([
	//             {
	//                 text: user.language === 'uz' ? '🔄 Yangilash' : '🔄 Обновить',
	//                 callback_data: 'refresh_unmatched'
	//             },
	//             {
	//                 text: user.language === 'uz' ? '🏠 Asosiy menyu' : '🏠 Главное меню',
	//                 callback_data: 'main_menu'
	//             }
	//         ])

	//         // 8. Xabarni yuborish
	//         await ctx.reply(message, {
	//             reply_markup: {
	//                 inline_keyboard: inlineKeyboard
	//             },
	//             parse_mode: 'HTML'
	//         })

	//         console.log('✅ showUnmatchedRoutes END ==========')

	//     } catch (error) {
	//         console.error('❌ showUnmatchedRoutes error:', error)

	//         await ctx.reply(
	//             user.language === 'uz'
	//                 ? "❌ Topilmagan yo'nalishlarni ko'rsatishda xatolik yuz berdi."
	//                 : '❌ Ошибка при отображении неподходящих направлений.'
	//         )
	//     }
	// },

	// ============ TOPILMAGAN YO'NALISHLARNI YANGILASH ============

	// order.js faylida
	// handlers/order.js faylida
	showUnmatchedRoutes: async (ctx, page = 1) => {
		const user = ctx.user

		try {
			console.log('🔍 ========== showUnmatchedRoutes START ==========')

			// 1. Faqat haydovchilar uchun
			if (user.role !== 'driver') {
				await ctx.reply(
					user.language === 'uz'
						? '❌ Bu funksiya faqat haydovchilar uchun mavjud.'
						: '❌ Эта функция доступна только для водителей.'
				)
				return
			}

			// 2. Pagination settings
			const limit = 5
			const skip = (page - 1) * limit

			// 3. 7 kun oldingi vaqt
			const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

			// 4. Filtr
			const filter = {
				status: 'pending',
				driverFound: false,
				autoClosed: false,
				createdAt: { $gte: sevenDaysAgo }
			}

			// 5. Orderlarni olish
			const unmatchedOrders = await Order.find(filter)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)

			const totalOrders = await Order.countDocuments(filter)
			const totalPages = Math.max(1, Math.ceil(totalOrders / limit))

			console.log(
				`📊 Haydovchi topilmagan buyurtmalar: ${unmatchedOrders.length} ta, Sahifa: ${page}/${totalPages}`
			)

			if (unmatchedOrders.length === 0) {
				const message =
					user.language === 'uz'
						? `📭 Hozircha haydovchi topilmagan buyurtmalar mavjud emas.\n\n⏰ So'nggi 7 kun ichida haydovchi topilmagan buyurtmalar yo'q.`
						: `📭 Нет заказов без водителей в данный момент.\n\n⏰ За последние 7 дней не было заказов без водителей.`
				await ctx.reply(message)
				return
			}

			// ✅ 6. Faqat sarlavha (user text ro‘yxat YO‘Q)
			const message = user.language === 'uz' ? `Topilmagan haydovchilar` : `Не найденные водители`

			// 7. Faqat tugmalar (orderlar)
			const inlineKeyboard = []

			unmatchedOrders.forEach(order => {
				const passengerCountText =
					user.language === 'uz' ? `${order.passengerCount} kishi` : `${order.passengerCount} чел`

				inlineKeyboard.push([
					{
						text: `${order.username || order.fullName || 'User'} | ${passengerCountText} | ${
							order.fromRegion
						}→${order.toRegion}`,
						callback_data: `view_unmatched_${order._id}`
					}
				])
			})

			// ✅ 8. REGIONS — BUTUNLAY O‘CHDI (hech qanday region tugma yo‘q)

			// 9. Pagination (bitta qator)
			const paginationRow = []

			if (page > 1) {
				paginationRow.push({
					text: user.language === 'uz' ? '« Ortga' : '« Назад',
					callback_data: `unmatched_page_${page - 1}`
				})
			}

			paginationRow.push({
				text: `[ ${page} ]`,
				callback_data: 'current_page'
			})

			if (page < totalPages) {
				paginationRow.push({
					text: user.language === 'uz' ? 'Keyingi »' : 'Далее »',
					callback_data: `unmatched_page_${page + 1}`
				})
			}

			inlineKeyboard.push(paginationRow)

			// 10. Yuborish
			await ctx.reply(message, {
				reply_markup: { inline_keyboard: inlineKeyboard }
			})

			console.log('✅ showUnmatchedRoutes END ==========')
		} catch (error) {
			console.error('❌ showUnmatchedRoutes error:', error)
			await ctx.reply(
				user.language === 'uz'
					? "❌ Haydovchi topilmagan buyurtmalarni ko'rsatishda xatolik yuz berdi."
					: '❌ Ошибка при отображении заказов без водителей.'
			)
		}
	},

	// refreshUnmatchedRoutes: async ctx => {
	// 	const user = ctx.user

	// 	try {
	// 		// Oldingi xabarni o'chirish
	// 		await ctx.deleteMessage()

	// 		// Yangi ma'lumotlarni ko'rsatish
	// 		await module.exports.showUnmatchedRoutes(ctx)

	// 		await ctx.answerCbQuery(user.language === 'uz' ? '✅ Yangilandi' : '✅ Обновлено')
	// 	} catch (error) {
	// 		console.error('Refresh unmatched routes error:', error)
	// 		await ctx.answerCbQuery(user.language === 'uz' ? '❌ Xatolik' : '❌ Ошибка')
	// 	}
	// },
	// handlers/order.js faylida
	refreshUnmatchedRoutes: async ctx => {
		const user = ctx.user

		try {
			// Oldingi xabarni o'chirish (agar mavjud bo'lsa)
			try {
				if (ctx.callbackQuery && ctx.callbackQuery.message) {
					await ctx.deleteMessage()
				}
			} catch (deleteError) {
				console.log('Delete message error (non-critical):', deleteError.message)
			}

			// Yangi ma'lumotlarni ko'rsatish (1-sahifadan boshlab)
			await module.exports.showUnmatchedRoutes(ctx, 1)

			await ctx.answerCbQuery(user.language === 'uz' ? '✅ Yangilandi' : '✅ Обновлено')
		} catch (error) {
			console.error('Refresh unmatched routes error:', error)
			await ctx.answerCbQuery(user.language === 'uz' ? '❌ Xatolik' : '❌ Ошибка')
		}
	},

	viewUnmatchedOrder: async (ctx, callbackData) => {
		const user = ctx.user

		try {
			const orderId = callbackData.replace('view_unmatched_', '')

			const order = await Order.findById(orderId)

			if (!order) {
				await ctx.answerCbQuery(
					user.language === 'uz' ? '❌ Buyurtma topilmadi' : '❌ Заказ не найден'
				)
				return
			}

			// Batafsil ma'lumotlar
			const passengerCountText =
				user.language === 'uz' ? `${order.passengerCount} kishi` : `${order.passengerCount} человек`

			const parcelStatus = order.hasParcel
				? user.language === 'uz'
					? '📦 Pochta bor'
					: '📦 Посылка есть'
				: user.language === 'uz'
				? "📦 Pochta yo'q"
				: '📦 Посылки нет'

			const timeAgo = getTimeAgo(order.createdAt, user.language)

			// formatPhoneNumber funksiyasidan foydalanish
			const phoneNumber =
				formatPhoneNumber(order.phone) || (user.language === 'uz' ? "Ko'rsatilmagan" : 'Не указан')

			const message =
				user.language === 'uz'
					? `🔍 **Batafsil ma'lumot**\n` +
					  `════════════════════════════\n` +
					  `👤 **Yo'lovchi:** ${order.fullName || order.username || 'Nomalum'}\n` +
					  `📞 **Telefon:** ${phoneNumber}\n` +
					  `📍 **Yo'nalish:** ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 **Yo'lovchilar:** ${passengerCountText}\n` +
					  `${parcelStatus}\n` +
					  (order.parcelDescription ? `📝 **Tavsif:** ${order.parcelDescription}\n` : '') +
					  `⏰ **Vaqt:** ${timeAgo}\n` +
					  `════════════════════════════\n\n` +
					  `ℹ️ Bu buyurtmaga hali haydovchi topilmagan.`
					: `🔍 **Подробная информация**\n` +
					  `════════════════════════════\n` +
					  `👤 **Пассажир:** ${order.fullName || order.username || 'Неизвестно'}\n` +
					  `📞 **Телефон:** ${phoneNumber}\n` +
					  `📍 **Направление:** ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 **Пассажиры:** ${passengerCountText}\n` +
					  `${parcelStatus}\n` +
					  (order.parcelDescription ? `📝 **Описание:** ${order.parcelDescription}\n` : '') +
					  `⏰ **Время:** ${timeAgo}\n` +
					  `ℹ️ Для этого заказа еще не найден водитель.`

			const keyboard = {
				inline_keyboard: [
					[
						{
							text: user.language === 'uz' ? "📞 Bog'lanish" : '📞 Связаться',
							callback_data: `contact_passenger_${order._id}`
						}
					],
					[
						{
							text: user.language === 'uz' ? '⬅️ Orqaga' : '⬅️ Назад',
							callback_data: 'back_to_unmatched'
						}
					]
				]
			}

			await ctx.reply(message, {
				reply_markup: keyboard
			})

			await ctx.answerCbQuery()
		} catch (error) {
			console.error('View unmatched order error:', error)
			await ctx.answerCbQuery(user.language === 'uz' ? '❌ Xatolik' : '❌ Ошибка')
		}
	},
	// ============ YO'LOVCHI BILAN BOG'LANISH ============
	contactPassenger: async (ctx, callbackData) => {
		const user = ctx.user

		try {
			const orderId = callbackData.replace('contact_passenger_', '')

			const order = await Order.findById(orderId)

			if (!order) {
				await ctx.answerCbQuery(
					user.language === 'uz' ? '❌ Buyurtma topilmadi' : '❌ Заказ не найден'
				)
				return
			}

			// Haydovchi ma'lumotlarini olish
			const driver = await Driver.findOne({ telegramId: user.telegramId })

			if (!driver) {
				await ctx.answerCbQuery(
					user.language === 'uz' ? '❌ Profilingiz topilmadi' : '❌ Профиль не найден'
				)
				return
			}

			// Yo'lovchiga xabar yuborish
			const passengerMessage =
				user.language === 'uz'
					? `👋 Salom! Men haydovchi ${driver.fullName}.\n\n` +
					  `🚗 Sizning buyurtmangizni ko'rdim:\n` +
					  `📍 ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 ${order.passengerCount} kishi\n\n` +
					  `ℹ️ Mana mening ma'lumotlarim:\n` +
					  `👤 Ism: ${driver.fullName}\n` +
					  `📞 Telefon: ${driver.phone}\n` +
					  `🚗 Mashina: ${driver.carModel?.name || 'Mashina'}\n` +
					  `👥 Sig'im: ${driver.maxPassengers} kishi\n\n` +
					  `✅ Bu yo'nalishda ham boraman. Qo'shilsangiz, bog'laning!`
					: `👋 Привет! Я водитель ${driver.fullName}.\n\n` +
					  `🚗 Я увидел ваш заказ:\n` +
					  `📍 ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 ${order.passengerCount} человек\n\n` +
					  `ℹ️ Вот мои данные:\n` +
					  `👤 Имя: ${driver.fullName}\n` +
					  `📞 Телефон: ${driver.phone}\n` +
					  `🚗 Машина: ${driver.carModel?.name || 'Машина'}\n` +
					  `👥 Вместимость: ${driver.maxPassengers} человек\n\n` +
					  `✅ Я тоже еду в этом направлении. Если хотите присоединиться, свяжитесь!`

			try {
				await ctx.telegram.sendMessage(order.userId, passengerMessage)

				// Haydovchiga xabar
				await ctx.reply(
					user.language === 'uz'
						? `✅ Yo'lovchiga xabar yuborildi!\n\n` +
								`📞 Yo'lovchi telefon raqami: ${order.phone}\n` +
								`👤 Yo'lovchi: @${order.username || "noma'lum"}\n` +
								`📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n\n` +
								`ℹ️ Endi yo'lovchi siz bilan bog'lanishi mumkin.`
						: `✅ Сообщение отправлено пассажиру!\n\n` +
								`📞 Телефон пассажира: ${order.phone}\n` +
								`👤 Пассажир: @${order.username || 'неизвестно'}\n` +
								`📍 Направление: ${order.fromRegion} → ${order.toRegion}\n\n` +
								`ℹ️ Теперь пассажир может связаться с вами.`
				)

				// Buyurtma statusini yangilash
				order.status = 'contacted'
				await order.save()
			} catch (telegramError) {
				console.error('Telegram send error:', telegramError)

				// Agar yo'lovchi bloklagan bo'lsa
				await ctx.reply(
					user.language === 'uz'
						? `❌ Yo'lovchiga xabar yuborib bo'lmadi.\n\n` +
								`📞 Yo'lovchi telefon raqami: ${order.phone}\n` +
								`👤 Siz o'zingiz telefon qilishingiz kerak.`
						: `❌ Не удалось отправить сообщение пассажиру.\n\n` +
								`📞 Телефон пассажира: ${order.phone}\n` +
								`👤 Вам нужно позвонить самим.`
				)
			}

			await ctx.answerCbQuery()
		} catch (error) {
			console.error('Contact passenger error:', error)
			await ctx.answerCbQuery(user.language === 'uz' ? '❌ Xatolik' : '❌ Ошибка')
		}
	},

	backToUnmatched: async ctx => {
		const user = ctx.user

		try {
			// Oldingi xabarni o'chirish
			try {
				await ctx.deleteMessage()
			} catch (deleteError) {
				console.log('Delete message error:', deleteError.message)
			}

			// Asosiy ro'yxatga qaytish (1-sahifadan)
			await module.exports.showUnmatchedRoutes(ctx, 1)

			await ctx.answerCbQuery()
		} catch (error) {
			console.error('Back to unmatched error:', error)
			await ctx.answerCbQuery(user.language === 'uz' ? '❌ Xatolik' : '❌ Ошибка')
		}
	},
	showUnmatchedRoutesByRegion: async (ctx, region, page = 1) => {
		const user = ctx.user

		try {
			console.log('📍 ========== showUnmatchedRoutesByRegion START ==========')

			// 1. Faqat haydovchilar uchun
			if (user.role !== 'driver') {
				await ctx.reply(
					user.language === 'uz'
						? '❌ Bu funksiya faqat haydovchilar uchun mavjud.'
						: '❌ Эта функция доступна только для водителей.'
				)
				return
			}

			// 2. Pagination settings
			const limit = 5
			const skip = (page - 1) * limit

			// 3. 7 kun oldingi vaqt
			const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

			// 4. FILTR: faqat tanlangan viloyatdagi buyurtmalar
			const filter = {
				fromRegion: region,
				status: 'pending',
				driverFound: false,
				autoClosed: false,
				createdAt: { $gte: sevenDaysAgo }
			}

			// 5. Buyurtmalarni olish
			const unmatchedOrders = await Order.find(filter)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)

			const totalOrders = await Order.countDocuments(filter)
			const totalPages = Math.ceil(totalOrders / limit)

			console.log(
				`📍 ${region} viloyatidagi buyurtmalar: ${unmatchedOrders.length} ta, Sahifa: ${page}/${totalPages}`
			)

			if (unmatchedOrders.length === 0) {
				const message =
					user.language === 'uz'
						? `📭 ${region} viloyatida haydovchi topilmagan buyurtmalar mavjud emas.\n\n` +
						  `⏰ So'nggi 7 kun ichida ${region} viloyatidan buyurtma berilmagan.`
						: `📭 В области ${region} нет заказов без водителей.\n\n` +
						  `⏰ За последние 7 дней не было заказов из области ${region}.`

				await ctx.reply(message)
				return
			}

			// 6. Xabar tayyorlash - SKRINSHOTDAGI FORMATDA
			let message = ''

			if (user.language === 'uz') {
				message = `Topilmagan haydovchilar\n` + `\n\n`
			} else {
				message = `Не найденные водители\n` + `\n\n`
			}

			// 7. Har bir buyurtmani skrinshotdagi formatda ko'rsatish
			// const inlineKeyboard = []

			// unmatchedOrders.forEach((order, index) => {
			// 	const passengerCountText =
			// 		user.language === 'uz' ? `${order.passengerCount} kishi` : `${order.passengerCount} чел`

			// 	const parcelText = order.hasParcel
			// 		? user.language === 'uz'
			// 			? 'pochta bor'
			// 			: 'посылка есть'
			// 		: user.language === 'uz'
			// 		? 'pochta yo‘q'
			// 		: 'посылки нет'

			// 	// Buyurtma qatorini qo'shish (SKRINSHOT FORMATDA)
			// 	message +=
			// 		`${order.username || order.fullName || 'Nomalum'}  ||  ` +
			// 		`${passengerCountText}  ||  ` +
			// 		`${parcelText}\n`

			// 	// TUGMA: Ism emas, yo'nalish ham emas - Batafsil ko'rish uchun
			// 	inlineKeyboard.push([
			// 		{
			// 			text: `${order.username || 'User'} | ${order.passengerCount}kishi | ${order.toRegion}`,
			// 			callback_data: `view_unmatched_${order._id}`
			// 		}
			// 	])
			// })

			// // 8. Chiziq qo'shish
			// message += `\n────────────────────────────\n`

			// 9. VILOYAT FILTRLARI - HAMMASI BIR QATORDAGI 3 TA TUGMA
			// const regions = ['Toshkent', 'Samarqand', 'Namangan', 'Barchasi']

			// const regionButtons = regions.map(regionName => ({
			// 	text:
			// 		regionName === 'Barchasi'
			// 			? user.language === 'uz'
			// 				? '🌍 Barchasi'
			// 				: '🌍 Все'
			// 			: regionName,
			// 	callback_data:
			// 		regionName === 'Barchasi'
			// 			? 'show_unmatched_routes'
			// 			: `filter_region_${regionName.toLowerCase()}_1`
			// }))

			// 4 ta viloyatni 2 qatorga joylash (2x2)
			inlineKeyboard.push(regionButtons.slice(0, 2))
			inlineKeyboard.push(regionButtons.slice(2, 4))

			// 10. Pagination tugmalari (RASMDAGIDEK - bitta qator)
			const paginationRow = []

			if (page > 1) {
				paginationRow.push({
					text: user.language === 'uz' ? '« Ortga' : '« Назад',
					callback_data: `filter_region_${region}_${page - 1}`
				})
			}

			// Joriy sahifa
			paginationRow.push({
				text: `[ ${page} ]`,
				callback_data: 'current_page'
			})

			if (page < totalPages) {
				paginationRow.push({
					text: user.language === 'uz' ? 'Keyingi »' : 'Далее »',
					callback_data: `filter_region_${region}_${page + 1}`
				})
			}

			if (paginationRow.length > 0) {
				inlineKeyboard.push(paginationRow)
			}

			// 11. Xabarni yuborish
			await ctx.reply(message, {
				reply_markup: { inline_keyboard: inlineKeyboard },
				parse_mode: 'Markdown'
			})

			console.log('✅ showUnmatchedRoutesByRegion END ==========')
		} catch (error) {
			console.error('❌ showUnmatchedRoutesByRegion error:', error)
			await ctx.reply(
				user.language === 'uz'
					? "❌ Viloyat bo'yicha buyurtmalarni ko'rsatishda xatolik yuz berdi."
					: '❌ Ошибка при отображении заказов по региону.'
			)
		}
	}
}
