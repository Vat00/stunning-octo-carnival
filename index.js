const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');

// Загрузка каталога
const catalogPath = path.join(__dirname, 'data', 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

// Доступные регионы
const regions = {
  '1': { key: 'spb', name: 'СПБ' },
  '2': { key: 'msk', name: 'МСК' },
  '3': { key: 'krd', name: 'КРД' }
};

// Утилита для вопросов
async function question(rl, text) {
  const answer = await rl.question(text);
  return answer.trim();
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('=== Система заказа строительных материалов ===\n');

  try {
    // ----- Шаг 1: выбор региона -----
    console.log('Доступные регионы:');
    for (const [num, reg] of Object.entries(regions)) {
      console.log(`${num}. ${reg.name}`);
    }
    let regionChoice;
    while (true) {
      const input = await question(rl, 'Выберите регион (введите номер): ');
      if (regions[input]) {
        regionChoice = regions[input];
        break;
      }
      console.log('Ошибка: введите 1, 2 или 3.');
    }
    const selectedRegion = regionChoice;
    console.log(`\nВыбран регион: ${selectedRegion.name}\n`);

    // ----- Шаг 2: вывод каталога с ценами для региона -----
    console.log('Каталог материалов:');
    catalog.forEach((item, index) => {
      const price = item.prices[selectedRegion.key];
      console.log(`${index + 1}. ${item.name} (${item.category}) — ${price} руб.`);
    });

    // ----- Шаг 3: выбор товара -----
    let chosenProduct;
    while (true) {
      const input = await question(rl, '\nВведите номер товара: ');
      const num = parseInt(input, 10);
      if (!isNaN(num) && num >= 1 && num <= catalog.length) {
        chosenProduct = catalog[num - 1];
        break;
      }
      console.log(`Ошибка: введите число от 1 до ${catalog.length}.`);
    }
    const initialPrice = chosenProduct.prices[selectedRegion.key];
    console.log(`\nВаш заказ: ${chosenProduct.name} за ${initialPrice} руб. (регион: ${selectedRegion.name})`);

    // ----- Шаг 4: первичное подтверждение -----
    let confirm = await question(rl, 'Оформляем заявку? (y/n): ');
    if (confirm.toLowerCase() === 'y') {
      createOrder(selectedRegion, chosenProduct, initialPrice, false);
      console.log('Заявка успешно создана (см. файл order.json). До свидания!');
      rl.close();
      return;
    }

    // ----- Логика удержания клиента -----
    console.log('\nПоиск более выгодного предложения...');

    // Определяем группу товара
    const category = chosenProduct.category;
    const sameCategoryItems = catalog.filter(item => item.category === category);

    // Находим минимальную цену в группе для выбранного региона
    const minPrice = Math.min(...sameCategoryItems.map(item => item.prices[selectedRegion.key]));
    const cheapestItems = sameCategoryItems.filter(
      item => item.prices[selectedRegion.key] === minPrice
    );
    const cheapestProduct = cheapestItems[0]; // если несколько, берём первый

    let offerProduct, offerPrice, discountApplied = false;

    if (chosenProduct.name === cheapestProduct.name) {
      // Текущий товар уже самый дешёвый – предлагаем скидку 5%
      offerProduct = chosenProduct;
      offerPrice = Math.round(initialPrice * 0.95);
      discountApplied = true;
      console.log(`\nЭто самый дешёвый товар в категории "${category}".`);
      console.log(`Специальное предложение: скидка 5% — цена составит ${offerPrice} руб.`);
    } else {
      // Предлагаем самый дешёвый аналог
      offerProduct = cheapestProduct;
      offerPrice = minPrice;
      console.log(`\nВ категории "${category}" есть более дешёвый аналог:`);
      console.log(`${offerProduct.name} за ${offerPrice} руб.`);
    }

    // Повторный вопрос
    confirm = await question(rl, 'Оформляем заявку с этим предложением? (y/n): ');
    if (confirm.toLowerCase() === 'y') {
      createOrder(selectedRegion, offerProduct, offerPrice, discountApplied);
      console.log('Заявка успешно создана (см. файл order.json). До свидания!');
    } else {
      console.log('Заявка отменена. До свидания!');
    }

  } catch (err) {
    console.error('Произошла ошибка:', err);
  } finally {
    rl.close();
  }
}

// Функция создания JSON-заявки
function createOrder(region, product, price, discountApplied) {
  const order = {
    date: new Date().toISOString(),
    region: region.name,
    product: product.name,
    category: product.category,
    price: price,
    discountApplied: discountApplied
  };
  fs.writeFileSync('order.json', JSON.stringify(order, null, 2), 'utf-8');
}

main();