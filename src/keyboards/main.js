// keyboards/main.js
const { Markup } = require('telegraf')

const passengerCountKeyboard = (lang = 'uz') => {
	const buttons = []

	// 1-5 gacha sonlar
	for (let i = 1; i <= 5; i++) {
		buttons.push([
			Markup.button.callback(
				`${i} ${lang === 'uz' ? 'kishi' : 'человек'}`,
				`passengers_${i}`,
			),
		])
	}

	return Markup.inlineKeyboard(buttons)
}

const maxPassengersKeyboard = (lang = 'uz') => {
	const buttons = []

	// 1-5 gacha sonlar
	for (let i = 1; i <= 5; i++) {
		buttons.push([
			Markup.button.callback(
				`${i} ${lang === 'uz' ? 'kishi' : 'человек'}`,
				`max_passengers_${i}`,
			),
		])
	}

	return Markup.inlineKeyboard(buttons)
}

const mainMenuKeyboard = (language = 'uz', isAdmin = false, role = 'user') => {
	const buttons = []

	if (role === 'user') {
		// USER rolida
		buttons.push([
			Markup.button.callback(
				language === 'uz' ? '🚖 Taksiga buyurtma berish' : '🚖 Заказать такси',
				'need_taxi'
			)
		])

		buttons.push([
			Markup.button.callback(
				language === 'uz' ? "🔄 Xizmatni o'zgartirish" : '🔄 Изменить услугу',
				'switch_to_driver'
			)
		])
	} else if (role === 'driver') {
		// DRIVER rolida
		buttons.push([
			Markup.button.callback(
				language === 'uz' ? '🚗 Haydovchi menyusi' : '🚗 Меню водителя',
				'driver_info'
			)
		])

		buttons.push([
			Markup.button.callback(
				language === 'uz' ? "🔄 Xizmatni o'zgartirish" : '🔄 Изменить услугу',
				'switch_to_user'
			)
		])

		// DRIVER uchun TOPILMAGAN YO'NALISHLAR tugmasi
		buttons.push([
			Markup.button.callback(language === 'uz' ? 'заказы' : 'заказы', 'show_unmatched_routes')
		])
	} else {
		// Hali rol tanlamaganlar uchun
		buttons.push([
			Markup.button.callback(language === 'uz' ? '🚖 Taksi kerak' : '🚖 Нужно такси', 'need_taxi'),
			Markup.button.callback(
				language === 'uz' ? '🚘 Taksi xizmati' : '🚘 Такси сервис',
				'taxi_service'
			)
		])
	}

	// ADMIN uchun qo'shimcha tugmalar
	if (isAdmin) {
		buttons.push([
			Markup.button.callback(
				language === 'uz' ? '👨‍💼 Admin paneli' : '👨‍💼 Админ панель',
				'admin_menu'
			)
		])
	}

	return Markup.inlineKeyboard(buttons)
}

module.exports = mainMenuKeyboard
// Asosiy menyuni ko'rsatish (HTML formatda)
const showMainMenu = (ctx, language) => {
	const user = ctx.user || { role: 'user' }

	if (user.role === 'driver') {
		console.warn('⚠️ showMainMenu called for driver role')
	}

	const message =
		language === 'uz'
			? `🏠 Asosiy menyu\n\n` + `Quyidagilardan birini tanlang:`
			: `🏠 Главное меню\n\n` + `Выберите одно из следующих:`

	const keyboard = {
		inline_keyboard: [
			[
				{
					text:
						language === 'uz'
							? '🚖 Taksiga buyurtma berish'
							: '🚖 Заказать такси',
					callback_data: 'need_taxi',
				},
			],

			[
				{
					text:
						language === 'uz' ? "Xizmatni O`zgartirish" : 'Изменить услугу',
					callback_data: 'switch_to_driver',
				},
			],
		],
	}

	return { message, keyboard }
}
const fromRegionsKeyboard = (lang = 'uz') => {
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
			['Qoraqalpogʻiston', 'Qoraqalpoq'],
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
			['Каракалпакстан', 'Qoraqalpoq'],
		],
	}

	const buttons = regions[lang].map(region => [
		Markup.button.callback(region[0], `from_${region[1]}`),
	])

	return Markup.inlineKeyboard(buttons)
}

