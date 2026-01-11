Starting Container
✅ Base de datos ya migrada
✅ Usuario admin ya existe
🚀 Servidor iniciado en puerto 3000
📡 Socket.IO habilitado para tiempo real
🌍 Entorno: production
Query ejecutada {
  text: 'SELECT u.*, e.branch_id, e.branch_ids, e.role as employee_role\n' +
    '         FROM users u\n' +
    '         LEFT JOIN employees e ON u.employee_id = e.id\n' +
    '         WHERE u.id = $1 AND u.active = true',
  duration: 43,
  rows: 1
}
✅ Cliente conectado: 00000000-0000-0000-0000-000000000001 (admin)
Query ejecutada {
  text: 'SELECT id, name, code, active, address, phone, email, created_at FROM branches WHERE active = true ORDER BY name',
  duration: 3,
  rows: 1
}
✅ Master admin suscrito a 1 sucursales: Sucursal Principal
ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false (default). This could indicate a misconfiguration which would prevent express-rate-limit from accurately identifying users. See https://express-rate-limit.github.io/ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/ for more information.
    at Object.xForwardedForHeader (file:///app/node_modules/express-rate-limit/dist/index.mjs:157:13)
    at wrappedValidations.<computed> [as xForwardedForHeader] (file:///app/node_modules/express-rate-limit/dist/index.mjs:369:22)
    at Object.keyGenerator (file:///app/node_modules/express-rate-limit/dist/index.mjs:630:20)
    at file:///app/node_modules/express-rate-limit/dist/index.mjs:682:32
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async file:///app/node_modules/express-rate-limit/dist/index.mjs:663:5 {
  code: 'ERR_ERL_UNEXPECTED_X_FORWARDED_FOR',
  help: 'https://express-rate-limit.github.io/ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/'
}
Query ejecutada {
  text: 'SELECT u.*, e.branch_id, e.branch_ids, e.role as employee_role\n' +
    '       FROM users u\n' +
    '       LEFT JOIN employees e ON u.employee_id = e.id\n' +
    '       WHERE u.id = $1 AND u.active = true',
  duration: 2,
  rows: 1
}
Query ejecutada {
  text: 'SELECT u.*, e.branch_id, e.branch_ids, e.role as employee_role\n' +
    '       FROM users u\n' +
    '       LEFT JOIN employees e ON u.employee_id = e.id\n' +
    '       WHERE u.id = $1 AND u.active = true',
  duration: 2,
  rows: 1
}
Query ejecutada { text: 'SELECT * FROM branches ORDER BY name', duration: 2, rows: 2 }
