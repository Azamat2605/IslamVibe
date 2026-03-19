const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`Browser console [${msg.type()}]:`, msg.text());
  });
  
  await page.goto('http://localhost:5173');
  
  // Ждем появления модалки
  await page.waitForSelector('button[type="button"]', { timeout: 5000 });
  
  // Добавим простой обработчик для проверки
  await page.evaluate(() => {
    const button = document.querySelector('button[type="button"]');
    if (button) {
      // Сохраним оригинальный обработчик
      const originalOnclick = button.onclick;
      button.addEventListener('click', function(e) {
        console.log('TEST: Button clicked via addEventListener');
        console.log('Event target:', e.target.tagName);
        console.log('Event currentTarget:', e.currentTarget.tagName);
        console.log('Event bubbles:', e.bubbles);
        console.log('Event defaultPrevented:', e.defaultPrevented);
        // Вызовем оригинальный обработчик, если есть
        if (originalOnclick) {
          originalOnclick.call(this, e);
        }
      });
    }
  });
  
  // Кликаем и ждем
  console.log('Clicking button...');
  await page.click('button[type="button"]');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Проверим, видна ли еще модалка
  const modalVisible = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0.z-40'); // селектор backdrop
    return modal ? modal.style.display !== 'none' && modal.style.visibility !== 'hidden' : false;
  });
  
  console.log('Modal visible after click?', modalVisible);
  
  // Проверим, были ли логи от оригинального обработчика
  await browser.close();
})();
