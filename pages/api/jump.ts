import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 回傳 200 OK 狀態碼，讓 Safari 認為這個 HTTPS 請求已經安全完成
  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(`
    <!DOCTYPE html>
    <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="refresh" content="0;url=http://211.75.18.228/tkkweb/inventory/list.asp">
        <title>系統跳轉中...</title>
        <style>
          body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8fbfd; color: #333; margin: 0; }
          .box { text-align: center; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 80%; max-width: 400px; border: 1px solid #cce3fd; }
          h3 { color: #185fa5; margin-top: 0; }
          a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #185fa5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; width: 100%; box-sizing: border-box; }
          a:active { background: #124b82; }
        </style>
      </head>
      <body>
        <div class="box">
          <h3>🔄 正在前往內部系統</h3>
          <p style="color: #666; font-size: 14px;">料號已為您複製！<br>若畫面無自動跳轉，請點擊下方按鈕：</p>
          
          <a href="http://211.75.18.228/tkkweb/inventory/list.asp">進入內部系統 ➔</a>
        </div>

        <script>
          // 嘗試使用 JavaScript 再次觸發自動轉址
          setTimeout(function() {
            window.location.href = "http://211.75.18.228/tkkweb/inventory/list.asp";
          }, 600);
        </script>
      </body>
    </html>
  `);
}