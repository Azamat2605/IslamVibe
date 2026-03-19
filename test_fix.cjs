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
  
  console.log('Modal is visible');
  
  // Проверим, есть ли кнопка "Начать общение"
  const buttonExists = await page.evaluate(() => {
    const modalBackdrop = document.querySelector('.fixed.inset-0.z-40');
    if (!modalBackdrop) return false;
    const button = modalBackdrop.querySelector('button[type="button"]');
    return button && button.textContent.includes('Начать общение');
  });
  
  console.log('Button exists?', buttonExists);
  
  if (buttonExists) {
    // Кликнем по кнопке
    await page.evaluate(() => {
      const modalBackdrop = document.querySelector('.fixed.inset-0.z-40');
      const button = modalBackdrop.querySelector('button[type="button"]');
      button.click();
    });
    
    console.log('Button clicked');
    
    // Подождем анимацию закрытия
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Проверим, исчезла ли модалка
    const modalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.fixed.inset-0.z-40');
      return modal ? modal.style.display !== 'none' && modal.style.visibility !== 'hidden' : false;
    });
    
    console.log('Modal visible after click?', modalVisible);
    
    if (!modalVisible) {
      console.log('SUCCESS: Modal closed!');
      
      // Проверим, что модалка не появляется после перезагрузки
      await page.reload();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const modalVisibleAfterReload = await page.evaluate(() => {
        const modal = document.querySelector('.fixed.inset-0.z-40');
        return modal ? modal.style.display !== 'none' && modal.style.visibility !== 'hidden' : false;
      });
      
      console.log('Modal visible after reload?', modalVisibleAfterReload);
      
      if (!modalVisibleAfterReload) {
        console.log('SUCCESS: Modal stays closed after reload!');
      } else {
        console.log('FAIL: Modal reappeared after reload');
      }
    } else {
      console.log('FAIL: Modal still visible');
    }
  }
  
  await browser.close();
})();
