const { Markup } = require('telegraf')

const passengerCountKeyboard = (lang = 'uz') => {
	const buttons = []

	// 1-5 gacha sonlar
	for (let i = 1; i <= 5; i++) {
		buttons.push([
			Markup.button.callback(`${i} ${lang === 'uz' ? 'kishi' : 'человек'}`, `passengers_${i}`)
		])
	}

	return Markup.inlineKeyboard(buttons)
}

// Haydovchi maksimal yo'lovchilar soni keyboardi
const maxPassengersKeyboard = (lang = 'uz') => {
	const buttons = []

	// 1-5 gacha sonlar
	for (let i = 1; i <= 5; i++) {
		buttons.push([
			Markup.button.callback(`${i} ${lang === 'uz' ? 'kishi' : 'человек'}`, `max_passengers_${i}`)
		])
	}

	return Markup.inlineKeyboard(buttons)
}

// Asosiy menyu keyboardi - rolga qarab
const mainMenuKeyboard = (language = 'uz', isAdmin = false, role = 'user') => {
	const buttons = []

    if (role === 'user') {
			// User uchun faqat "Taksi kerak" va "Mening buyurtmalarim"
			buttons.push([
				Markup.button.callback(
					language === 'uz' ? '🚖 Taksiga buyurtma berish' : '🚖 Заказать такси',
					'need_taxi'
				)
			])
			buttons.push([
				Markup.button.callback(
					language === 'uz' ? '📋 Mening buyurtmalarim' : '📋 Мои заказы',
					'my_orders'
				)
			])
		} else if (role === 'driver') {
			// Driver uchun faqat "Haydovchi menyusi"
			buttons.push([
				Markup.button.callback(
					language === 'uz' ? '🚘 Haydovchi menyusi' : '🚘 Меню водителя',
					'driver_info'
				)
			])
		} else {
			// Agar roli yo'q bo'lsa (yangi foydalanuvchi) - ikkala variant ham
			buttons.push([
				Markup.button.callback(
					language === 'uz' ? '🚖 Taksiga buyurtma berish' : '🚖 Нужно такси',
					'need_taxi'
				),
				Markup.button.callback(
					language === 'uz' ? '🚘 Taksi xizmati ko‘rsatish' : '🚘 Предоставлять такси',
					'taxi_service'
				)
			])
			buttons.push([
				Markup.button.callback(
					language === 'uz' ? '📋 Mening buyurtmalarim' : '📋 Мои заказы',
					'my_orders'
				)
			])
		}

	return Markup.inlineKeyboard(buttons)
}

module.exports = {
	// Til tanlash keyboard
	languageKeyboard: () => {
		return Markup.inlineKeyboard([
			[Markup.button.callback('🇺🇿 O‘zbek tili', 'lang_uz')],
			[Markup.button.callback('🇷🇺 Русский язык', 'lang_ru')]
		])
	},

	// Asosiy menyu
	mainMenuKeyboard,

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
	},

	// main.js fayliga qo'shing:
	// keyboards/main.js fayliga qo'shamiz:
	// workHoursKeyboard: (lang = 'uz') => {
	//     return {
	//         inline_keyboard: [
	//             [
	//                 {
	//                     text: lang === 'uz' ? '🌅 10:00 - 18:00 (Kunduzi)' : '🌅 10:00 - 18:00 (Дневное)',
	//                     callback_data: 'work_1000_1800'
	//                 }
	//             ],
	//             [
	//                 {
	//                     text: lang === 'uz' ? '🌆 18:00 - 02:00 (Kechqurun)' : '🌆 18:00 - 02:00 (Вечернее)',
	//                     callback_data: 'work_1800_0200'
	//                 }
	//             ],
	//             [
	//                 {
	//                     text: lang === 'uz' ? '🌃 02:00 - 10:00 (Tungi)' : '🌃 02:00 - 10:00 (Ночное)',
	//                     callback_data: 'work_0200_1000'
	//                 }
	//             ],
	//             [
	//                 {
	//                     text: lang === 'uz' ? '✏️ Qo\'lda kiritish' : '✏️ Ввести вручную',
	//                     callback_data: 'work_custom'
	//                 }
	//             ]
	//         ]
	//     }
	// },

	// keyboards/main.js faylida workHoursKeyboard funksiyasini tekshiring:

	workHoursKeyboard: (lang = 'uz') => {
		return Markup.inlineKeyboard([
			[
				Markup.button.callback(
					lang === 'uz' ? '🌅 10:00 - 18:00 (Kunduzi)' : '🌅 10:00 - 18:00 (Дневное)',
					'work_1000_1800'
				)
			],
			[
				Markup.button.callback(
					lang === 'uz' ? '🌆 18:00 - 02:00 (Kechqurun)' : '🌆 18:00 - 02:00 (Вечернее)',
					'work_1800_0200'
				)
			],
			[
				Markup.button.callback(
					lang === 'uz' ? '🌃 02:00 - 10:00 (Tungi)' : '🌃 02:00 - 10:00 (Ночное)',
					'work_0200_1000'
				)
			],
			[
				Markup.button.callback(
					lang === 'uz' ? "✏️ Qo'lda kiritish" : '✏️ Ввести вручную',
					'work_custom'
				)
			]
		])
	},
	customWorkHoursKeyboard: (lang = 'uz') => {
		return {
			inline_keyboard: [
				[
					{
						text: lang === 'uz' ? '08:00 - 20:00' : '08:00 - 20:00',
						callback_data: 'work_custom_08:00_20:00'
					},
					{
						text: lang === 'uz' ? '22:00 - 06:00' : '22:00 - 06:00',
						callback_data: 'work_custom_22:00_06:00'
					}
				],
				[
					{
						text: lang === 'uz' ? '09:00 - 17:00' : '09:00 - 17:00',
						callback_data: 'work_custom_09:00_17:00'
					},
					{
						text: lang === 'uz' ? '07:00 - 19:00' : '07:00 - 19:00',
						callback_data: 'work_custom_07:00_19:00'
					}
				],
				[
					{
						text: lang === 'uz' ? '✏️ Boshqa vaqt kiritish' : '✏️ Другое время',
						callback_data: 'work_custom_enter'
					}
				]
			]
		}
	},
	// keyboards/main.js faylida confirmKeyboard funksiyasi:
	confirmKeyboard: (lang = 'uz') => {
		const texts = {
			uz: {
				confirm: "✅ Ha, to'g'ri",
				cancel: "❌ Yo'q, o'zgartirish"
			},
			ru: {
				confirm: '✅ Да, верно',
				cancel: '❌ Нет, изменить'
			}
		}

		const t = texts[lang]

		return Markup.inlineKeyboard([
			[Markup.button.callback(t.confirm, 'confirm')],
			[Markup.button.callback(t.cancel, 'cancel')]
		])
	},
	passengerCountKeyboard,
	maxPassengersKeyboard
}
