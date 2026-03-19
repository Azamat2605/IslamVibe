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
  
  // Проверим localStorage до клика
  const before = await page.evaluate(() => {
    return {
      welcomeModalSeen: localStorage.getItem('welcomeModalSeen'),
      settings: localStorage.getItem('settings')
    };
  });
  
  console.log('LocalStorage before click:', before);
  
  // Кликнем по кнопке
  await page.evaluate(() => {
    const modalBackdrop = document.querySelector('.fixed.inset-0.z-40');
    const button = modalBackdrop.querySelector('button[type="button"]');
    button.click();
  });
  
  // Подождем
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Проверим localStorage после клика
  const after = await page.evaluate(() => {
    return {
      welcomeModalSeen: localStorage.getItem('welcomeModalSeen'),
      settings: localStorage.getItem('settings')
    };
  });
  
  console.log('LocalStorage after click:', after);
  
  // Перезагрузим страницу
  await page.reload();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Проверим, появилась ли модалка снова
  const modalVisible = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0.z-40');
    return modal ? modal.style.display !== 'none' && modal.style.visibility !== 'hidden' : false;
  });
  
  console.log('Modal visible after reload?', modalVisible);
  
  // Проверим localStorage после перезагрузки
  const afterReload = await page.evaluate(() => {
    return {
      welcomeModalSeen: localStorage.getItem('welcomeModalSeen'),
      settings: localStorage.getItem('settings')
    };
  });
  
  console.log('LocalStorage after reload:', afterReload);
  
  await browser.close();
})();
