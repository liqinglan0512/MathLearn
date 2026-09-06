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

## 0.5 这台服务器是共享的 —— 部署前必读

目标服务器上**已经在跑另一个应用**。2026-09-06 从外部探测确认：

| 端口 | 内容 | nginx |
| --- | --- | --- |
| 80 | 302 跳转到 443 | 1.18.0 (Ubuntu) |
| 443 | **Leo Tree**（Let's Encrypt 证书） | 1.18.0 (Ubuntu) |
| 8090 | MathForge（0.2 构建） | 1.21.5 —— 版本不同，很可能是独立实例或容器 |

因此 **MathForge 必须使用自己的端口，默认 8090，绝不能占用 80 / 443**。

`deploy/deploy.sh` 内建了以下保护：

- 端口写死校验：`MATHFORGE_PORT` 为 80 或 443 时直接拒绝执行；
- 生成的 nginx 配置若含 `listen 80/443` 则中止（正则同时覆盖 `[::]:80` 与 `443 ssl`）；
- 从不使用 `default_server`；
- **从不删除 `sites-enabled/default` 或任何它没创建的站点配置**；
- 部署前探测目标端口：若上面跑的不是 MathForge，直接中止，除非显式设置 `ALLOW_PORT_TAKEOVER=1`；
- `nginx -t` 失败时移除自己的软链并**不 reload**，保证其他站点不受影响；
- 部署前后比对 `sites-enabled/` 清单并报告是否有变化。

> 8090 上的 nginx 是 1.21.5，而系统 nginx 是 1.18.0。这说明 8090 很可能由**另一个 nginx 实例或 Docker 容器**提供服务。如果那个容器占着 8090，系统 nginx 无法绑定该端口，脚本会在 `nginx -t` 处中止而不会破坏现有服务。此时请改用一个空闲端口：
>
> ```bash
> MATHFORGE_PORT=8091 bash deploy.sh
> ```
>
> 或者先停掉旧的 MathForge 容器，再让系统 nginx 接管 8090。

## 1. 一键部署

在服务器上以 root 执行：

```bash
curl -fsSL https://raw.githubusercontent.com/liqinglan0512/MathLearn/main/deploy/deploy.sh -o deploy.sh && bash deploy.sh
```

或者先克隆再跑：

```bash
git clone --depth 1 https://github.com/liqinglan0512/MathLearn.git /opt/mathforge && bash /opt/mathforge/deploy/deploy.sh
```

默认部署到 **8090**。想换端口：

```bash
MATHFORGE_PORT=8091 bash deploy.sh
```

脚本会：探测目标端口占用 → 安装 Node.js 22 与 nginx → 拉取源码 → `npm ci` → `npm run build` → 原子发布到 `/var/www/mathforge` → 写入仅监听 `MATHFORGE_PORT` 的 nginx 配置 → `nginx -t` → reload → 自检首页与深链接 → 比对其他站点未被改动。

脚本是幂等的，再跑一次就是重新部署当前 `main`。构建失败时不会覆盖线上目录。

可用环境变量覆盖默认值：

```bash
BRANCH=main MATHFORGE_PORT=8090 WEB_ROOT=/var/www/mathforge bash deploy.sh
```

## 2. 启用 HTTPS

> **注意**：443 上已经是 Leo Tree。不要直接对 MathForge 站点跑 `certbot --nginx`，否则可能改动到别人的 server block。

正确做法是给 MathForge 分配独立域名（例如 `mathforge.example.com`），DNS 指向本机后，为该域名新建一个 **443 server block**（`server_name` 写具体域名，不要用 `_`），反向代理到本地 `127.0.0.1:8090`，再对该域名签发证书：

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d mathforge.example.com
```

因为两个站点用 `server_name` 区分，Leo Tree 的现有 443 配置不受影响。

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
