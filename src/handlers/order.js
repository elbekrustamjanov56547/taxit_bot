// handlers/order.js (TO'LIQ VERSIYA)

const Order = require('../models/Order')
const Driver = require('../models/Driver')
const User = require('../models/User')
const states = require('../utils/states')
const keyboards = require('../keyboards/main')
const regionKeyboards = require('../keyboards/regions')

// ============ BUYURTMA BOSHLASH ============
const startOrder = async ctx => {
	const user = ctx.user

	if (user.role === 'driver') {
		await ctx.reply(
			user.language === 'uz'
				? "❌ Siz haydovchisiz. Yo'lovchi sifatida buyurtma bera olmaysiz."
				: '❌ Вы водитель. Не можете заказать такси как пассажир.'
		)
		return
	}

	user.role = 'user'
	user.state = states.PASSENGER_FROM_REGION
	await user.save()

	const message =
		user.language === 'uz'
			? "🚖 Taksiga buyurtma berish\n\n📍 Qaysi viloyatdan jo'namoqchisiz?"
			: '🚖 Заказать такси\n\n📍 Из какого региона выезжаете?'

	await ctx.reply(message, regionKeyboards.fromRegionsKeyboard(user.language))
}

// ============ CHIQISH VILOYATINI TANLASH ============
const selectFromRegion = async (ctx, callbackData) => {
	const user = ctx.user
	const region = callbackData.replace('from_', '')

	ctx.session = ctx.session || {}
	ctx.session.orderData = ctx.session.orderData || {}
	ctx.session.orderData.fromRegion = region

	user.state = states.PASSENGER_TO_REGION
	await user.save()

	const message =
		user.language === 'uz'
			? `📍 Chiqish: ${region}\n\nQaysi viloyatga borasiz?`
			: `📍 Отправление: ${region}\n\nВ какой регион едете?`

	await ctx.reply(message, regionKeyboards.toRegionsKeyboard(user.language))
}

// ============ KIRISH VILOYATINI TANLASH ============
const selectToRegion = async (ctx, callbackData) => {
	const user = ctx.user
	const region = callbackData.replace('to_', '')

	ctx.session.orderData.toRegion = region
	user.state = states.PASSENGER_PASSENGER_COUNT
	await user.save()

	const message =
		user.language === 'uz'
			? `📍 Kirish: ${region}\n\n👥 Necha kishi ketasiz?`
			: `📍 Прибытие: ${region}\n\n👥 Сколько человек едет?`

	await ctx.reply(message, keyboards.passengerCountKeyboard(user.language))
}

// ============ YO'LOVCHILAR SONINI TANLASH ============
const selectPassengerCount = async (ctx, callbackData) => {
	const user = ctx.user
	const passengerCount = parseInt(callbackData.replace('passengers_', ''))

	ctx.session.orderData.passengerCount = passengerCount
	user.state = states.PASSENGER_PARCEL
	await user.save()

	const message =
		user.language === 'uz'
			? `👥 Yo'lovchilar soni: ${passengerCount} kishi\n\n📦 Pochta yoki yuk bormi?`
			: `👥 Количество пассажиров: ${passengerCount} человек\n\n📦 Есть посылка или груз?`

	await ctx.reply(message, keyboards.parcelKeyboard(user.language))
}

// ============ POCHTA BOR/YO'Q ============
const selectParcel = async (ctx, callbackData) => {
	const user = ctx.user
	const hasParcel = callbackData === 'parcel_yes'

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
		ctx.session.orderData.parcelDescription = ''
		await createOrder(ctx)
	}
}

// ============ POCHTA TAVSIFINI SAQLASH ============
const saveParcelDescription = async (ctx, text) => {
	const user = ctx.user
	ctx.session.orderData.parcelDescription = text
	await createOrder(ctx)
}

