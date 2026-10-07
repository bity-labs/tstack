import { Effect, Layer } from "effect"
import { HttpRouter, HttpServer } from "effect/http"
import { HttpApiBuilder } from "effect/http-api"
import { NodeHttpServer } from "@effect/platform-node"
import { createServer } from "node:http"
import { Api, Health } from "./api.js"

export const defaultPort = 3000

export const portFromEnv = (): number => {
  const raw = process.env["PORT"]
  if (raw === undefined || raw.trim() === "") return defaultPort
  const port = Number.parseInt(raw, 10)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return defaultPort
  return port
}

/**
 * Handlers for the system API group.
 */
export const HealthHandlers = HttpApiBuilder.group(
  Api,
  "system",
  Effect.fn(function*(handlers) {
    return handlers.handleAll({
      health: () => Effect.succeed(new Health({ status: "ok" }))
    })
  })
)

/**
 * The API routes, including the generated OpenAPI description at
 * `/openapi.json`.
 */
export const ApiRoutes = HttpApiBuilder.layer(Api, {
  openapiPath: "/openapi.json"
}).pipe(Layer.provide(HealthHandlers))

/**
 * HTTP server layer serving the API routes. Uses the `PORT` environment
 * variable when set, otherwise `defaultPort`.
 */
export const HttpServerLayer = HttpRouter.serve(ApiRoutes).pipe(
  Layer.provide(
    NodeHttpServer.layer(createServer, {
      port: portFromEnv()
    })
  )
)

