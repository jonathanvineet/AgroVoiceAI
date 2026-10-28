import { spawn } from 'node:child_process'
const [base, profile] = process.argv.slice(2)
const routes = ['']; const FULL = 1
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=9334', '--user-data-dir=' + profile, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' })
let list
for (let i = 0; i < 60 && !list; i++) { try { list = await (await fetch('http://127.0.0.1:9334/json')).json() } catch { await new Promise(r => setTimeout(r, 500)) } }
const page = list.find(t => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => (ws.onopen = r))
let id = 0, logs = []; const pend = {}
ws.onmessage = e => { const m = JSON.parse(e.data)
  if (m.id && pend[m.id]) { pend[m.id](m.result); delete pend[m.id] }
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0].slice(0, 160))
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('console.error ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' | ').slice(0, 900))
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/insights/.test(m.params.entry.url || '')) logs.push('net ' + m.params.entry.text.slice(0, 80) + ' ' + (m.params.entry.url || '').slice(0, 90))
}
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })) })
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
for (const loc of ['ta', 'en']) for (const r of routes) {
  logs = []
  const url = `${base}/${loc}${r ? '/' + r : ''}`
  await send('Page.navigate', { url })
  await new Promise(res => setTimeout(res, 3500))
  const v = (await send('Runtime.evaluate', { expression: `location.pathname + ' | ' + (document.querySelector('h1,h2')?.innerText || document.title).slice(0,40).replace(/\\n/g,' ')`, returnByValue: true })).result.value
  const uniq = [...new Set(logs)]
  console.log(`${uniq.length ? 'ISSUE' : 'ok   '} ${url.replace(base, '')} -> ${v}${uniq.length ? '\n      ' + uniq.join('\n      ') : ''}`)
}
ws.close(); chrome.kill()
