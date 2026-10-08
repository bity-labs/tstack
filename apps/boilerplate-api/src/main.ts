import { Layer } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import { HttpServerLayer } from "./server.js";

void Layer.launch(HttpServerLayer).pipe(NodeRuntime.runMain);
