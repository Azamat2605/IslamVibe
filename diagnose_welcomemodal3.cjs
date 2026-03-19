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
  
  // Выполняем детальную диагностику
  const diagnosis = await page.evaluate(() => {
    const button = document.querySelector('button[type="button"]');
    if (!button) return { error: 'Button not found' };
    
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const elementAtCenter = document.elementFromPoint(centerX, centerY);
    
    // Получаем информацию о перекрывающем элементе
    let overlappingElementInfo = null;
    if (elementAtCenter && elementAtCenter !== button) {
      overlappingElementInfo = {
        tagName: elementAtCenter.tagName,
        id: elementAtCenter.id,
        className: elementAtCenter.className,
        computedStyle: {
          pointerEvents: window.getComputedStyle(elementAtCenter).pointerEvents,
          position: window.getComputedStyle(elementAtCenter).position,
          zIndex: window.getComputedStyle(elementAtCenter).zIndex,
          opacity: window.getComputedStyle(elementAtCenter).opacity,
          visibility: window.getComputedStyle(elementAtCenter).visibility,
          display: window.getComputedStyle(elementAtCenter).display,
        }
      };
    }
    
    // Получаем информацию о кнопке
    const buttonStyle = window.getComputedStyle(button);
    
    return {
      button: {
        textContent: button.textContent,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        style: {
          pointerEvents: buttonStyle.pointerEvents,
          position: buttonStyle.position,
          zIndex: buttonStyle.zIndex,
          opacity: buttonStyle.opacity,
          visibility: buttonStyle.visibility,
          display: buttonStyle.display,
          cursor: buttonStyle.cursor,
        },
        onclick: button.onclick,
        hasEventListener: !!button.onclick,
      },
      elementAtCenter: overlappingElementInfo ? overlappingElementInfo : 
        (elementAtCenter ? { tagName: elementAtCenter.tagName, id: elementAtCenter.id, className: elementAtCenter.className } : null),
      isCovered: elementAtCenter !== button,
      windowInnerSize: { width: window.innerWidth, height: window.innerHeight },
      // Проверяем родительские элементы
      parentChain: (() => {
        const chain = [];
        let parent = button.parentElement;
        let count = 0;
        while (parent && count < 5) {
          chain.push({
            tagName: parent.tagName,
            id: parent.id,
            className: parent.className,
            style: {
              pointerEvents: window.getComputedStyle(parent).pointerEvents,
              overflow: window.getComputedStyle(parent).overflow,
            }
          });
          parent = parent.parentElement;
          count++;
        }
        return chain;
      })()
    };
  });
  
  console.log('Detailed diagnosis:', JSON.stringify(diagnosis, null, 2));
  
  // Делаем скриншот
  await page.screenshot({ path: 'diagnosis_screenshot3.png' });
  
  await browser.close();
})();