// ============ BUYURTMA YARATISH ============
const createOrder = async ctx => {
	const user = ctx.user
	const orderData = ctx.session.orderData

	if (!orderData || !orderData.fromRegion || !orderData.toRegion || !orderData.passengerCount) {
		await ctx.reply(
			user.language === 'uz' ? "❌ Barcha maydonlar to'ldirilmagan." : '❌ Не все поля заполнены.'
		)
		return
	}

	try {
		const order = new Order({
			userId: user.telegramId,
			username: user.username || `user_${user.telegramId}`,
			fromRegion: orderData.fromRegion,
			toRegion: orderData.toRegion,
			passengerCount: orderData.passengerCount,
			hasParcel: orderData.hasParcel || false,
			parcelDescription: orderData.parcelDescription || '',
			status: 'searching',
			createdAt: new Date()
		})

		await order.save()
		ctx.session.orderId = order._id

		const orderMessage =
			user.language === 'uz'
				? `✅ Buyurtma qabul qilindi!\n\n` +
				  `📍 Chiqish: ${order.fromRegion}\n` +
				  `📍 Kirish: ${order.toRegion}\n` +
				  `👥 Yo'lovchilar soni: ${order.passengerCount} kishi\n` +
				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
				  `${order.parcelDescription ? `📝 Tavsif: ${order.parcelDescription}\n\n` : '\n'}` +
				  `Buyurtmangiz qabul qilindi, haydovchilar qidirilmoqda...`
				: `✅ Заказ принят!\n\n` +
				  `📍 Отправление: ${order.fromRegion}\n` +
				  `📍 Прибытие: ${order.toRegion}\n` +
				  `👥 Количество пассажиров: ${order.passengerCount} человек\n` +
				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
				  `${order.parcelDescription ? `📝 Описание: ${order.parcelDescription}\n\n` : '\n'}` +
				  `Ваш заказ принят, ищем водителей...`

		await ctx.reply(orderMessage, { parse_mode: 'HTML' })
		await searchDrivers(ctx, order)
	} catch (error) {
		console.error('Create order error:', error)
		await ctx.reply(
			user.language === 'uz'
				? '❌ Buyurtma yaratishda xatolik yuz berdi.'
				: '❌ Ошибка при создании заказа.'
		)
	}
}

// ============ HAYDOVCHILARNI QIDIRISH ============
const searchDrivers = async (ctx, order) => {
	const user = ctx.user

	try {
		console.log(`🔍 Qidirilayotgan yo'nalish: ${order.fromRegion} → ${order.toRegion}`)
		console.log(`👥 Yo'lovchilar soni: ${order.passengerCount}`)

		const drivers = await Driver.find({
			fromRegion: order.fromRegion,
			toRegion: order.toRegion,
			status: 'active',
			maxPassengers: { $gte: order.passengerCount }
		})
			.populate('carModel')
			.populate('carType')
			.limit(10)

		console.log(`📊 Topilgan haydovchilar: ${drivers.length} ta`)

		if (drivers.length === 0) {
			order.status = 'pending'
			await order.save()

			const message =
				user.language === 'uz'
					? `❌ Sizning yo'nalishingizda haydovchilar topilmadi.\n\n` +
					  `📍 ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 ${order.passengerCount} kishi\n\n` +
					  `Birozdan so'ng qayta urinib ko'ring yoki boshqa yo'nalish tanlang.`
					: `❌ В вашем направлении не найдено водителей.\n\n` +
					  `📍 ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 ${order.passengerCount} человек\n\n` +
					  `Попробуйте позже или выберите другое направление.`

			await ctx.reply(message)
			return
		}

		await showFoundDrivers(ctx, drivers, order)
	} catch (error) {
		console.error('Search drivers error:', error)
		await ctx.reply(
			user.language === 'uz'
				? '❌ Haydovchilarni qidirishda xatolik yuz berdi.'
				: '❌ Ошибка при поиске водителей.'
		)
	}
}

// ============ TOPILGAN HAYDOVCHILARNI KO'RSATISH ============
const showFoundDrivers = async (ctx, drivers, order) => {
	const user = ctx.user
	const inlineKeyboard = []

	drivers.forEach((driver, index) => {
		const carModelName =
			driver.carModel && typeof driver.carModel === 'object'
				? user.language === 'uz'
					? driver.carModel.name
					: driver.carModel.nameRu
				: driver.carModel

		const buttonText =
			user.language === 'uz'
				? `${index + 1}. ${driver.fullName} | ${carModelName}`
				: `${index + 1}. ${driver.fullName} | ${carModelName}`

		inlineKeyboard.push([
			{
				text: buttonText,
				callback_data: `select_driver_${driver._id}_${order._id}`
			}
		])
	})

	let message =
		user.language === 'uz' ? '✅ Topilgan haydovchilar:\n\n' : '✅ Найденные водители:\n\n'

	drivers.forEach((driver, index) => {
		const carModelName =
			driver.carModel && typeof driver.carModel === 'object'
				? user.language === 'uz'
					? driver.carModel.name
					: driver.carModel.nameRu
				: driver.carModel

		const carTypeName = driver.carType
			? user.language === 'uz'
				? driver.carType.name
				: driver.carType.nameRu
			: ''

		message += `${index + 1}. ${driver.fullName}\n`
		message += `   🚗 ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n`
		message += `   👥 Sig'im: ${driver.maxPassengers} kishi\n`
		message += `   📞 ${driver.phone}\n`
		message += `   ⭐ ${driver.rating || '5.0'}/5.0\n\n`
	})

	message +=
		user.language === 'uz'
			? "Haydovchini tanlang va 'Buyurtma berish' tugmasini bosing:"
			: 'Выберите водителя и нажмите кнопку "Заказать":'

	await ctx.reply(message, {
		reply_markup: {
			inline_keyboard: inlineKeyboard
		},
		parse_mode: 'HTML'
	})
}

