import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api"

/**
 * The response shape of `GET /health`.
 */
export class Health extends Schema.Class<Health>("Health")({
  status: Schema.Literal("ok")
}) {}

/**
 * The system API group, served at the top level of the router.
 */
export class SystemApi extends HttpApiGroup.make("system", { topLevel: true }).add(
  HttpApiEndpoint.get("health", "/health", {
    success: Health
  })
) {}

/**
 * The root API definition. Kept separate from the server so it can be shared
 * with generated clients later without leaking implementation details.
 */
export class Api extends HttpApi.make("boilerplate-api")
  .add(SystemApi)
  .annotateMerge(OpenApi.annotations({
    title: "Boilerplate API",
    version: "0.0.0"
  }))
{}
