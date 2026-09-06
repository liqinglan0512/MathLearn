# MathForge 部署说明

MathForge 是一个纯静态单页应用：`npm run build` 产出 `dist/`，没有后端、没有数据库、没有服务端会话。部署就是把 `dist/` 交给一台 web server。

## 0. 先做这一步：服务器加固

> **这不是可选步骤。**

如果服务器使用过短口令、常见字母+连续数字组合，或任何出现在爆破字典里的弱口令，并且暴露在公网 IP 上，应当假设它**已经在被持续爆破**，甚至可能已被登录过。公网 SSH 每天会收到成千上万次自动化尝试，这类口令通常在字典的前几页。

在部署任何东西之前：

```bash
# 1. 立刻改掉 root 密码，换成长随机密码
passwd root

# 2. 配置密钥登录（在你自己的机器上生成，然后上传公钥）
#    本地执行： ssh-keygen -t ed25519 -C "mathforge-deploy"
#    本地执行： ssh-copy-id root@<你的服务器IP>

# 3. 确认密钥能登录之后，再关闭密码登录
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl restart ssh

# 4. 只开放需要的端口
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 5. 拦截暴力破解
apt-get install -y fail2ban && systemctl enable --now fail2ban
```

阿里云还需要在**安全组**里放行 80 / 443，否则外网访问不到（`ufw` 只管系统防火墙，安全组是另一层）。

另外：**任何贴到聊天记录、issue、工单或截图里的密码都应视为已泄露**，必须更换。

## 1. 一键部署

在服务器上以 root 执行：

```bash
curl -fsSL https://raw.githubusercontent.com/liqinglan0512/MathLearn/main/deploy/deploy.sh -o deploy.sh && bash deploy.sh
```

或者先克隆再跑：

```bash
git clone --depth 1 https://github.com/liqinglan0512/MathLearn.git /opt/mathforge && bash /opt/mathforge/deploy/deploy.sh
```

脚本会：安装 Node.js 22 与 nginx → 拉取源码 → `npm ci` → `npm run build` → 原子发布到 `/var/www/mathforge` → 写入 nginx 配置 → `nginx -t` → reload → 自检首页与深链接。

脚本是幂等的，再跑一次就是重新部署当前 `main`。构建失败时不会覆盖线上目录。

可用环境变量覆盖默认值：

```bash
BRANCH=main WEB_ROOT=/var/www/mathforge bash deploy.sh
```

## 2. 启用 HTTPS

DNS 指向服务器之后：

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

certbot 会自动改写 `/etc/nginx/sites-available/mathforge` 并配置续期。

> 在只有 IP、没有域名时无法签发证书。此时站点只能以 HTTP 提供。MathForge 不收集账号、不提交表单、不发起第三方请求，因此 HTTP 下没有凭据泄露面；但仍建议尽快接域名并启用 TLS。

## 3. 部署后验证

```bash
curl -I http://<域名或IP>/                     # 期望 200
curl -o /dev/null -w '%{http_code}\n' http://<域名或IP>/principles   # 期望 200（SPA fallback）
curl -s http://<域名或IP>/ | grep -o '<title>.*</title>'
```

浏览器中还需确认：

- 首页渲染，无 console error；
- `/principles`、`/viz`、`/problems`、`/tools` 四个主入口可进入；
- `/viz` 的交互实验可以拖动并实时更新；
- 公式（KaTeX）正常渲染；
- 直接访问 `/login` 显示「本地身份原型未启用」，**不出现密码表单**；
- 移动端宽度无横向滚动。

## 4. nginx 配置说明

配置在 [`deploy/nginx-mathforge.conf`](../deploy/nginx-mathforge.conf)，要点：

- `try_files $uri $uri/ /index.html` —— React Router 的深链接必须回落到 index.html，否则刷新 `/principles` 会 404；
- `/assets/` 用 Vite 的内容哈希文件名，`immutable` 缓存一年；
- `index.html` 明确 `no-cache`，否则访客会一直启动引用了已删除 asset 哈希的旧版本；
- CSP 中 `style-src` 保留 `'unsafe-inline'`，这是 KaTeX 生成行内 style 属性所必需的；`script-src` 不含 `unsafe-inline`。

## 5. 数据边界

MathForge 不在服务端保存任何用户数据。学习标记、批注等全部写入访客浏览器的 `localStorage`（键前缀 `mf_`），清空浏览器数据即丢失，不跨设备同步，服务端拿不到。

公开构建中没有账户系统：`localIdentityPrototype` 只在 `import.meta.env.DEV` 下开启，生产构建里 `/login` 与 `/register` 均被 `FeatureRoute` 拦截。
