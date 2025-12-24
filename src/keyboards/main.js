const { Markup } = require('telegraf')

module.exports = {
	// Til tanlash keyboard
	languageKeyboard: () => {
		return Markup.inlineKeyboard([
			[Markup.button.callback('🇺🇿 O‘zbek tili', 'lang_uz')],
			[Markup.button.callback('🇷🇺 Русский язык', 'lang_ru')]
		])
	},

	// Asosiy menu
	mainMenuKeyboard: (lang = 'uz') => {
		const texts = {
			uz: {
				needTaxi: '🚕 Taksi kerak',
				taxiService: '🚘 Taksi xizmati',
				myOrders: '📋 Mening buyurtmalarim',
				settings: '⚙️ Sozlamalar'
			},
			ru: {
				needTaxi: '🚕 Нужно такси',
				taxiService: '🚘 Такси сервис',
				myOrders: '📋 Мои заказы',
				settings: '⚙️ Настройки'
			}
		}

		const t = texts[lang]

		return Markup.inlineKeyboard([
			[Markup.button.callback(t.needTaxi, 'need_taxi')],
			[Markup.button.callback(t.taxiService, 'taxi_service')],
			[Markup.button.callback(t.myOrders, 'my_orders')],
			[Markup.button.callback(t.settings, 'settings')]
		])
	},

	// Viloyatlar keyboard (yo'lovchi uchun)
	fromRegionsKeyboard: (lang = 'uz') => {
		const regions = {
			uz: [
				['Toshkent', 'Toshkent'],
				['Andijon', 'Andijon'],
				['Fargʻona', 'Fargona'],
				['Namangan', 'Namangan'],
				['Samarqand', 'Samarqand'],
				['Buxoro', 'Buxoro'],
				['Xorazm', 'Xorazm'],
				['Navoiy', 'Navoiy'],
				['Qashqadaryo', 'Qashqadaryo'],
				['Surxondaryo', 'Surxondaryo'],
				['Jizzax', 'Jizzax'],
				['Sirdaryo', 'Sirdaryo'],
				['Qoraqalpogʻiston', 'Qoraqalpoq']
			],
			ru: [
				['Ташкент', 'Toshkent'],
				['Андижан', 'Andijon'],
				['Фергана', 'Fargona'],
				['Наманган', 'Namangan'],
				['Самарканд', 'Samarqand'],
				['Бухара', 'Buxoro'],
				['Хорезм', 'Xorazm'],
				['Навои', 'Navoiy'],
				['Кашкадарья', 'Qashqadaryo'],
				['Сурхандарья', 'Surxondaryo'],
				['Джизак', 'Jizzax'],
				['Сырдарья', 'Sirdaryo'],
				['Каракалпакстан', 'Qoraqalpoq']
			]
		}

		const buttons = regions[lang].map(region => [
			Markup.button.callback(region[0], `from_${region[1]}`)
		])

		return Markup.inlineKeyboard(buttons)
	},

	toRegionsKeyboard: (lang = 'uz') => {
		const regions = {
			uz: [
				['Toshkent', 'Toshkent'],
				['Andijon', 'Andijon'],
				['Fargʻona', 'Fargona'],
				['Namangan', 'Namangan'],
				['Samarqand', 'Samarqand'],
				['Buxoro', 'Buxoro'],
				['Xorazm', 'Xorazm'],
				['Navoiy', 'Navoiy'],
				['Qashqadaryo', 'Qashqadaryo'],
				['Surxondaryo', 'Surxondaryo'],
				['Jizzax', 'Jizzax'],
				['Sirdaryo', 'Sirdaryo'],
				['Qoraqalpogʻiston', 'Qoraqalpoq']
			],
			ru: [
				['Ташкент', 'Toshkent'],
				['Андижан', 'Andijon'],
				['Фергана', 'Fargona'],
				['Наманган', 'Namangan'],
				['Самарканд', 'Samarqand'],
				['Бухара', 'Buxoro'],
				['Хорезм', 'Xorazm'],
				['Навои', 'Navoiy'],
				['Кашкадарья', 'Qashqadaryo'],
				['Сурхандарья', 'Surxondaryo'],
				['Джизак', 'Jizzax'],
				['Сырдарья', 'Sirdaryo'],
				['Каракалпакстан', 'Qoraqalpoq']
			]
		}

		const buttons = regions[lang].map(region => [
			Markup.button.callback(region[0], `to_${region[1]}`)
		])

		return Markup.inlineKeyboard(buttons)
	},

	// Haydovchi uchun viloyatlar keyboard
	driverFromRegionsKeyboard: (lang = 'uz') => {
		const regions = {
			uz: [
				['Toshkent', 'Toshkent'],
				['Andijon', 'Andijon'],
				['Fargʻona', 'Fargona'],
				['Namangan', 'Namangan'],
				['Samarqand', 'Samarqand'],
				['Buxoro', 'Buxoro'],
				['Xorazm', 'Xorazm'],
				['Navoiy', 'Navoiy'],
				['Qashqadaryo', 'Qashqadaryo'],
				['Surxondaryo', 'Surxondaryo'],
				['Jizzax', 'Jizzax'],
				['Sirdaryo', 'Sirdaryo'],
				['Qoraqalpogʻiston', 'Qoraqalpoq']
			],
			ru: [
				['Ташкент', 'Toshkent'],
				['Андижан', 'Andijon'],
				['Фергана', 'Fargona'],
				['Наманган', 'Namangan'],
				['Самарканд', 'Samarqand'],
				['Бухара', 'Buxoro'],
				['Хорезм', 'Xorazm'],
				['Навои', 'Navoiy'],
				['Кашкадарья', 'Qashqadaryo'],
				['Сурхандарья', 'Surxondaryo'],
				['Джизак', 'Jizzax'],
				['Сырдарья', 'Sirdaryo'],
				['Каракалпакстан', 'Qoraqalpoq']
			]
		}

		const buttons = regions[lang].map(region => [
			Markup.button.callback(region[0], `driver_from_${region[1]}`)
		])

		return Markup.inlineKeyboard(buttons)
	},

	driverToRegionsKeyboard: (lang = 'uz') => {
		const regions = {
			uz: [
				['Toshkent', 'Toshkent'],
				['Andijon', 'Andijon'],
				['Fargʻona', 'Fargona'],
				['Namangan', 'Namangan'],
				['Samarqand', 'Samarqand'],
				['Buxoro', 'Buxoro'],
				['Xorazm', 'Xorazm'],
				['Navoiy', 'Navoiy'],
				['Qashqadaryo', 'Qashqadaryo'],
				['Surxondaryo', 'Surxondaryo'],
				['Jizzax', 'Jizzax'],
				['Sirdaryo', 'Sirdaryo'],
				['Qoraqalpogʻiston', 'Qoraqalpoq']
			],
			ru: [
				['Ташкент', 'Toshkent'],
				['Андижан', 'Andijon'],
				['Фергана', 'Fargona'],
				['Наманган', 'Namangan'],
				['Самарканд', 'Samarqand'],
				['Бухара', 'Buxoro'],
				['Хорезм', 'Xorazm'],
				['Навои', 'Navoiy'],
				['Кашкадарья', 'Qashqadaryo'],
				['Сурхандарья', 'Surxondaryo'],
				['Джизак', 'Jizzax'],
				['Сырдарья', 'Sirdaryo'],
				['Каракалпакстан', 'Qoraqalpoq']
			]
		}

		const buttons = regions[lang].map(region => [
			Markup.button.callback(region[0], `driver_to_${region[1]}`)
		])

		return Markup.inlineKeyboard(buttons)
	},

	// Pochta bor/yo'q
	parcelKeyboard: (lang = 'uz') => {
		const texts = {
			uz: {
				yes: '📦 Ha',
				no: "❌ Yo'q"
			},
			ru: {
				yes: '📦 Да',
				no: '❌ Нет'
			}
		}

		const t = texts[lang]

		return Markup.inlineKeyboard([
			[Markup.button.callback(t.yes, 'parcel_yes')],
			[Markup.button.callback(t.no, 'parcel_no')]
		])
	},

	// Xizmat turi - TO'G'RI VERSIYA
	serviceTypeKeyboard: (lang = 'uz', selectedServices = []) => {
		const texts = {
			uz: {
				road: "🚕 Yo'l-yo'lakay",
				route: "🛣 Yo'nalish",
				parcel: '📦 Pochta',
				done: '✅ Tayyor'
			},
			ru: {
				road: '🚕 Попутка',
				route: '🛣 Направление',
				parcel: '📦 Посылка',
				done: '✅ Готово'
			}
		}

		const t = texts[lang]

		// Tanlangan xizmatlarni belgilash
		const buttons = [
			[
				Markup.button.callback(
					selectedServices.includes('road') ? `✅ ${t.road}` : t.road,
					'service_road'
				)
			],
			[
				Markup.button.callback(
					selectedServices.includes('route') ? `✅ ${t.route}` : t.route,
					'service_route'
				)
			],
			[
				Markup.button.callback(
					selectedServices.includes('parcel') ? `✅ ${t.parcel}` : t.parcel,
					'service_parcel'
				)
			],
			[Markup.button.callback(t.done, 'service_done')]
		]

		return Markup.inlineKeyboard(buttons)
	},

	// Tasdiqlash/bekor qilish
	confirmKeyboard: (lang = 'uz') => {
		const texts = {
			uz: {
				confirm: '✅ Tasdiqlash',
				cancel: '❌ Bekor qilish'
			},
			ru: {
				confirm: '✅ Подтвердить',
				cancel: '❌ Отмена'
			}
		}

		const t = texts[lang]

		return Markup.inlineKeyboard([
			[Markup.button.callback(t.confirm, 'confirm'), Markup.button.callback(t.cancel, 'cancel')]
		])
	},

	// Izoh qoldirish
	commentKeyboard: (lang = 'uz') => {
		const texts = {
			uz: {
				add: '✍️ Izoh qoldirish',
				skip: "⏭ O'tkazib yuborish"
			},
			ru: {
				add: '✍️ Оставить комментарий',
				skip: '⏭ Пропустить'
			}
		}

		const t = texts[lang]

		return Markup.inlineKeyboard([
			[Markup.button.callback(t.add, 'add_comment')],
			[Markup.button.callback(t.skip, 'skip_comment')]
		])
	}
}
