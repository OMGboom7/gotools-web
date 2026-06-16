# gotools-web 🛠️

Vite + React + TypeScript 小工具集合前端

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)

---

## 快速开始

```bash
# 克隆
git clone https://github.com/OMGboom7/gotools-web.git && cd gotools-web

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:23334/`。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE` | `/api/v1` | gotools 后端 API 地址 |

开发模式下 Vite 自动代理 `/api` 到 `http://localhost:23333`（见 `vite.config.js`）。

## 页面

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 工具入口导航 |
| `/minio` | MinIO 管理 | 对象存储管理页面 |

## MinIO 管理功能

### 桶管理

| 功能 | 后端接口 |
|------|---------|
| 列出桶 | `GET /api/v1/` |
| 创建桶 | `PUT /api/v1/{bucket}` |
| 检查桶 | `HEAD /api/v1/{bucket}` |
| 删除桶 | `DELETE /api/v1/{bucket}` |

### 对象管理

| 功能 | 后端接口 |
|------|---------|
| 列出对象 | `GET /api/v1/{bucket}?prefix=` |
| 上传文件 | `PUT /api/v1/{bucket}/{key}` |
| 下载文件 | `GET /api/v1/{bucket}/{key}` |
| 预签名 URL | `GET /api/v1/{bucket}/{key}?presigned=true` |
| 删除对象 | `DELETE /api/v1/{bucket}/{key}` |

## 项目结构

```
gotools-web/
├── src/
│   ├── api/
│   │   └── minio.ts          # gotools 后端 API 封装
│   ├── pages/
│   │   └── Minio/
│   │       └── MinioPage.tsx # MinIO 管理页面
│   ├── App.tsx               # 路由入口
│   ├── App.css               # 全局样式
│   ├── main.tsx              # 应用入口
│   └── vite-env.d.ts         # Vite 类型声明
├── index.html
├── vite.config.js            # Vite 配置 + API 代理
├── tsconfig.json
├── .env.example              # 环境变量模板
└── package.json
```

## 构建

```bash
npm run build     # 输出到 dist/
npm run preview   # 预览构建结果
```
