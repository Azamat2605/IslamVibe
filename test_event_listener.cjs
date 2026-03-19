const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`Browser console [${msg.type()}]:`, msg.text());
  });
  
  await page.goto('http://localhost:5173');
  
  // Ждем появления модалки
  await page.waitForSelector('.fixed.inset-0.z-40', { timeout: 5000 });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Добавим обработчик события click на кнопку
  await page.evaluate(() => {
    const modalBackdrop = document.querySelector('.fixed.inset-0.z-40');
    if (!modalBackdrop) return;
    
    const button = modalBackdrop.querySelector('button[type="button"]');
    if (!button) return;
    
    console.log('Adding test event listener to button');
    
    // Добавим наш обработчик
    button.addEventListener('click', function(e) {
      console.log('TEST EVENT LISTENER: Button clicked!');
      console.log('Event type:', e.type);
      console.log('Button text:', this.textContent?.trim());
      console.log('Calling original onclick if exists...');
      
      // Попробуем вызвать оригинальный обработчик
      if (this.onclick) {
        console.log('Original onclick exists, calling it');
        this.onclick(e);
      } else {
        console.log('No original onclick property');
      }
    }, { once: true });
  });
  
  // Кликнем по кнопке через JavaScript
  console.log('Dispatching click event...');
  await page.evaluate(() => {
    const modalBackdrop = document.querySelector('.fixed.inset-0.z-40');
    if (!modalBackdrop) return;
    
    const button = modalBackdrop.querySelector('button[type="button"]');
    if (!button) return;
    
    button.click();
  });
  
  // Подождем
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Проверим, видна ли модалка
  const modalVisible = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0.z-40');
    return modal ? modal.style.display !== 'none' && modal.style.visibility !== 'hidden' : false;
  });
  
  console.log('Modal visible after click?', modalVisible);
  
  await browser.close();
})();
