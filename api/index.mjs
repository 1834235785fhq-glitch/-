import app from '../server/index.mjs'

export default function handler(req, res) {
  const routePath = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path ?? '')
  const url = new URL(req.url, 'http://localhost')
  url.pathname = `/api/${routePath}`
  url.searchParams.delete('path')
  req.url = `${url.pathname}${url.search}`
  return app(req, res)
}
