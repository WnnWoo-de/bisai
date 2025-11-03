# Green AI Web

Green AI Web 是一个旨在通过 AI 技术促进环保行为的全栈 Web 应用。它结合了前端 Vue.js、后端 Node.js 和 MySQL 数据库，为用户提供了一个记录、分享和激励环保活动的平台。

## 功能

- **用户认证**：注册、登录和个人资料管理。
- **环保活动追踪**：记录和追踪用户的环保活动，如回收、减少碳足迹等。
- **AI 建议**：基于用户活动数据，提供个性化的环保建议。
- **成就系统**：通过完成环保任务解锁成就，激励用户持续参与。
- **排行榜**：展示顶尖用户的环保贡献，营造社区竞争氛围。
- **商店**：用户可以使用积分兑换环保商品。

## 技术栈

### 前端

- **Vue.js 3**：一个渐进式 JavaScript 框架，用于构建用户界面。
- **Vite**：下一代前端构建工具，提供极速的开发体验。
- **Pinia**：Vue 的官方状态管理库。
- **Vue Router**：Vue.js 的官方路由管理器。
- **Tailwind CSS**：一个功能类优先的 CSS 框架，用于快速构建自定义设计。
- **Naive UI**：一个 Vue 3 组件库，提供丰富美观的 UI 组件。
- **Chart.js**：一个简单而灵活的 JavaScript 图表库。

### 后端

- **Node.js**：一个基于 Chrome V8 引擎的 JavaScript 运行时。
- **Express.js**：一个快速、极简的 Node.js Web 应用框架。
- **MySQL 8.0**：一个流行的开源关系型数据库。
- **Sequelize**：一个基于 Promise 的 Node.js ORM，用于 Postgres、MySQL、MariaDB、SQLite 和 Microsoft SQL Server。
- **JWT (JSON Web Tokens)**：用于用户认证和授权。

## 项目结构

```
greenn/
├── .env                # 根目录环境变量
├── server/             # 后端代码
│   ├── .env            # 后端环境变量
│   ├── config/         # 数据库配置
│   ├── models/         # Sequelize 模型
│   ├── routes/         # API 路由
│   ├── middleware/     # Express 中间件
│   ├── scripts/        # 数据库脚本
│   └── server.js       # 服务器入口
├── src/                # 前端代码
│   ├── api/            # API 请求模块
│   ├── assets/         # 静态资源
│   ├── components/     # Vue 组件
│   ├── router/         # Vue 路由
│   ├── stores/         # Pinia stores
│   ├── views/          # Vue 视图
│   └── main.js         # 前端入口
├── package.json        # 项目依赖和脚本
└── Readme.md           # 项目说明
```

## 安装和运行

### 前提条件

- Node.js (v14 或更高版本)
- MySQL 8.0

### 后端设置

1. **克隆仓库**：
   ```bash
   git clone https://github.com/your-username/greenn.git
   cd greenn
   ```

2. **安装后端依赖**：
   ```bash
   cd server
   npm install
   ```

3. **设置数据库**：
   - 确保 MySQL 8.0 已安装并正在运行。
   - 在 `server/` 目录下创建一个 `.env` 文件，并根据 `DATABASE_SETUP.md` 配置数据库连接。
   - 运行数据库创建脚本：
     ```bash
     mysql -u root -p < server/scripts/create_database.sql
     ```
   - （可选）运行数据库初始化脚本以填充初始数据：
     ```bash
     node scripts/initDatabase.js
     ```

4. **启动后端服务器**：
   ```bash
   npm start
   ```
   后端服务器将在 `http://localhost:3000` 上运行。

### 前端设置

1. **安装前端依赖**：
   ```bash
   cd ..  # 返回根目录
   npm install
   ```

2. **启动前端开发服务器**：
   ```bash
   npm run dev
   ```
   前端应用将在 `http://localhost:5173` 上运行。

## API 文档

API 文档可通过 Swagger UI 查看。当后端服务器运行时，在浏览器中访问 `http://localhost:3000/api-docs`。

## 贡献

欢迎为 Green AI Web 做出贡献！请遵循以下步骤：

1. Fork 本仓库。
2. 创建一个新的分支 (`git checkout -b feature/your-feature`)。
3. 提交你的更改 (`git commit -m 'Add some feature'`)。
4. 推送到分支 (`git push origin feature/your-feature`)。
5. 创建一个新的 Pull Request。

## 许可证

本项目采用 [MIT 许可证](LICENSE)。