import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 收到請求後，從伺服器端強制轉向公司的內網系統
  res.redirect(307, 'http://211.75.18.228/tkkweb/inventory/list.asp');
}