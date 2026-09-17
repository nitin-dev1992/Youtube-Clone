import request from "supertest"
import { app } from "../src/app.js"

describe("Healthcheck", () => {
    test("GET /api/v1/healthcheck returns 200", async () => {
        const res = await request(app).get("/api/v1/healthcheck")
        expect(res.status).toBe(200)
        expect(res.body).toEqual({ status: "ok" })
    })
})
