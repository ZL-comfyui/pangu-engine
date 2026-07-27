/**
 * 白标版 API 路由
 * 白标版客户可获取自己的品牌配置，用于前端定制
 *
 * 认证方式：Token（从请求中获取白标用户身份）
 */

const express = require('express');
const router = express.Router();
const { getWhitelabelConfig } = require('../services/config');
const { UserModel } = require('../services/db');

/**
 * 获取白标配置（公开接口，根据域名/Token返回对应品牌配置）
 * 前端加载时调用，获取品牌名/Logo/配色等
 */
router.get('/config', (req, res) => {
  try {
    // 从 Header 获取用户身份（如果有token则是已登录白标用户）
    const authHeader = req.headers.authorization;
    let user = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = UserModel.findByToken(authHeader.split(' ')[1]);
    }

    // 白标用户返回定制配置，普通用户返回默认
    if (user && (user.plan === 'whitelabel' || user.plan === 'enterprise')) {
      const config = getWhitelabelConfig();
      res.json({
        isWhitelabel: true,
        brand: config,
        plan: user.plan,
      });
    } else {
      // 默认品牌
      res.json({
        isWhitelabel: false,
        brand: {
          brandName: '盘古AI',
          primaryColor: '#4F46E5',
          secondaryColor: '#7C3AED',
        },
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 获取白标客户的用户前端
 * 白标版客户的用户会重定向到定制化的前端页面
 */
router.get('/client-ui', (req, res) => {
  const config = getWhitelabelConfig();
  res.json({
    brand: config,
    apiBase: '/api',
  });
});

module.exports = router;
