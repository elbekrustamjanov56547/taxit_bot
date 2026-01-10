const Order = require('../models/Order')
const Driver = require('../models/Driver')
const User = require('../models/User')
const states = require('../utils/states')
const keyboards = require('../keyboards/main')
const regionKeyboards = require('../keyboards/regions')

module.exports = {
	// ============ HAYDOVCHI TANLASH ============
	handleDriverSelection: async (ctx, callbackData) => {
		const user = ctx.user

		try {
			console.log(`🚕 handleDriverSelection callbackData: ${callbackData}`)

			// Callback_data dan driverId va orderId ni ajratib olish
			// Format: select_driver_DRIVERID_ORDERID
			const data = callbackData.replace('select_driver_', '')
			const ids = data.split('_')

			if (ids.length < 2) {
				console.error("❌ Noto'g'ri callback_data format:", callbackData)
				await ctx.reply(user.language === 'uz' ? "❌ Noto'g'ri format." : '❌ Неправильный формат.')
				return
			}

			const driverId = ids[0] // Birinchi qism - driverId
			const orderId = ids[1] // Ikkinchi qism - orderId

			console.log(`🚕 Haydovchi tanlandi: driverId=${driverId}, orderId=${orderId}`)

			// Driver va Order ni olish
			const driver = await Driver.findById(driverId).populate('carModel').populate('carType')
			const order = await Order.findById(orderId)

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

			// Order statusini yangilash
			order.driverId = driver._id
			order.status = 'selected'
			await order.save()

			// Mashina modelini olish
			let carModelName = "Mashina nomi yo'q"
			let carTypeName = ''

			if (driver.carModel) {
				if (typeof driver.carModel === 'object') {
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
					  `👤 Ism: ${driver.fullName}\n` +
					  `🚗 Mashina: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
					  `👥 Sig'im: ${driver.maxPassengers} kishi\n` +
					  `📞 Telefon: ${driver.phone}\n` +
					  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
					  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
					  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n\n` : '\n'}` +
					  `Haydovchi bilan bog'laning va jo'nash vaqtini kelishing.`
					: `✅ Водитель выбран!\n\n` +
					  `👤 Имя: ${driver.fullName}\n` +
					  `🚗 Машина: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
					  `👥 Вместимость: ${driver.maxPassengers} человек\n` +
					  `📞 Телефон: ${driver.phone}\n` +
					  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 Пассажиры: ${order.passengerCount} человек\n` +
					  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
					  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n\n` : '\n'}` +
					  `Свяжитесь с водителем и договоритесь о времени отправления.`

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

			console.log('✅ Haydovchi muvaffaqiyatli tanlandi')
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
	confirmOrder: async (ctx, callbackData) => {
		const user = ctx.user
		const orderId = callbackData.split('_')[2]

		try {
			console.log(`✅ confirmOrder: orderId=${orderId}`)

			const order = await Order.findById(orderId).populate('driverId')

			if (!order) {
				await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
				return
			}

			// Faqat buyurtma egasi tasdiqlashi mumkin
			if (order.userId !== user.telegramId) {
				await ctx.reply(
					user.language === 'uz'
						? '❌ Siz bu buyurtmani tasdiqlay olmaysiz.'
						: '❌ Вы не можете подтвердить этот заказ.'
				)
				return
			}

			// Statusni yangilash
			order.status = 'confirmed'
			await order.save()

			// Yo'lovchiga xabar
			await ctx.reply(
				user.language === 'uz'
					? "✅ Buyurtma rasmiy tasdiqlandi! Haydovchi bilan bog'laning."
					: '✅ Заказ официально подтвержден! Свяжитесь с водителем.'
			)

			// Haydovchiga xabar
			if (order.driverId) {
				await ctx.telegram.sendMessage(
					order.driverId.telegramId,
					user.language === 'uz'
						? "✅ Yo'lovchi buyurtmani tasdiqladi! Endi siz jo'nash vaqtini kelishingiz mumkin."
						: '✅ Пассажир подтвердил заказ! Теперь вы можете договориться о времени отправления.'
				)
			}
		} catch (error) {
			console.error('Confirm order error:', error)
			await ctx.reply(
				user.language === 'uz'
					? '❌ Buyurtma tasdiqlashda xatolik yuz berdi.'
					: '❌ Ошибка при подтверждении заказа.'
			)
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
	driverAcceptOrder: async (ctx, callbackData) => {
		const user = ctx.user
		const orderId = callbackData.split('_')[2]

		try {
			console.log(`✅ driverAcceptOrder: orderId=${orderId}`)

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

			order.status = 'accepted'
			await order.save()

			order.driverId.totalOrders = (order.driverId.totalOrders || 0) + 1
			await order.driverId.save()

			await ctx.reply(
				user.language === 'uz'
					? "✅ Buyurtmani qabul qildingiz! Yo'lovchi bilan bog'laning."
					: '✅ Вы приняли заказ! Свяжитесь с пассажиром.'
			)

			await ctx.telegram.sendMessage(
				order.userId,
				user.language === 'uz'
					? "✅ Haydovchi buyurtmangizni qabul qildi! Tez orada siz bilan bog'lanadi."
					: '✅ Водитель принял ваш заказ! Скоро свяжется с вами.'
			)
		} catch (error) {
			console.error('Driver accept order error:', error)
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