const toRegionsKeyboard = (lang = 'uz') => {
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
			['Qoraqalpogʻiston', 'Qoraqalpoq'],
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
			['Каракалпакстан', 'Qoraqalpoq'],
		],
	}

	const buttons = regions[lang].map(region => [
		Markup.button.callback(region[0], `to_${region[1]}`),
	])

	return Markup.inlineKeyboard(buttons)
}

const driverFromRegionsKeyboard = (lang = 'uz') => {
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
			['Qoraqalpogʻiston', 'Qoraqalpoq'],
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
			['Каракалпакстан', 'Qoraqalpoq'],
		],
	}

	const buttons = regions[lang].map(region => [
		Markup.button.callback(region[0], `driver_from_${region[1]}`),
	])

	return Markup.inlineKeyboard(buttons)
}

const driverToRegionsKeyboard = (lang = 'uz') => {
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
			['Qoraqalpogʻiston', 'Qoraqalpoq'],
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
			['Каракалпакстан', 'Qoraqalpoq'],
		],
	}

	const buttons = regions[lang].map(region => [
		Markup.button.callback(region[0], `driver_to_${region[1]}`),
	])

	return Markup.inlineKeyboard(buttons)
}

const parcelKeyboard = (lang = 'uz') => {
	const texts = {
		uz: {
			yes: '📦 Ha',
			no: "❌ Yo'q",
		},
		ru: {
			yes: '📦 Да',
			no: '❌ Нет',
		},
	}

	const t = texts[lang]

	return Markup.inlineKeyboard([
		[Markup.button.callback(t.yes, 'parcel_yes')],
		[Markup.button.callback(t.no, 'parcel_no')],
	])
}

const serviceTypeKeyboard = (lang = 'uz', selectedServices = []) => {
	const texts = {
		uz: {
			road: "🚕 Yo'l-yo'lakay",
			route: "🛣 Yo'nalish",
			parcel: '📦 Pochta',
			done: '✅ Tayyor',
		},
		ru: {
			road: '🚕 Попутка',
			route: '🛣 Направление',
			parcel: '📦 Посылка',
			done: '✅ Готово',
		},
	}

	const t = texts[lang]

	const buttons = [
		[
			Markup.button.callback(
				selectedServices.includes('road') ? `✅ ${t.road}` : t.road,
				'service_road',
			),
		],
		[
			Markup.button.callback(
				selectedServices.includes('route') ? `✅ ${t.route}` : t.route,
				'service_route',
			),
		],
		[
			Markup.button.callback(
				selectedServices.includes('parcel') ? `✅ ${t.parcel}` : t.parcel,
				'service_parcel',
			),
		],
		[Markup.button.callback(t.done, 'service_done')],
	]

	return Markup.inlineKeyboard(buttons)
}

const confirmKeyboard = (lang = 'uz') => {
	const texts = {
		uz: {
			confirm: '✅ Tasdiqlash',
			cancel: '❌ Bekor qilish',
		},
		ru: {
			confirm: '✅ Подтвердить',
			cancel: '❌ Отмена',
		},
	}

	const t = texts[lang]

	return Markup.inlineKeyboard([
		[
			Markup.button.callback(t.confirm, 'confirm'),
			Markup.button.callback(t.cancel, 'cancel'),
		],
	])
}

const commentKeyboard = (lang = 'uz') => {
	const texts = {
		uz: {
			add: '✍️ Izoh qoldirish',
			skip: "⏭ O'tkazib yuborish",
		},
		ru: {
			add: '✍️ Оставить комментарий',
			skip: '⏭ Пропустить',
		},
	}

	const t = texts[lang]

	return Markup.inlineKeyboard([
		[Markup.button.callback(t.add, 'add_comment')],
		[Markup.button.callback(t.skip, 'skip_comment')],
	])
}

const workHoursKeyboard = (lang = 'uz') => {
	return Markup.inlineKeyboard([
		[
			Markup.button.callback(
				lang === 'uz'
					? '🌅 10:00 - 18:00 (Kunduzi)'
					: '🌅 10:00 - 18:00 (Дневное)',
				'work_1000_1800',
			),
		],
		[
			Markup.button.callback(
				lang === 'uz'
					? '🌆 18:00 - 02:00 (Kechqurun)'
					: '🌆 18:00 - 02:00 (Вечернее)',
				'work_1800_0200',
			),
		],
		[
			Markup.button.callback(
				lang === 'uz'
					? '🌃 02:00 - 10:00 (Tungi)'
					: '🌃 02:00 - 10:00 (Ночное)',
				'work_0200_1000',
			),
		],
		[
			Markup.button.callback(
				lang === 'uz' ? "✏️ Qo'lda kiritish" : '✏️ Ввести вручную',
				'work_custom',
			),
		],
	])
}

