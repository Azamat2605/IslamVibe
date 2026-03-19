const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Перехватываем console.log
  page.on('console', msg => {
    console.log('Browser console:', msg.text());
  });
  
  await page.goto('http://localhost:5173');
  
  // Ждем появления модалки
  await page.waitForSelector('button[type="button"]', { timeout: 5000 });
  
  // Выполняем диагностику перекрытия
  const overlapInfo = await page.evaluate(() => {
    const button = document.querySelector('button[type="button"]');
    if (!button) return { error: 'Button not found' };
    
    const rect = button.getBoundingClientRect();
    const elementAtCenter = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );
    
    return {
      buttonText: button.textContent,
      buttonPosition: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      elementAtCenter: elementAtCenter ? elementAtCenter.tagName + (elementAtCenter.id ? '#' + elementAtCenter.id : '') : null,
      isCovered: elementAtCenter !== button,
      windowInnerSize: { width: window.innerWidth, height: window.innerHeight }
    };
  });
  
  console.log('Overlap diagnosis:', overlapInfo);
  
  // Кликаем по кнопке
  await page.click('button[type="button"]');
  
  // Ждем 1 секунду
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Проверяем, исчезла ли модалка
  const modalVisible = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], .modal, .fixed');
    return modal ? modal.style.display !== 'none' && modal.style.visibility !== 'hidden' : false;
  });
  
  console.log('Modal still visible after click?', modalVisible);
  
  // Делаем скриншот
  await page.screenshot({ path: 'diagnosis_screenshot.png' });
  
  await browser.close();
})();
