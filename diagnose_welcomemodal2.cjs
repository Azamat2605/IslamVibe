const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Перехватываем все console сообщения
  page.on('console', msg => {
    console.log(`Browser console [${msg.type()}]:`, msg.text());
  });
  
  // Перехватываем ошибки страницы
  page.on('pageerror', error => {
    console.log('Page error:', error.message);
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
      windowInnerSize: { width: window.innerWidth, height: window.innerHeight },
      buttonOnclick: button.onclick ? 'exists' : 'null',
      buttonAttributes: button.getAttribute('onclick')
    };
  });
  
  console.log('Overlap diagnosis:', overlapInfo);
  
  // Проверим, есть ли обработчик события click на кнопке
  const hasClickHandler = await page.evaluate(() => {
    const button = document.querySelector('button[type="button"]');
    if (!button) return false;
    const clickListeners = getEventListeners(button);
    return clickListeners && clickListeners.click && clickListeners.click.length > 0;
  }).catch(() => false);
  
  console.log('Has click event listeners?', hasClickHandler);
  
  // Добавим свой обработчик для проверки
  await page.evaluate(() => {
    const button = document.querySelector('button[type="button"]');
    if (button) {
      button.addEventListener('click', () => {
        console.log('TEST: Additional click handler fired');
      }, { once: true });
    }
  });
  
  // Кликаем по кнопке
  console.log('Clicking button...');
  await page.click('button[type="button"]');
  
  // Ждем 1 секунду
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Проверяем, исчезла ли модалка
  const modalVisible = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], .modal, .fixed');
    return modal ? modal.style.display !== 'none' && modal.style.visibility !== 'hidden' : false;
  });
  
  console.log('Modal still visible after click?', modalVisible);
  
  // Проверим значение welcomeModalSeen в localStorage или settings
  const settingsState = await page.evaluate(() => {
    return {
      welcomeModalSeen: localStorage.getItem('welcomeModalSeen'),
      settings: window.$settings
    };
  });
  
  console.log('Settings state:', settingsState);
  
  // Делаем скриншот
  await page.screenshot({ path: 'diagnosis_screenshot2.png' });
  
  await browser.close();
})();