// ============ HAYDOVCHI TANLASH ============
const handleDriverSelection = async (ctx, callbackData) => {
	const user = ctx.user

	try {
		// callbackData: select_driver_DRIVERID_ORDERID
		const parts = callbackData.split('_')
		const driverId = parts[2]
		const orderId = parts[3]

		const driver = await Driver.findById(driverId).populate('carModel').populate('carType')
		const order = await Order.findById(orderId)

		if (!driver || !order) {
			await ctx.reply(
				user.language === 'uz' ? "❌ Ma'lumotlar topilmadi." : '❌ Данные не найдены.'
			)
			return
		}

		order.driverId = driver._id
		order.status = 'selected'
		await order.save()

		const carModelName =
			driver.carModel && typeof driver.carModel === 'object'
				? user.language === 'uz'
					? driver.carModel.name
					: driver.carModel.nameRu
				: driver.carModel

		const carTypeName = driver.carType
			? user.language === 'uz'
				? driver.carType.name
				: driver.carType.nameRu
			: ''

		const driverInfoMessage =
			user.language === 'uz'
				? `✅ Haydovchi tanlandi!\n\n` +
				  `👤 Ism: ${driver.fullName}\n` +
				  `🚗 Mashina: ${carModelName}${carTypeName ? ` (${carTypeName})` : ''}\n` +
				  `👥 Sig'im: ${driver.maxPassengers} kishi\n` +
				  `📞 Telefon: ${driver.phone}\n` +
				  `⭐ Reyting: ${driver.rating || '5.0'}/5.0\n\n` +
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
				  `⭐ Рейтинг: ${driver.rating || '5.0'}/5.0\n\n` +
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

		const orderForDriverMessage =
			user.language === 'uz'
				? `🚖 Sizga yangi buyurtma biriktirildi!\n\n` +
				  `📍 Chiqish: ${order.fromRegion}\n` +
				  `📍 Kirish: ${order.toRegion}\n` +
				  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
				  `📦 Pochta: ${order.hasParcel ? 'Ha' : "Yo'q"}\n` +
				  `📝 Tavsif: ${order.parcelDescription || "Yo'q"}\n\n` +
				  `👤 Yo'lovchi: @${order.username || "Noma'lum"}\n` +
				  `📞 Telefon: Yo'lovchi bilan bog'laning\n\n` +
				  `Buyurtmani qabul qilish uchun yo'lovchi bilan bog'laning.`
				: `🚖 Вам назначен новый заказ!\n\n` +
				  `📍 Отправление: ${order.fromRegion}\n` +
				  `📍 Прибытие: ${order.toRegion}\n` +
				  `👥 Пассажиры: ${order.passengerCount} человек\n` +
				  `📦 Посылка: ${order.hasParcel ? 'Да' : 'Нет'}\n` +
				  `📝 Описание: ${order.parcelDescription || 'Нет'}\n\n` +
				  `👤 Пассажир: @${order.username || 'Неизвестно'}\n` +
				  `📞 Телефон: Свяжитесь с пассажиром\n\n` +
				  `Свяжитесь с пассажиром для подтверждения заказа.`

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

		await ctx.telegram.sendMessage(driver.telegramId, orderForDriverMessage, {
			reply_markup: driverKeyboard,
			parse_mode: 'HTML'
		})
	} catch (error) {
		console.error('Select driver error:', error)
		await ctx.reply(
			user.language === 'uz'
				? '❌ Haydovchi tanlashda xatolik yuz berdi.'
				: '❌ Ошибка при выборе водителя.'
		)
	}
}

