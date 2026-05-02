# Anonymous Message Board

Proyecto full-stack JavaScript para la certificacion Information Security de FreeCodeCamp.

## Ejecutar

```bash
npm install
npm start
```

La aplicacion queda disponible en:

```text
http://localhost:3000/
```

## Probar

```bash
npm test
```

## API

- `POST /api/threads/:board`
- `GET /api/threads/:board`
- `DELETE /api/threads/:board`
- `PUT /api/threads/:board`
- `POST /api/replies/:board`
- `GET /api/replies/:board?thread_id={thread_id}`
- `DELETE /api/replies/:board`
- `PUT /api/replies/:board`