const customWorkHoursKeyboard = (lang = 'uz') => {
	return {
		inline_keyboard: [
			[
				{
					text: lang === 'uz' ? '08:00 - 20:00' : '08:00 - 20:00',
					callback_data: 'work_custom_08:00_20:00',
				},
				{
					text: lang === 'uz' ? '22:00 - 06:00' : '22:00 - 06:00',
					callback_data: 'work_custom_22:00_06:00',
				},
			],
			[
				{
					text: lang === 'uz' ? '09:00 - 17:00' : '09:00 - 17:00',
					callback_data: 'work_custom_09:00_17:00',
				},
				{
					text: lang === 'uz' ? '07:00 - 19:00' : '07:00 - 19:00',
					callback_data: 'work_custom_07:00_19:00',
				},
			],
			[
				{
					text: lang === 'uz' ? '✏️ Boshqa vaqt kiritish' : '✏️ Другое время',
					callback_data: 'work_custom_enter',
				},
			],
		],
	}
}

const confirmKeyboard2 = (lang = 'uz') => {
	const texts = {
		uz: {
			confirm: "✅ Ha, to'g'ri",
			cancel: "❌ Yo'q, o'zgartirish",
		},
		ru: {
			confirm: '✅ Да, верно',
			cancel: '❌ Нет, изменить',
		},
	}

	const t = texts[lang]

	return Markup.inlineKeyboard([
		[Markup.button.callback(t.confirm, 'confirm')],
		[Markup.button.callback(t.cancel, 'cancel')],
	])
}

const carNumberKeyboard = (lang = 'uz') => {
	const message =
		lang === 'uz'
			? '🚘 Mashina raqamingizni kiriting:\n\n' +
				'📝 **Format:** 01A123AB, 10B777DC, 30D123CE\n\n' +
				"⚠️ **Eslatma:** O'zbekiston davlat raqami formatida bo'lishi kerak:\n" +
				'• 2 ta raqam (01-99 - viloyat kodi)\n' +
				'• 1 ta lotin harfi (A-Z)\n' +
				'• 3 ta raqam (001-999)\n' +
				'• 2 ta lotin harfi (A-Z)\n\n' +
				'**Masalan:**\n' +
				'✅ 01A123AB\n' +
				'✅ 10B777DC\n' +
				'✅ 30D123CE\n\n' +
				'Iltimos, mashina raqamingizni yuqoridagi formatda kiriting:'
			: '🚘 Введите номер машины:\n\n' +
				'📝 **Формат:** 01A123AB, 10B777DC, 30D123CE\n\n' +
				'⚠️ **Примечание:** Должен быть в формате узбекских госномеров:\n' +
				'• 2 цифры (01-99 - код региона)\n' +
				'• 1 латинская буква (A-Z)\n' +
				'• 3 цифры (001-999)\n' +
				'• 2 латинские буквы (A-Z)\n\n' +
				'**Например:**\n' +
				'✅ 01A123AB\n' +
				'✅ 10B777DC\n' +
				'✅ 30D123CE\n\n' +
				'Пожалуйста, введите номер машины в указанном формате:'

	return Markup.inlineKeyboard([
		[
			Markup.button.callback(
				lang === 'uz' ? '❌ Bekor qilish' : '❌ Отмена',
				'cancel_car_number',
			),
		],
	])
}
const languageKeyboard = () => {
	return Markup.inlineKeyboard([
		[Markup.button.callback('🇺🇿 O‘zbek tili', 'lang_uz')],
		[Markup.button.callback('🇷🇺 Русский язык', 'lang_ru')],
	])
}
module.exports = {
	showMainMenu,
	mainMenuKeyboard,
	fromRegionsKeyboard,
	toRegionsKeyboard,
	driverFromRegionsKeyboard,
	driverToRegionsKeyboard,
	parcelKeyboard,
	serviceTypeKeyboard,
	confirmKeyboard,
	commentKeyboard,
	workHoursKeyboard,
	customWorkHoursKeyboard,
	confirmKeyboard2,
	passengerCountKeyboard,
	maxPassengersKeyboard,
	carNumberKeyboard,
	languageKeyboard,
}
