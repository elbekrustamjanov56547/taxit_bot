const Order = require('../models/Order')
const User = require('../models/User')
const Driver = require('../models/Driver')

class OrderExpirationService {
	constructor(bot) {
		this.bot = bot
		this.checkInterval = null
	}

	async checkExpiredOrders() {
		try {
			const fiveMinutesAgo = new Date()
			fiveMinutesAgo.setMinutes(fiveMinutesAgo.getHours() - 12)

			console.log('⏰ [TEST] Checking for expired orders (5 minutes)...')
			console.log('⏰ Current time:', new Date().toISOString())
			console.log('⏰ Checking orders created before:', fiveMinutesAgo.toISOString())

			// TEST: 5 daqiqadan oldin yaratilgan va hali faol bo'lgan buyurtmalarni topish
			const ordersToExpire = await Order.find({
				status: { $in: ['searching', 'selected', 'confirmed', 'accepted'] },
				createdAt: { $lt: fiveMinutesAgo },
				autoClosed: false
			})

			console.log(`⏰ [TEST] Found ${ordersToExpire.length} orders to expire`)

			if (ordersToExpire.length > 0) {
				console.log('📋 Orders found:')
				ordersToExpire.forEach(order => {
					console.log(`  - ID: ${order._id}, Status: ${order.status}, Created: ${order.createdAt}`)
				})
			}

			for (const order of ordersToExpire) {
				await this.expireOrder(order)
			}

			return ordersToExpire.length
		} catch (error) {
			console.error('❌ Error checking expired orders:', error)
			return 0
		}
	}