// ============ BUYURTMA TASDIQLASH ============
const confirmOrder = async (ctx, callbackData) => {
	const user = ctx.user
	const orderId = callbackData.split('_')[2]

	try {
		const order = await Order.findById(orderId).populate('driverId')

		if (!order) {
			await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
			return
		}

		if (order.userId !== user.telegramId) {
			await ctx.reply(
				user.language === 'uz'
					? '❌ Siz bu buyurtmani tasdiqlay olmaysiz.'
					: '❌ Вы не можете подтвердить этот заказ.'
			)
			return
		}

		order.status = 'confirmed'
		await order.save()

		await ctx.reply(
			user.language === 'uz'
				? "✅ Buyurtma rasmiy tasdiqlandi! Haydovchi bilan bog'laning."
				: '✅ Заказ официально подтвержден! Свяжитесь с водителем.'
		)

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
}

// ============ BUYURTMA BEKOR QILISH ============
const cancelOrder = async (ctx, callbackData) => {
	const user = ctx.user
	const orderId = callbackData.split('_')[2]

	try {
		const order = await Order.findById(orderId).populate('driverId')

		if (!order) {
			await ctx.reply(user.language === 'uz' ? '❌ Buyurtma topilmadi.' : '❌ Заказ не найден.')
			return
		}

		if (order.userId !== user.telegramId) {
			await ctx.reply(
				user.language === 'uz'
					? '❌ Siz bu buyurtmani bekor qila olmaysiz.'
					: '❌ Вы не можете отменить этот заказ.'
			)
			return
		}

		order.status = 'cancelled'
		await order.save()

		await ctx.reply(user.language === 'uz' ? '❌ Buyurtma bekor qilindi.' : '❌ Заказ отменен.')

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

// ============ HAYDOVCHI BUYURTMANI QABUL QILISHI ============
const driverAcceptOrder = async (ctx, callbackData) => {
	const user = ctx.user
	const orderId = callbackData.split('_')[2]

	try {
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
}

// ============ HAYDOVCHI BUYURTMANI RAD ETISHI ============
const driverRejectOrder = async (ctx, callbackData) => {
	const user = ctx.user
	const orderId = callbackData.split('_')[2]

	try {
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

		setTimeout(async () => {
			await searchDrivers(ctx, order)
		}, 1000)
	} catch (error) {
		console.error('Driver reject order error:', error)
		await ctx.reply(
			user.language === 'uz'
				? '❌ Buyurtma rad etishda xatolik yuz berdi.'
				: '❌ Ошибка при отклонении заказа.'
		)
	}
}

// ============ MENING BUYURTMALARIM ============
const showMyOrders = async ctx => {
	const user = ctx.user

	const orders = await Order.find({ userId: user.telegramId })
		.sort({ createdAt: -1 })
		.limit(10)
		.populate('driverId')

	if (orders.length === 0) {
		await ctx.reply(
			user.language === 'uz'
				? '📭 Sizda hali buyurtmalar mavjud emas.'
				: '📭 У вас пока нет заказов.'
		)
		return
	}

	let message = user.language === 'uz' ? '📋 Mening buyurtmalarim:\n\n' : '📋 Мои заказы:\n\n'

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

		const status = user.language === 'uz' ? statusText[order.status] || order.status : order.status

		const driverName = order.driverId ? order.driverId.fullName : 'Tanlanmagan'

		message += `${index + 1}. ${order.fromRegion} → ${order.toRegion}\n`
		message += `   👥 ${order.passengerCount} kishi\n`
		message += `   🚗 ${driverName}\n`
		message += `   📅 ${new Date(order.createdAt).toLocaleDateString('uz-UZ')}\n`
		message += `   📊 ${status}\n\n`
	})

	await ctx.reply(message)
}

// ============ EXPORT ============
module.exports = {
	// Buyurtma boshlash
	startOrder,
	selectFromRegion,
	selectToRegion,
	selectPassengerCount,
	selectParcel,
	saveParcelDescription,
	createOrder,
	showMyOrders,

	// Haydovchi tanlash va tasdiqlash
	handleDriverSelection,
	confirmOrder,
	cancelOrder,
	driverAcceptOrder,
	driverRejectOrder,

	// Ichki funksiyalar
	searchDrivers,
	showFoundDrivers
}
