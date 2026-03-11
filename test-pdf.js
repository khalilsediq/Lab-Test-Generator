import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 1024,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  console.log("Loading app...");
  await win.loadURL('http://localhost:5173');

  console.log("Waiting for app to load...");
  await new Promise(r => setTimeout(r, 4000));

  console.log("Setting patient name...");
  await win.webContents.executeJavaScript(`
    (() => {
      const input = document.querySelector('input[placeholder="Patient Name"]');
      if (input) {
        input.value = "Test User Print Engine";
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(input, "Test User Print Engine");
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })();
  `);

  console.log("Selecting initial test in sidebar...");
  await win.webContents.executeJavaScript(`
    (() => {
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('CBC (Complete Blood Count)'));
      if (btn) btn.click();
    })();
  `);
  
  await new Promise(r => setTimeout(r, 1000));

  console.log("Adding additional tests...");
  await win.webContents.executeJavaScript(`
    (async () => {
      const texts = [
        "Renal Function Test",
        "Liver Function Test",
        "Serum Electrolytes",
        "Biochemistry",
        "Endocrinology"
      ];
      for (const text of texts) {
        const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Add Another Test'));
        if (addBtn) addBtn.click();
        
        await new Promise(r => setTimeout(r, 300));
        
        const select = document.querySelector('select');
        if (select) {
           const option = Array.from(select.options).find(o => o.text.includes(text));
           if(option) {
               select.value = option.value;
               select.dispatchEvent(new Event('change', { bubbles: true }));
           }
        }
        
        await new Promise(r => setTimeout(r, 300));
        
        const confirmAddBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Add');
        if (confirmAddBtn) confirmAddBtn.click();
        
        await new Promise(r => setTimeout(r, 400));
      }
    })();
  `);

  await new Promise(r => setTimeout(r, 3000));
  fs.writeFileSync('C:\\Users\\Kali_Ops\\.gemini\\antigravity\\brain\\c1aec3b3-2bef-4ad9-a805-d72af403f072\\debug-2-tests.png', (await win.webContents.capturePage()).toPNG());

  console.log("Clicking Generate Report...");
  await win.webContents.executeJavaScript(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const genBtn = btns.find(b => b.textContent.includes('Generate Report'));
      if (genBtn) genBtn.click();
    })();
  `);

  await new Promise(r => setTimeout(r, 3000));
  fs.writeFileSync('C:\\Users\\Kali_Ops\\.gemini\\antigravity\\brain\\c1aec3b3-2bef-4ad9-a805-d72af403f072\\debug-3-report.png', (await win.webContents.capturePage()).toPNG());

  console.log("Generating Pagination JS & Clicking Print...");
  await win.webContents.executeJavaScript(`
    (() => {
      window.print = function() { console.log('Mock print called'); };
      const btns = Array.from(document.querySelectorAll('button'));
      const printBtn = btns.find(b => b.textContent.includes('Print'));
      if (printBtn) printBtn.click();
    })();
  `);

  await new Promise(r => setTimeout(r, 2000));

  console.log("Printing to PDF...");
  const pdfData = await win.webContents.printToPDF({
    landscape: false,
    printBackground: true,
    pageSize: 'A4',
    margins: { marginType: 'none' }
  });

  fs.writeFileSync('C:\\Users\\Kali_Ops\\.gemini\\antigravity\\brain\\c1aec3b3-2bef-4ad9-a805-d72af403f072\\verified-print.pdf', pdfData);
  console.log("PDF saved to artifacts directory as verified-print.pdf");
  
  app.quit();
});
