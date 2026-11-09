# A股行情监测站

前端监测面板与基于 AKShare 的轻量行情 API。项目数据接口由 AKShare 调用公开行情源，非交易所直接授权接口；稳定性、限流和使用范围受上游服务约束。

## 文件

- `index.html`：网站前端，生产环境请求 `https://api.fusionveil.com/api/market`
- `server.py`：仅监听本机 127.0.0.1:8765 的行情 API
- `requirements.txt`：Python 依赖
- `nginx-fusionveil.conf`：主站和 API 子域名的 Nginx HTTP 配置
- `fusionveil-api.service`：systemd 服务单元

## 部署概要（Ubuntu 24.04）

将仓库文件放到服务器 `/opt/fusionveil`，建立 Python 虚拟环境并安装依赖：

```sh
sudo mkdir -p /opt/fusionveil
sudo cp index.html server.py requirements.txt /opt/fusionveil/
sudo python3 -m venv /opt/fusionveil/venv
sudo /opt/fusionveil/venv/bin/pip install -r /opt/fusionveil/requirements.txt
sudo chown -R www-data:www-data /opt/fusionveil
sudo cp fusionveil-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now fusionveil-api
```

将 Nginx 配置复制到 `/etc/nginx/sites-available/fusionveil`，启用站点并验证：

```sh
sudo ln -s /etc/nginx/sites-available/fusionveil /etc/nginx/sites-enabled/fusionveil
sudo nginx -t && sudo systemctl reload nginx
```

将 `fusionveil.com`、`www.fusionveil.com` 和 `api.fusionveil.com` 的 DNS A 记录指向 VPS 公网 IP。确认解析生效后，用 Certbot 为三个域名签发并配置 HTTPS。Certbot 通常会更新 Nginx 的 server block；更新后检查 HTTPS API 的 CORS origin 仍为 `https://fusionveil.com`。

## 验证

```sh
curl -fsS http://127.0.0.1:8765/api/market | head
sudo systemctl status fusionveil-api
```

AKShare 全市场行情请求可能较慢，服务端缓存 15 秒，浏览器每 30 秒刷新。首页财报卡片、指标和部分技术信号仍为演示内容；当前 API 只提供行情列表，未接入真实财报、龙虎榜或买卖点计算。部署前应审查数据源许可，并为公网环境添加访问控制、请求限流和监控。
