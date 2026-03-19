const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`Browser console [${msg.type()}]:`, msg.text());
  });
  
  await page.goto('http://localhost:5173');
  
  // Ждем появления модалки WelcomeModal
  await page.waitForSelector('.fixed.inset-0.z-40', { timeout: 5000 });
  
  // Дадим время для завершения анимаций
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Найдем все кнопки типа button внутри модалки
  const buttonsInfo = await page.evaluate(() => {
    // Найдем модалку WelcomeModal (backdrop)
    const modalBackdrop = document.querySelector('.fixed.inset-0.z-40');
    if (!modalBackdrop) return { error: 'Modal backdrop not found' };
    
    // Найдем все кнопки внутри backdrop
    const buttons = modalBackdrop.querySelectorAll('button[type="button"]');
    const buttonsData = [];
    
    buttons.forEach((button, index) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtCenter = document.elementFromPoint(centerX, centerY);
      
      buttonsData.push({
        index,
        textContent: button.textContent?.trim(),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        className: button.className,
        id: button.id,
        elementAtCenter: elementAtCenter ? {
          tagName: elementAtCenter.tagName,
          className: elementAtCenter.className
        } : null,
        isCovered: elementAtCenter !== button,
        outerHTML: button.outerHTML.substring(0, 150)
      });
    });
    
    return { buttonsData, backdropClass: modalBackdrop.className };
  });
  
  console.log('Buttons info:', JSON.stringify(buttonsInfo, null, 2));
  
  // Найдем кнопку с текстом "Начать общение"
  const targetButtonIndex = buttonsInfo.buttonsData?.findIndex(btn => 
    btn.textContent && btn.textContent.includes('Начать общение')
  );
  
  if (targetButtonIndex !== undefined && targetButtonIndex !== -1) {
    console.log(`Found target button at index ${targetButtonIndex}`);
    
    // Кликнем по кнопке через JavaScript
    const clickResult = await page.evaluate((index) => {
      const modalBackdrop = document.querySelector('.fixed.inset-0.z-40');
      if (!modalBackdrop) return { error: 'Modal backdrop not found' };
      
      const buttons = modalBackdrop.querySelectorAll('button[type="button"]');
      if (buttons.length <= index) return { error: 'Button not found' };
      
      const button = buttons[index];
      
      // Создаем событие click
      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: button.getBoundingClientRect().left + button.getBoundingClientRect().width / 2,
        clientY: button.getBoundingClientRect().top + button.getBoundingClientRect().height / 2
      });
      
      console.log('Dispatching click to button:', button.textContent?.trim());
      button.dispatchEvent(event);
      
      return { success: true, buttonText: button.textContent?.trim() };
    }, targetButtonIndex);
    
    console.log('Click result:', clickResult);
    
    // Подождем и проверим, закрылась ли модалка
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const modalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.fixed.inset-0.z-40');
      return modal ? modal.style.display !== 'none' && modal.style.visibility !== 'hidden' : false;
    });
    
    console.log('Modal visible after click?', modalVisible);
  } else {
    console.log('Target button not found');
  }
  
  await browser.close();
})();
