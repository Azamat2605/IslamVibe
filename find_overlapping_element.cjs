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
  
  // Дадим время для завершения анимаций
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const overlappingInfo = await page.evaluate(() => {
    const button = document.querySelector('button[type="button"]');
    if (!button) return { error: 'Button not found' };
    
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Найдем все элементы в этой точке
    const elementsAtPoint = [];
    let currentElement = document.elementFromPoint(centerX, centerY);
    while (currentElement && currentElement !== document.documentElement) {
      elementsAtPoint.push({
        tagName: currentElement.tagName,
        id: currentElement.id,
        className: currentElement.className,
        computedStyle: {
          pointerEvents: window.getComputedStyle(currentElement).pointerEvents,
          position: window.getComputedStyle(currentElement).position,
          zIndex: window.getComputedStyle(currentElement).zIndex,
          opacity: window.getComputedStyle(currentElement).opacity,
          visibility: window.getComputedStyle(currentElement).visibility,
          display: window.getComputedStyle(currentElement).display,
        }
      });
      // Поднимемся на уровень выше
      currentElement = currentElement.parentElement;
    }
    
    // Проверим, есть ли у кнопки обработчики событий
    const hasClickListeners = typeof getEventListeners === 'function' ? 
      (getEventListeners(button)?.click?.length > 0) : 'getEventListeners not available';
    
    return {
      buttonRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      elementsAtPoint,
      hasClickListeners,
      buttonOnclick: button.onclick,
      buttonOuterHTML: button.outerHTML.substring(0, 200)
    };
  });
  
  console.log('Overlapping info:', JSON.stringify(overlappingInfo, null, 2));
  
  // Попробуем кликнуть через JavaScript
  const clickResult = await page.evaluate(() => {
    const button = document.querySelector('button[type="button"]');
    if (!button) return { error: 'Button not found' };
    
    // Создаем и dispatch событие click
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: button.getBoundingClientRect().left + button.getBoundingClientRect().width / 2,
      clientY: button.getBoundingClientRect().top + button.getBoundingClientRect().height / 2
    });
    
    const before = Date.now();
    button.dispatchEvent(event);
    const after = Date.now();
    
    return { dispatched: true, time: after - before };
  });
  
  console.log('Click via JavaScript:', clickResult);
  
  // Подождем и проверим, закрылась ли модалка
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const modalVisible = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0.z-40');
    return modal ? modal.style.display !== 'none' && modal.style.visibility !== 'hidden' : false;
  });
  
  console.log('Modal visible after programmatic click?', modalVisible);
  
  await browser.close();
})();
