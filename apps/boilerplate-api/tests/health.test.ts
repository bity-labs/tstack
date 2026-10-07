import { layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest, OpenApi } from "effect/http-api";
import { assert, it } from "vitest";
import { Api, Health } from "../src/api.js";
import { HealthHandlers } from "../src/server.js";

// The typed in-memory client exercises the same routing, encoding and
// response decoding as the real server, without starting a listener.
const ApiClient = HttpApiTest.groups(Api, ["system"]);

layer(Layer.mergeAll(HealthHandlers, HttpServer.layerServices))("boilerplate-api", (it) => {
  it.effect("GET /health returns {status: ok}", () =>
    Effect.gen(function* () {
      const client = yield* ApiClient;
      const health = yield* client.health();
      assert.deepStrictEqual(health, new Health({ status: "ok" }));
    })
  );
});

it("openapi describes GET /health", () => {
  const spec = OpenApi.fromApi(Api);
  const healthPath = spec.paths["/health"];
  assert.isDefined(healthPath);
  assert.isDefined(healthPath?.get);
  const responses = healthPath?.get?.responses;
  assert.isNotEmpty(responses);
});
