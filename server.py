from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, math, os, threading, time

ROOT = Path(__file__).resolve().parent
cache = {"at": 0, "rows": []}
lock = threading.Lock()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(ROOT), **kwargs)
    def do_GET(self):
        if self.path.startswith('/api/market'):
            with lock:
                if time.time() - cache['at'] > 15:
                    try:
                        import akshare as ak
                        df = ak.stock_zh_a_spot_em()
                        wanted = ['代码','名称','最新价','涨跌幅','成交额','换手率','量比','总市值']
                        cache['rows'] = df[wanted].replace({float('nan'): None}).to_dict('records')
                        cache['at'] = time.time()
                    except Exception as e:
                        self.send_error(502, '行情源暂不可用：' + str(e)); return
                payload = json.dumps({'source':'AKShare / 东方财富公开行情','updated_at':time.strftime('%Y-%m-%d %H:%M:%S'),'rows':cache['rows']}, ensure_ascii=False, allow_nan=False).encode()
            self.send_response(200); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Cache-Control','no-store'); self.send_header('Access-Control-Allow-Origin','https://fusionveil.com'); self.send_header('Vary','Origin'); self.end_headers(); self.wfile.write(payload); return
        return super().do_GET()

if __name__ == '__main__':
    print('Open http://127.0.0.1:8765/ashare-monitor.html')
    ThreadingHTTPServer(('127.0.0.1',8765), Handler).serve_forever()

