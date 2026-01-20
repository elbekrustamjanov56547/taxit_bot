const Order = require('../models/Order')
const Driver = require('../models/Driver')
const User = require('../models/User')
const states = require('../utils/states')
const keyboards = require('../keyboards/main')
const regionKeyboards = require('../keyboards/regions')

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
	}
}