	// Buyurtmani muddati o'tgan deb belgilash
	async expireOrder(order) {
		try {
			console.log(`⏰ [TEST] Expiring order ${order._id}`)

			// Oldingi holatni saqlash
			const previousStatus = order.status

			// Statusni yangilash
			order.status = 'expired'
			order.autoClosed = true
			order.updatedAt = new Date()
			await order.save()

			console.log(`✅ [TEST] Order ${order._id} marked as expired (was ${previousStatus})`)

			// Yo'lovchiga xabar
			await this.notifyPassenger(order, previousStatus)

			// Haydovchiga xabar (agar biriktirilgan bo'lsa)
			if (order.driverId) {
				await this.notifyDriver(order, previousStatus)
			}
		} catch (error) {
			console.error(`❌ Error expiring order ${order._id}:`, error)
		}
	}
// services/orderExpirationService.js faylida yangilaymiz:

async notifyPassenger(order, previousStatus) {
	try {
		const passengerUser = await User.findOne({ telegramId: order.userId })
		const passengerLanguage = passengerUser?.language || 'uz'

		let message = ''
		if (passengerLanguage === 'uz') {
			message = `⏰ <b>Buyurtmangiz muddati tugadi</b>\n\n` +
				`📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
				`👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
				`📅 Yaratilgan: ${order.createdAt.toLocaleDateString('uz-UZ')}\n` +
				`⏰ Muddati: 12 soat\n\n`

			if (previousStatus === 'accepted') {
				message += `⚠️ Haydovchi bilan kelishuv amalga oshirilmadi yoki jo'nash amalga oshmadi.\n`
			} else if (previousStatus === 'confirmed' || previousStatus === 'selected') {
				message += `⚠️ Haydovchi topilmadi yoki javob bermadi.\n`
			} else if (previousStatus === 'searching') {
				message += `⚠️ Haydovchi topilmadi.\n`
			}

			message += `\n🔄 <b>Nima qilish kerak?</b>\n` +
				`1. Yangi buyurtma berish uchun /start buyrug'idan foydalaning\n` +
				`2. Boshqa haydovchi tanlang\n` +
				`3. Kelishuv amalga oshmagan taqdirda, admin bilan bog'laning\n\n` +
				`📞 Admin: @TaxiAdmin`
		} else {
			message = `⏰ <b>Срок вашего заказа истек</b>\n\n` +
				`📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
				`👥 Пассажиры: ${order.passengerCount} человек\n` +
				`📅 Создан: ${order.createdAt.toLocaleDateString('ru-RU')}\n` +
				`⏰ Срок: 12 часов\n\n`

			if (previousStatus === 'accepted') {
				message += `⚠️ Соглашение с водителем не было достигнуто или отправление не состоялось.\n`
			} else if (previousStatus === 'confirmed' || previousStatus === 'selected') {
				message += `⚠️ Водитель не найден или не ответил.\n`
			} else if (previousStatus === 'searching') {
				message += `⚠️ Водитель не найден.\n`
			}

			message += `\n🔄 <b>Что делать?</b>\n` +
				`1. Используйте команду /start для создания нового заказа\n` +
				`2. Выберите другого водителя\n` +
				`3. Если соглашение не достигнуто, свяжитесь с администратором\n\n` +
				`📞 Админ: @TaxiAdmin`
		}

		await this.bot.telegram.sendMessage(order.userId, message, {
			parse_mode: 'HTML'
		})
		
		console.log(`✅ Notification sent to passenger for order ${order._id}`)
	} catch (error) {
		console.error(`❌ Error notifying passenger for order ${order._id}:`, error)
	}
}

async notifyDriver(order, previousStatus) {
	try {
		const driver = await Driver.findById(order.driverId)
		if (!driver) return

		const message = driver.language === 'uz'
			? `⏰ <b>Buyurtma muddati tugadi</b>\n\n` +
			  `📋 <b>Buyurtma ma'lumotlari:</b>\n` +
			  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
			  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
			  `📞 Yo'lovchi: ${order.phone || 'Raqam kiritilmagan'}\n` +
			  `📅 Yaratilgan: ${order.createdAt.toLocaleDateString('uz-UZ')}\n` +
			  `⏰ Muddati: 12 soat\n\n` +
			  
			  `🔄 <b>Nima o'zgardi?</b>\n` +
			  `✅ Bo'sh o'rinlaringiz: ${order.passengerCount} taga oshdi\n` +
			  `📊 Jami bo'sh o'rinlar: ${driver.maxPassengers + order.passengerCount} ta\n` +
			  `✅ Endi yangi buyurtmalar qabul qilishingiz mumkin\n\n` +
			  
			  `🎯 <b>Keyingi qadamlar:</b>\n` +
			  `1. Asosiy menyuga qayting\n` +
			  `2. "Safarni boshlash" tugmasini bosing\n` +
			  `3. Yangi yo'lovchilar qabul qilishni boshlang\n\n` +
			  
			  `📊 Statistikangiz saqlanib qoldi va yangi buyurtmalar uchun tayyorsiz!`
			: `⏰ <b>Срок заказа истек</b>\n\n` +
			  `📋 <b>Информация о заказе:</b>\n` +
			  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
			  `👥 Пассажиры: ${order.passengerCount} человек\n` +
			  `📞 Пассажир: ${order.phone || 'Номер не указан'}\n` +
			  `📅 Создан: ${order.createdAt.toLocaleDateString('ru-RU')}\n` +
			  `⏰ Срок: 12 часов\n\n` +
			  
			  `🔄 <b>Что изменилось?</b>\n` +
			  `✅ Ваши свободные места увеличились на ${order.passengerCount}\n` +
			  `📊 Всего свободных мест: ${driver.maxPassengers + order.passengerCount}\n` +
			  `✅ Теперь вы можете принимать новые заказы\n\n` +
			  
			  `🎯 <b>Следующие шаги:</b>\n` +
			  `1. Вернитесь в главное меню\n` +
			  `2. Нажмите кнопку "Начать поездку"\n` +
			  `3. Начните принимать новых пассажиров\n\n` +
			  
			  `📊 Ваша статистика сохранена, и вы готовы к новым заказам!`

		await this.bot.telegram.sendMessage(driver.telegramId, message, {
			parse_mode: 'HTML'
		})
		
		console.log(`✅ Notification sent to driver for order ${order._id}`)

		// Agar buyurtma qabul qilingan bo'lsa, bo'sh o'rinlarni qayta tiklash
		if (previousStatus === 'accepted') {
			const oldSeats = driver.maxPassengers || 0
			const newSeats = oldSeats + order.passengerCount
			driver.maxPassengers = newSeats
			await driver.save()
			console.log(`✅ Driver ${driver._id} available seats restored from ${oldSeats} to ${newSeats}`)
		}
	} catch (error) {
		console.error(`❌ Error notifying driver for order ${order._id}:`, error)
	}
}

	// Haydovchiga xabar yuborish
	async notifyDriver(order, previousStatus) {
		try {
			const driver = await Driver.findById(order.driverId)
			if (!driver) return

			const message =
				driver.language === 'uz'
					? `⏰ <b>[TEST] Buyurtma muddati tugadi</b>\n\n` +
					  `📍 Yo'nalish: ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 Yo'lovchilar: ${order.passengerCount} kishi\n` +
					  `📞 Yo'lovchi: ${order.phone || 'Raqam kiritilmagan'}\n` +
					  `⏰ Yopilgan: ${new Date().toLocaleTimeString('uz-UZ')}\n\n` +
					  `⚠️ Bu buyurtma 5 daqiqadan keyin avtomatik ravishda yopildi (test rejimida).\n` +
					  `🔄 Endi boshqa buyurtmalarni qabul qilishingiz mumkin.`
					: `⏰ <b>[TEST] Срок заказа истек</b>\n\n` +
					  `📍 Направление: ${order.fromRegion} → ${order.toRegion}\n` +
					  `👥 Пассажиры: ${order.passengerCount} человек\n` +
					  `📞 Пассажир: ${order.phone || 'Номер не указан'}\n` +
					  `⏰ Закрыт: ${new Date().toLocaleTimeString('ru-RU')}\n\n` +
					  `⚠️ Этот заказ автоматически закрыт через 5 минут (в тестовом режиме).\n` +
					  `🔄 Теперь вы можете принимать другие заказы.`

			await this.bot.telegram.sendMessage(driver.telegramId, message, {
				parse_mode: 'HTML'
			})

			console.log(`✅ [TEST] Notification sent to driver for order ${order._id}`)

			// Agar buyurtma qabul qilingan bo'lsa, bo'sh o'rinlarni qayta tiklash
			if (previousStatus === 'accepted') {
				const oldSeats = driver.maxPassengers || 0
				driver.maxPassengers = oldSeats + order.passengerCount
				await driver.save()
				console.log(
					`✅ [TEST] Driver ${driver._id} available seats restored from ${oldSeats} to ${driver.maxPassengers}`
				)
			}
		} catch (error) {
			console.error(`❌ Error notifying driver for order ${order._id}:`, error)
		}
	}

	// Xizmatni ishga tushirish
	start(intervalMinutes = 1) {
		console.log(
			`🚀 [TEST] Order expiration service started (checking every ${intervalMinutes} minute)`
		)
		console.log('🚀 Current time:', new Date().toISOString())

		// Server ishga tushganda darhol tekshirish
		this.checkExpiredOrders()

		// Har 1 daqiqada tekshirish (test uchun)
		this.checkInterval = setInterval(() => this.checkExpiredOrders(), intervalMinutes * 60 * 1000)
	}

	// Xizmatni to'xtatish
	stop() {
		if (this.checkInterval) {
			clearInterval(this.checkInterval)
			console.log('🛑 Order expiration service stopped')
		}
	}
}

module.exports = OrderExpirationService